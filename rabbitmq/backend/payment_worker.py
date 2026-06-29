"""
Payment Worker - Processes payment for orders
Demonstrates: Work Queue pattern (competing consumers)
"""

import asyncio
import aio_pika
import json
import os
import httpx
import random

RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'guest')
RABBITMQ_PASS = os.getenv('RABBITMQ_PASS', 'guest')

BACKEND_URL = 'http://backend:8000'

async def process_payment(order_data):
    """Simulate payment processing."""
    order_id = order_data['order_id']
    amount = order_data['total_amount']
    
    print(f"[Payment Worker] Processing payment for order {order_id}: ${amount}")
    
    # Simulate processing time (2-5 seconds)
    await asyncio.sleep(random.uniform(2, 5))
    
    # Simulate payment result (90% success rate)
    success = random.random() < 0.9
    
    if success:
        status = 'paid'
        print(f"[Payment Worker] ✓ Payment successful for order {order_id}")
    else:
        status = 'failed'
        print(f"[Payment Worker] ✗ Payment failed for order {order_id}")
    
    # Update order status via backend API
    async with httpx.AsyncClient() as client:
        await client.post(
            f'{BACKEND_URL}/api/orders/{order_id}/status',
            params={'status': status, 'worker': 'payment-worker'}
        )

async def main():
    """Main worker loop."""
    connection = await aio_pika.connect_robust(
        f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/"
    )
    
    async with connection:
        channel = await connection.channel()
        
        # Set prefetch count to process only 1 message at a time
        await channel.set_qos(prefetch_count=1)
        
        queue = await channel.declare_queue('payment_processing', durable=True)
        
        print("[Payment Worker] Waiting for payment messages...")
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    try:
                        order_data = json.loads(message.body.decode())
                        await process_payment(order_data)
                    except Exception as e:
                        print(f"[Payment Worker] Error processing message: {e}")

if __name__ == '__main__':
    asyncio.run(main())
