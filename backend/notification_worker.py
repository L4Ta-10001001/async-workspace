"""
Notification Worker - Sends email/SMS notifications
Demonstrates: Topic exchange pattern (selective routing)
"""

import asyncio
import aio_pika
import json
import os

RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'guest')
RABBITMQ_PASS = os.getenv('RABBITMQ_PASS', 'guest')

async def send_email_notification(routing_key, data):
    """Simulate sending email notification."""
    print(f"[Email Worker] Sending email for event: {routing_key}")
    
    if routing_key == 'order.created':
        print(f"  → Email to {data.get('customer_email', 'N/A')}: Order confirmation")
    elif routing_key == 'order.paid':
        print(f"  → Email to {data.get('customer_email', 'N/A')}: Payment received")
    elif routing_key == 'order.shipped':
        print(f"  → Email to {data.get('customer_email', 'N/A')}: Order shipped")
    
    await asyncio.sleep(0.5)  # Simulate email sending

async def send_sms_notification(routing_key, data):
    """Simulate sending SMS notification."""
    print(f"[SMS Worker] Sending SMS for event: {routing_key}")
    
    if routing_key == 'order.paid':
        print(f"  → SMS: Payment confirmed for order {data.get('order_id')}")
    elif routing_key == 'order.failed':
        print(f"  → SMS: Payment failed for order {data.get('order_id')}")
    
    await asyncio.sleep(0.3)  # Simulate SMS sending

async def email_worker():
    """Email notification worker."""
    connection = await aio_pika.connect_robust(
        f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/"
    )
    
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue('email_notifications', durable=True)
        
        print("[Email Worker] Waiting for email notification messages...")
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    try:
                        data = json.loads(message.body.decode())
                        routing_key = message.routing_key
                        await send_email_notification(routing_key, data)
                    except Exception as e:
                        print(f"[Email Worker] Error: {e}")

async def sms_worker():
    """SMS notification worker."""
    connection = await aio_pika.connect_robust(
        f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/"
    )
    
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue('sms_notifications', durable=True)
        
        print("[SMS Worker] Waiting for SMS notification messages...")
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    try:
                        data = json.loads(message.body.decode())
                        routing_key = message.routing_key
                        await send_sms_notification(routing_key, data)
                    except Exception as e:
                        print(f"[SMS Worker] Error: {e}")

async def main():
    """Run both email and SMS workers concurrently."""
    await asyncio.gather(
        email_worker(),
        sms_worker()
    )

if __name__ == '__main__':
    asyncio.run(main())
