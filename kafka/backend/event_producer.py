"""
Event Producer Service - Simulates external event sources
Continuously produces various types of events to Kafka
"""

import asyncio
from aiokafka import AIOKafkaProducer
import json
import os
import random
from datetime import datetime
import uuid

KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')

# Event templates
EVENT_TYPES = [
    'user.login',
    'user.logout',
    'user.signup',
    'page.view',
    'button.click',
    'api.request',
    'error.occurred',
    'transaction.completed'
]

SOURCES = [
    'web-app',
    'mobile-app',
    'api-gateway',
    'admin-panel',
    'third-party-integration'
]

async def generate_event():
    """Generate a random event."""
    event_type = random.choice(EVENT_TYPES)
    source = random.choice(SOURCES)
    
    payload = {
        'user_id': f'user_{random.randint(1, 1000)}',
        'session_id': str(uuid.uuid4())[:8],
        'ip_address': f'{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}'
    }
    
    # Add type-specific data
    if event_type == 'page.view':
        payload['page'] = random.choice(['/home', '/products', '/about', '/contact', '/profile'])
        payload['referrer'] = random.choice(['google', 'direct', 'facebook', 'twitter'])
    elif event_type == 'button.click':
        payload['button_id'] = random.choice(['buy_now', 'add_to_cart', 'subscribe', 'share'])
    elif event_type == 'api.request':
        payload['endpoint'] = random.choice(['/api/users', '/api/products', '/api/orders'])
        payload['method'] = random.choice(['GET', 'POST', 'PUT'])
        payload['response_time_ms'] = random.randint(50, 500)
    elif event_type == 'error.occurred':
        payload['error_code'] = random.choice([400, 401, 403, 404, 500, 503])
        payload['error_message'] = random.choice([
            'Not found',
            'Unauthorized',
            'Internal server error',
            'Service unavailable'
        ])
    elif event_type == 'transaction.completed':
        payload['amount'] = round(random.uniform(10, 1000), 2)
        payload['currency'] = 'USD'
        payload['payment_method'] = random.choice(['credit_card', 'paypal', 'bank_transfer'])
    
    return {
        'event_id': str(uuid.uuid4()),
        'event_type': event_type,
        'source': source,
        'payload': payload,
        'timestamp': datetime.now().isoformat()
    }

async def main():
    """Main producer loop."""
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        key_serializer=lambda k: k.encode('utf-8')
    )
    
    await producer.start()
    print(f"Event producer started. Publishing to {KAFKA_BOOTSTRAP_SERVERS}")
    
    try:
        while True:
            event = await generate_event()
            
            # Produce to Kafka
            await producer.send_and_wait(
                'events',
                value=event,
                key=event['event_type']
            )
            
            print(f"Produced event: {event['event_type']} from {event['source']}")
            
            # Random delay between events (0.5 - 3 seconds)
            await asyncio.sleep(random.uniform(0.5, 3.0))
            
    except KeyboardInterrupt:
        print("\nStopping event producer...")
    finally:
        await producer.stop()

if __name__ == '__main__':
    asyncio.run(main())
