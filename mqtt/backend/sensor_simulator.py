#!/usr/bin/env python3
"""
Sensor Simulator - Publishes random sensor data to MQTT broker
Simulates multiple IoT sensors (temperature, humidity, pressure)
"""

import paho.mqtt.client as mqtt
import json
import time
import random
import os
from datetime import datetime

MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))

def on_connect(client, userdata, flags, rc):
    print(f"Sensor simulator connected to MQTT broker with result code {rc}")

def generate_sensor_data():
    """Generate realistic sensor readings."""
    return {
        'temperature': {
            'value': round(random.uniform(18.0, 28.0), 2),
            'unit': '°C',
            'sensor_id': f'temp_{random.randint(1, 3)}',
            'location': random.choice(['office', 'server_room', 'warehouse'])
        },
        'humidity': {
            'value': round(random.uniform(30.0, 70.0), 2),
            'unit': '%',
            'sensor_id': f'hum_{random.randint(1, 3)}',
            'location': random.choice(['office', 'server_room', 'warehouse'])
        },
        'pressure': {
            'value': round(random.uniform(1000.0, 1020.0), 2),
            'unit': 'hPa',
            'sensor_id': f'pres_{random.randint(1, 3)}',
            'location': random.choice(['office', 'server_room', 'warehouse'])
        }
    }

def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        
        print(f"Sensor simulator started. Publishing to {MQTT_BROKER}:{MQTT_PORT}")
        
        while True:
            sensor_data = generate_sensor_data()
            
            # Publish each sensor type
            for sensor_type, data in sensor_data.items():
                topic = f"sensors/{sensor_type}"
                payload = json.dumps(data)
                client.publish(topic, payload, qos=1)
                print(f"Published to {topic}: {data}")
            
            # Wait 2 seconds before next batch
            time.sleep(2)
            
    except KeyboardInterrupt:
        print("\nStopping sensor simulator...")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
