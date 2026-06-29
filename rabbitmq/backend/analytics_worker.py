"""
Analytics Worker - Processes all orders for analytics
Demonstrates: Fanout exchange pattern (broadcast to all)
"""

import asyncio
import aio_pika
import json
import os

RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'guest')
RABBITMQ_PASS = os.getenv('RABBITMQ_PASS', 'guest')

async def process_analytics(order_data):
    """Process order for analytics."""
    order_id = order_data['order_id']
    total_amount = order_data['total_amount']
    items_count = len(order_data.get('items', []))
    
    print(f"[Analytics Worker] Processing order {order_id} for analytics")
    print(f"  → Total: ${total_amount}")
    print(f"  → Items: {items_count}")
    print(f"  → Customer: {order_data.get('customer_name', 'N/A')}")
    
    # Simulate analytics processing
    await asyncio.sleep(1)
    
    print(f"[Analytics Worker] ✓ Analytics data recorded for order {order_id}")

async def main():
    """Main analytics worker loop."""
    connection = await aio_pika.connect_robust(
        f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/"
    )
    
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue('analytics_processing', durable=True)
        
        print("[Analytics Worker] Waiting for analytics messages...")
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    try:
                        order_data = json.loads(message.body.decode())
                        await process_analytics(order_data)
                    except Exception as e:
                        print(f"[Analytics Worker] Error: {e}")

if __name__ == '__main__':
    asyncio.run(main())
