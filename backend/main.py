from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import socketio
import aio_pika
import json
import os
from datetime import datetime
from typing import Dict, List
from pydantic import BaseModel
import asyncio

app = FastAPI(title="RabbitMQ PoC - Order Processing Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
sio_app = socketio.ASGIApp(sio, socketio_path='/socket.io')
app.mount('/ws', sio_app)

# RabbitMQ Configuration
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'guest')
RABBITMQ_PASS = os.getenv('RABBITMQ_PASS', 'guest')

# In-memory storage for orders
orders_db: Dict[str, dict] = {}
order_status_updates: List[dict] = []

# Models
class OrderRequest(BaseModel):
    customer_name: str
    customer_email: str
    items: List[dict]
    total_amount: float
    payment_method: str

class OrderResponse(BaseModel):
    order_id: str
    status: str
    message: str

# RabbitMQ connection and channel
rabbitmq_connection = None
rabbitmq_channel = None

async def setup_rabbitmq():
    """Initialize RabbitMQ connection, exchanges, and queues."""
    global rabbitmq_connection, rabbitmq_channel
    
    try:
        # Connect to RabbitMQ
        rabbitmq_connection = await aio_pika.connect_robust(
            f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/"
        )
        rabbitmq_channel = await rabbitmq_connection.channel()
        
        # Declare exchanges
        # Direct exchange for payment processing
        await rabbitmq_channel.declare_exchange(
            'orders_direct',
            aio_pika.ExchangeType.DIRECT,
            durable=True
        )
        
        # Topic exchange for order status notifications
        await rabbitmq_channel.declare_exchange(
            'orders_notifications',
            aio_pika.ExchangeType.TOPIC,
            durable=True
        )
        
        # Fanout exchange for analytics (all workers receive copy)
        await rabbitmq_channel.declare_exchange(
            'orders_analytics',
            aio_pika.ExchangeType.FANOUT,
            durable=True
        )
        
        # Declare queues
        # Payment processing queue (work queue pattern)
        payment_queue = await rabbitmq_channel.declare_queue(
            'payment_processing',
            durable=True
        )
        await payment_queue.bind('orders_direct', routing_key='payment')
        
        # Notification queues (topic pattern)
        email_queue = await rabbitmq_channel.declare_queue(
            'email_notifications',
            durable=True
        )
        await email_queue.bind('orders_notifications', routing_key='order.created')
        await email_queue.bind('orders_notifications', routing_key='order.paid')
        await email_queue.bind('orders_notifications', routing_key='order.shipped')
        
        sms_queue = await rabbitmq_channel.declare_queue(
            'sms_notifications',
            durable=True
        )
        await sms_queue.bind('orders_notifications', routing_key='order.paid')
        await sms_queue.bind('orders_notifications', routing_key='order.failed')
        
        # Analytics queue (fanout - receives all orders)
        analytics_queue = await rabbitmq_channel.declare_queue(
            'analytics_processing',
            durable=True
        )
        await analytics_queue.bind('orders_analytics')
        
        print("RabbitMQ setup complete")
        
    except Exception as e:
        print(f"Error setting up RabbitMQ: {e}")
        raise

@app.on_event("startup")
async def startup_event():
    await setup_rabbitmq()

@app.on_event("shutdown")
async def shutdown_event():
    if rabbitmq_connection:
        await rabbitmq_connection.close()

@sio.event
async def connect(sid, environ):
    print(f"WebSocket client connected: {sid}")
    # Send all orders to newly connected client
    await sio.emit('initial_orders', {'orders': list(orders_db.values())}, room=sid)

@sio.event
async def disconnect(sid):
    print(f"WebSocket client disconnected: {sid}")

@app.post("/api/orders", response_model=OrderResponse)
async def create_order(order: OrderRequest):
    """Create a new order and publish to RabbitMQ."""
    import uuid
    
    order_id = str(uuid.uuid4())
    order_data = {
        'order_id': order_id,
        'customer_name': order.customer_name,
        'customer_email': order.customer_email,
        'items': order.items,
        'total_amount': order.total_amount,
        'payment_method': order.payment_method,
        'status': 'pending',
        'created_at': datetime.now().isoformat()
    }
    
    # Store order
    orders_db[order_id] = order_data
    
    # Publish to exchanges
    message_body = json.dumps(order_data).encode()
    
    # 1. Send to payment processing (direct exchange)
    payment_exchange = await rabbitmq_channel.get_exchange('orders_direct')
    await payment_exchange.publish(
        aio_pika.Message(body=message_body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
        routing_key='payment'
    )
    
    # 2. Send notification: order.created (topic exchange)
    notification_exchange = await rabbitmq_channel.get_exchange('orders_notifications')
    await notification_exchange.publish(
        aio_pika.Message(body=message_body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
        routing_key='order.created'
    )
    
    # 3. Send to analytics (fanout exchange)
    analytics_exchange = await rabbitmq_channel.get_exchange('orders_analytics')
    await analytics_exchange.publish(
        aio_pika.Message(body=message_body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
        routing_key=''  # Fanout ignores routing key
    )
    
    # Notify WebSocket clients
    await sio.emit('order_created', order_data)
    
    return OrderResponse(
        order_id=order_id,
        status='pending',
        message='Order created and queued for processing'
    )

@app.get("/api/orders")
async def get_all_orders():
    """Get all orders."""
    return {'orders': list(orders_db.values())}

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """Get a specific order."""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    return orders_db[order_id]

@app.post("/api/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, worker: str = "unknown"):
    """Update order status (called by workers via internal API)."""
    if order_id not in orders_db:
        raise HTTPException(status_code=404, detail="Order not found")
    
    orders_db[order_id]['status'] = status
    orders_db[order_id]['updated_at'] = datetime.now().isoformat()
    
    # Store status update for history
    status_update = {
        'order_id': order_id,
        'status': status,
        'worker': worker,
        'timestamp': datetime.now().isoformat()
    }
    order_status_updates.append(status_update)
    
    # Publish notification
    if rabbitmq_channel:
        notification_exchange = await rabbitmq_channel.get_exchange('orders_notifications')
        message_body = json.dumps(status_update).encode()
        
        routing_key = f'order.{status}'
        await notification_exchange.publish(
            aio_pika.Message(body=message_body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
            routing_key=routing_key
        )
    
    # Notify WebSocket clients
    await sio.emit('order_updated', status_update)
    
    return {'message': 'Order status updated', 'order': orders_db[order_id]}

@app.get("/api/orders/{order_id}/history")
async def get_order_history(order_id: str):
    """Get status update history for an order."""
    history = [update for update in order_status_updates if update['order_id'] == order_id]
    return {'order_id': order_id, 'history': history}

@app.get("/api/stats")
async def get_stats():
    """Get order processing statistics."""
    total_orders = len(orders_db)
    status_counts = {}
    
    for order in orders_db.values():
        status = order['status']
        status_counts[status] = status_counts.get(status, 0) + 1
    
    return {
        'total_orders': total_orders,
        'status_counts': status_counts,
        'recent_updates': order_status_updates[-10:]
    }
