from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import paho.mqtt.client as mqtt
import json
import os
from datetime import datetime
from collections import deque

app = FastAPI(title="MQTT PoC - IoT Sensor Dashboard")

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

# MQTT Configuration
MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))

# Store recent sensor data (last 100 readings per sensor type)
sensor_data = {
    'temperature': deque(maxlen=100),
    'humidity': deque(maxlen=100),
    'pressure': deque(maxlen=100)
}

# MQTT Callbacks
def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code {rc}")
    # Subscribe to all sensor topics
    client.subscribe("sensors/temperature")
    client.subscribe("sensors/humidity")
    client.subscribe("sensors/pressure")

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode())
        
        # Extract sensor type from topic (e.g., "sensors/temperature" -> "temperature")
        sensor_type = topic.split('/')[-1]
        
        # Add timestamp if not present
        if 'timestamp' not in payload:
            payload['timestamp'] = datetime.now().isoformat()
        
        # Store in memory
        if sensor_type in sensor_data:
            sensor_data[sensor_type].append(payload)
        
        # Broadcast to all connected WebSocket clients
        sio.emit('sensor_update', {
            'sensor_type': sensor_type,
            'data': payload
        })
        
        print(f"Received {sensor_type}: {payload}")
        
    except Exception as e:
        print(f"Error processing MQTT message: {e}")

# Initialize MQTT client
mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

@app.on_event("startup")
async def startup_event():
    # Connect to MQTT broker in a separate thread
    import threading
    
    def mqtt_thread():
        try:
            mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            mqtt_client.loop_forever()
        except Exception as e:
            print(f"MQTT connection error: {e}")
    
    thread = threading.Thread(target=mqtt_thread, daemon=True)
    thread.start()

@app.on_event("shutdown")
async def shutdown_event():
    mqtt_client.disconnect()

@sio.event
async def connect(sid, environ):
    print(f"WebSocket client connected: {sid}")
    # Send current sensor data to newly connected client
    latest_data = {}
    for sensor_type, readings in sensor_data.items():
        if readings:
            latest_data[sensor_type] = list(readings)[-20:]  # Last 20 readings
        else:
            latest_data[sensor_type] = []
    
    await sio.emit('initial_data', latest_data, room=sid)

@sio.event
async def disconnect(sid):
    print(f"WebSocket client disconnected: {sid}")

@app.get("/")
def read_root():
    return {"message": "MQTT PoC API", "status": "running"}

@app.get("/api/sensors/latest")
async def get_latest_sensor_data():
    """Get the latest reading from each sensor."""
    latest = {}
    for sensor_type, readings in sensor_data.items():
        if readings:
            latest[sensor_type] = readings[-1]
        else:
            latest[sensor_type] = None
    return latest

@app.get("/api/sensors/{sensor_type}")
async def get_sensor_history(sensor_type: str, limit: int = 50):
    """Get historical readings for a specific sensor type."""
    if sensor_type not in sensor_data:
        return {"error": f"Unknown sensor type: {sensor_type}"}
    
    readings = list(sensor_data[sensor_type])
    return {
        "sensor_type": sensor_type,
        "readings": readings[-limit:]
    }

@app.get("/api/sensors/all")
async def get_all_sensor_data():
    """Get all sensor data."""
    return {
        sensor_type: list(readings)
        for sensor_type, readings in sensor_data.items()
    }
