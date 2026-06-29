from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import socketio
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel
import asyncio

app = FastAPI(title="Kafka PoC - Event Streaming Platform")

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

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')

# In-memory storage for events and analytics
events_store: List[dict] = []
analytics_data: Dict[str, dict] = {
    'total_events': 0,
    'events_by_type': {},
    'events_by_source': {},
    'hourly_counts': {}
}

# Models
class Event(BaseModel):
    event_type: str
    source: str
    payload: dict
    timestamp: Optional[str] = None
    event_id: Optional[str] = None

class EventResponse(BaseModel):
    event_id: str
    status: str
    message: str

# Kafka producer and consumer
kafka_producer = None
kafka_consumer = None

@app.on_event("startup")
async def startup_event():
    global kafka_producer, kafka_consumer
    
    # Initialize Kafka producer
    kafka_producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        key_serializer=lambda k: k.encode('utf-8') if k else None
    )
    await kafka_producer.start()
    
    # Initialize Kafka consumer for analytics
    kafka_consumer = AIOKafkaConsumer(
        'events',
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='analytics-consumer-group'
    )
    await kafka_consumer.start()
    
    # Start background task to consume events
    asyncio.create_task(consume_events())
    
    print("Kafka producer and consumer started")

@app.on_event("shutdown")
async def shutdown_event():
    if kafka_producer:
        await kafka_producer.stop()
    if kafka_consumer:
        await kafka_consumer.stop()

async def consume_events():
    """Background task to consume events from Kafka."""
    async for msg in kafka_consumer:
        try:
            event_data = msg.value
            
            # Store event
            events_store.append({
                'event_id': event_data.get('event_id'),
                'event_type': event_data.get('event_type'),
                'source': event_data.get('source'),
                'payload': event_data.get('payload'),
                'timestamp': event_data.get('timestamp'),
                'partition': msg.partition,
                'offset': msg.offset
            })
            
            # Update analytics
            analytics_data['total_events'] += 1
            
            event_type = event_data.get('event_type', 'unknown')
            analytics_data['events_by_type'][event_type] = \
                analytics_data['events_by_type'].get(event_type, 0) + 1
            
            source = event_data.get('source', 'unknown')
            analytics_data['events_by_source'][source] = \
                analytics_data['events_by_source'].get(source, 0) + 1
            
            # Hourly counts
            hour = datetime.now().strftime('%Y-%m-%d %H:00')
            analytics_data['hourly_counts'][hour] = \
                analytics_data['hourly_counts'].get(hour, 0) + 1
            
            # Broadcast to WebSocket clients
            await sio.emit('new_event', {
                'event': event_data,
                'partition': msg.partition,
                'offset': msg.offset
            })
            
        except Exception as e:
            print(f"Error processing event: {e}")

@sio.event
async def connect(sid, environ):
    print(f"WebSocket client connected: {sid}")
    # Send recent events to newly connected client
    recent_events = events_store[-50:]  # Last 50 events
    await sio.emit('recent_events', {'events': recent_events}, room=sid)

@sio.event
async def disconnect(sid):
    print(f"WebSocket client disconnected: {sid}")

@app.post("/api/events", response_model=EventResponse)
async def produce_event(event: Event):
    """Produce an event to Kafka."""
    import uuid
    
    event_id = str(uuid.uuid4())
    event_data = {
        'event_id': event_id,
        'event_type': event.event_type,
        'source': event.source,
        'payload': event.payload,
        'timestamp': event.timestamp or datetime.now().isoformat()
    }
    
    # Produce to Kafka topic 'events' with event_type as key (for partitioning)
    await kafka_producer.send_and_wait(
        'events',
        value=event_data,
        key=event.event_type
    )
    
    return EventResponse(
        event_id=event_id,
        status='produced',
        message='Event produced to Kafka topic'
    )

@app.get("/api/events")
async def get_events(limit: int = 100, offset: int = 0):
    """Get events from in-memory store."""
    return {
        'events': events_store[-limit:][offset:offset+limit],
        'total': len(events_store)
    }

@app.get("/api/events/replay")
async def replay_events(topic: str = 'events', from_offset: int = 0, limit: int = 100):
    """Replay events from Kafka topic starting from specific offset."""
    replay_consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='earliest',
        enable_auto_commit=False,
        group_id=f'replay-{datetime.now().timestamp()}'
    )
    
    await replay_consumer.start()
    
    try:
        # Seek to specific offset
        partitions = replay_consumer.partitions_for_topic(topic)
        if partitions:
            from aiokafka import TopicPartition
            for partition_id in partitions:
                tp = TopicPartition(topic, partition_id)
                await replay_consumer.seek(tp, from_offset)
        
        # Collect events
        events = []
        timeout = 5.0  # 5 second timeout
        start_time = asyncio.get_event_loop().time()
        
        while len(events) < limit:
            if asyncio.get_event_loop().time() - start_time > timeout:
                break
            
            try:
                msg = await asyncio.wait_for(
                    replay_consumer.getone(),
                    timeout=1.0
                )
                events.append({
                    'event': msg.value,
                    'partition': msg.partition,
                    'offset': msg.offset,
                    'timestamp': msg.timestamp
                })
            except asyncio.TimeoutError:
                break
        
        return {
            'events': events,
            'topic': topic,
            'from_offset': from_offset,
            'count': len(events)
        }
    finally:
        await replay_consumer.stop()

@app.get("/api/analytics")
async def get_analytics():
    """Get analytics data."""
    return {
        'total_events': analytics_data['total_events'],
        'events_by_type': analytics_data['events_by_type'],
        'events_by_source': analytics_data['events_by_source'],
        'hourly_counts': analytics_data['hourly_counts'],
        'unique_event_types': len(analytics_data['events_by_type']),
        'unique_sources': len(analytics_data['events_by_source'])
    }

@app.get("/api/topics")
async def list_topics():
    """List all Kafka topics."""
    consumer = AIOKafkaConsumer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS
    )
    await consumer.start()
    
    try:
        topics = await consumer.topics()
        return {'topics': list(topics)}
    finally:
        await consumer.stop()

@app.post("/api/topics/{topic_name}/reset")
async def reset_topic_offset(topic_name: str):
    """Reset consumer group offset to beginning (for replay)."""
    # This is a simplified version - in production you'd use admin client
    return {
        'message': f'Offset reset for topic {topic_name}',
        'note': 'In production, use Kafka Admin Client or CLI tools'
    }
