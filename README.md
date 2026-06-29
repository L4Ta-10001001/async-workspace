# MQTT - Proof of Concept

## 1. Definición

**MQTT** (Message Queuing Telemetry Transport) es un protocolo de mensajería ligero basado en el patrón publish/subscribe, diseñado específicamente para comunicación máquina a máquina (M2M) y dispositivos con recursos limitados. Originalmente desarrollado por IBM en 1999 para monitoreo de oleoductos, se ha convertido en el estándar de facto para aplicaciones IoT (Internet of Things).

### Características Fundamentales

- **Protocolo Ligero**: Overhead mínimo (2 bytes en el header más pequeño), ideal para dispositivos con ancho de banda limitado
- **Patrón Publish/Subscribe**: Desacopla productores (publishers) de consumidores (subscribers) mediante un broker central
- **Calidad de Servicio (QoS)**: Tres niveles para garantizar entrega según necesidad (0, 1, 2)
- **Conexiones Persistentes**: Mantiene conexiones TCP de larga duración con keep-alive
- **Topics Jerárquicos**: Sistema de topics con wildcards para organización flexible de mensajes
- **Retained Messages**: El broker almacena el último mensaje de un topic para nuevos subscribers

### Arquitectura de Funcionamiento

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Publisher  │ ──────▶ │    Broker    │ ◀────── │  Subscriber │
│  (Sensor)   │ publish │  (Mosquitto) │  sub    │  (Dashboard)│
└─────────────┘  topic  └──────────────┘  topic  └─────────────┘
                        │              │
                        │   Routing    │
                        │   & Store    │
                        └──────────────┘
```

1. **Conexión**: Publishers y subscribers se conectan al broker MQTT
2. **Suscripción**: Subscribers indican qué topics les interesan
3. **Publicación**: Publishers envían mensajes a topics específicos
4. **Routing**: El broker enruta mensajes a todos los subscribers del topic
5. **Entrega**: Subscribers reciben mensajes según su QoS configurado

### Niveles de Calidad de Servicio (QoS)

| QoS | Nombre | Descripción | Caso de Uso |
|-----|--------|-------------|-------------|
| **0** | At most once | Fire and forget, sin confirmación | Sensores de temperatura (pérdida ocasional aceptable) |
| **1** | At least once | Confirmación de recepción, posibles duplicados | Comandos de control (crítico recibir al menos una vez) |
| **2** | Exactly once | Garantía de entrega única, handshake de 4 pasos | Transacciones financieras (no puede haber duplicados) |

### Topics y Wildcards

Los topics MQTT son strings jerárquicos separados por `/`:

```
sensors/temperature/office
sensors/temperature/warehouse
sensors/humidity/office
```

**Wildcards**:
- `+` (single-level): Coincide con un solo nivel
  - `sensors/+/office` → coincide con `sensors/temperature/office` y `sensors/humidity/office`
- `#` (multi-level): Coincide con cero o más niveles (solo al final)
  - `sensors/#` → coincide con todos los topics bajo `sensors/`

### Comparación con Otros Protocolos

| Característica | MQTT | HTTP | WebSockets | AMQP |
|----------------|------|------|------------|------|
| **Overhead** | Muy bajo (2 bytes) | Alto (headers) | Medio | Medio |
| **Patrón** | Pub/Sub | Request/Response | Bidireccional | Pub/Sub + Queues |
| **QoS** | 3 niveles | Ninguno | Ninguno | Múltiples niveles |
| **Broker** | Requerido | No | No | Requerido |
| **Dispositivos** | IoT, embebidos | Web, APIs | Web, apps | Enterprise |
| **Batería** | Optimizado | No | No | No |

## 2. Casos de Uso

### Caso 1: Monitoreo de Infraestructura IoT en Data Centers

**Contexto**: Un data center necesita monitorear en tiempo real miles de sensores distribuidos (temperatura, humedad, consumo eléctrico, vibración) para prevenir fallas y optimizar eficiencia energética.

**Implementación**:
- Miles de sensores IoT publican datos cada segundo vía MQTT
- Topics organizados jerárquicamente: `datacenter/rack-{id}/sensor-{type}`
- Broker MQTT (Mosquitto/EMQX) maneja millones de mensajes por segundo
- Backend se suscribe a topics relevantes y procesa datos
- Sistema de alertas detecta anomalías (temperatura > umbral) y emite notificaciones
- Dashboard muestra métricas en tiempo real con gráficos históricos

**Beneficio**: Protocolo ligero consume mínimo ancho de banda, permite escalar a miles de dispositivos, y QoS 1 garantiza que alertas críticas nunca se pierdan.

### Caso 2: Flota de Vehículos Conectados y Telemetría

**Contexto**: Una empresa de logística necesita rastrear en tiempo real la ubicación, velocidad, consumo de combustible y estado del motor de cientos de vehículos en movimiento.

**Implementación**:
- Dispositivos GPS/OBD-II en vehículos publican telemetría cada 5 segundos
- Topics: `fleet/vehicle-{id}/location`, `fleet/vehicle-{id}/engine`, `fleet/vehicle-{id}/fuel`
- Broker MQTT en la nube recibe datos de toda la flota
- Backend procesa ubicación para mostrar en mapa en tiempo real
- Algoritmos detectan comportamiento anómalo (frenado brusco, exceso de velocidad)
- Sistema envía comandos a vehículos vía MQTT (publicar en topic del vehículo)

**Beneficio**: MQTT funciona bien en redes móviles con conectividad intermitente, consume poca batería en dispositivos embebidos, y permite comunicación bidireccional (monitoreo + comandos).

### Caso 3: Sistemas de Domótica y Edificios Inteligentes

**Contexto**: Un edificio inteligente necesita controlar y automatizar iluminación, climatización, seguridad y persianas basándose en sensores de presencia, luz ambiental y horarios programados.

**Implementación**:
- Sensores de presencia publican: `building/floor-{n}/room-{id}/presence`
- Sensores de luz publican: `building/floor-{n}/room-{id}/light`
- Sistema de control se suscribe a todos los topics y toma decisiones
- Publica comandos: `building/floor-{n}/room-{id}/lights/set` (on/off/dim)
- Actuadores (luces, HVAC) se suscriben a sus topics de control
- Interfaz web permite control manual y visualización de estado

**Beneficio**: Arquitectura desacoplada permite añadir nuevos sensores/actuadores sin modificar sistema existente, y MQTT funciona en redes locales sin internet.

### Caso 4: Monitoreo de Salud y Dispositivos Médicos Wearables

**Contexto**: Un sistema de telemedicina necesita monitorear signos vitales de pacientes (ritmo cardíaco, presión arterial, oxigenación) en tiempo real y alertar a médicos ante anomalías.

**Implementación**:
- Wearables médicos publican datos cada segundo: `patient/{id}/heartrate`, `patient/{id}/spo2`
- Broker MQTT con autenticación TLS para proteger datos sensibles
- Backend se suscribe y procesa datos con algoritmos de detección de anomalías
- Si se detecta emergencia (ej: paro cardíaco), publica alerta: `alerts/patient/{id}/critical`
- Dashboard médico recibe alertas en tiempo real y muestra historial de signos vitales
- Sistema puede enviar comandos a wearables (ajustar frecuencia de muestreo)

**Beneficio**: MQTT consume poca batería en wearables, permite monitoreo continuo sin saturar red, y QoS 2 garantiza que alertas críticas se entreguen exactamente una vez.

### Caso 5: Sistemas de Riego Inteligente en Agricultura de Precisión

**Contexto**: Una granja necesita optimizar uso de agua mediante riego automatizado basado en humedad del suelo, pronóstico del tiempo y tipo de cultivo en diferentes zonas.

**Implementación**:
- Sensores de humedad en suelo publican: `farm/zone-{id}/soil/moisture`
- Estación meteorológica publica: `farm/weather/forecast`, `farm/weather/rain`
- Backend se suscribe y ejecuta algoritmo de decisión de riego
- Publica comandos: `farm/zone-{id}/irrigation/valve` (open/close/duration)
- Actuadores (válvulas de riego) se suscriben y ejecutan comandos
- Dashboard muestra humedad por zona, agua consumida, y programación de riego

**Beneficio**: MQTT funciona en redes de baja potencia (LoRaWAN, NB-IoT) típicas en zonas rurales, permite escalar a miles de sensores, y opera con baterías solares durante meses.

## 3. Análisis Arquitectónico

### MQTT en el Espectro de Comunicación Asíncrona

MQTT ocupa una posición única en el espectro de tecnologías de mensajería, optimizado para escenarios específicos donde otras tecnologías no son ideales:

#### MQTT vs Webhooks

| Aspecto | MQTT | Webhooks |
|---------|------|----------|
| **Dirección** | Bidireccional (pub/sub) | Unidireccional (push) |
| **Arquitectura** | Broker central | Point-to-point |
| **Overhead** | Muy bajo (2 bytes) | Alto (HTTP headers) |
| **Conectividad** | Funciona detrás de NAT/firewall | Requiere IP pública |
| **QoS** | 3 niveles garantizados | Best-effort (HTTP retries) |
| **Dispositivos** | IoT, embebidos | Servidores web |
| **Batería** | Optimizado para baja potencia | No optimizado |

**Análisis**: MQTT es superior para IoT y dispositivos con recursos limitados, redes inestables, o cuando se requiere comunicación bidireccional eficiente. Webhooks son más simples para notificaciones unidireccionales entre servicios backend con infraestructura web estándar.

#### MQTT vs WebSockets

| Aspecto | MQTT | WebSockets |
|---------|------|------------|
| **Protocolo** | MQTT (binario ligero) | WebSocket (basado en HTTP) |
| **Arquitectura** | Pub/Sub con broker | Cliente-servidor directo |
| **Escalabilidad** | Alta (broker distribuido) | Media (conexiones persistentes) |
| **Reconexión** | Automática con session persistence | Manual (requiere implementación) |
| **QoS** | 3 niveles | Ninguno (confiable por TCP) |
| **Navegadores** | Requiere bridge MQTT-over-WebSocket | Nativo |
| **Caso ideal** | IoT, dispositivos limitados | Apps web interactivas |

**Análisis**: WebSockets son ideales para aplicaciones web interactivas donde el cliente es un navegador con recursos suficientes. MQTT es superior para IoT, dispositivos embebidos, y cuando se requiere el patrón publish/subscribe con garantías de entrega y manejo de desconexiones.

#### MQTT vs RabbitMQ

| Aspecto | MQTT | RabbitMQ |
|---------|------|----------|
| **Protocolo** | MQTT (ligero) | AMQP (enterprise) |
| **Complejidad** | Baja | Alta (exchanges, bindings, queues) |
| **Routing** | Simple (topics con wildcards) | Avanzado (exchanges, routing keys) |
| **Persistencia** | Limitada (retained messages) | Completa (persistent queues) |
| **Patrones** | Pub/Sub puro | Work queues, pub/sub, routing, RPC |
| **Dispositivos** | IoT, embebidos | Microservicios backend |
| **Overhead** | Muy bajo | Medio |

**Análisis**: MQTT es más simple y ligero, ideal para IoT y dispositivos con recursos limitados. RabbitMQ es más potente y flexible, diseñado para comunicación entre microservicios con patrones complejos de routing, colas de trabajo, y garantías de entrega avanzadas. Son complementarios: una arquitectura puede usar MQTT para dispositivos IoT y RabbitMQ para comunicación entre servicios backend.

#### MQTT vs Apache Kafka

| Aspecto | MQTT | Apache Kafka |
|---------|------|--------------|
| **Propósito** | Mensajería IoT | Event streaming |
| **Persistencia** | Corto plazo (retained messages) | Largo plazo (log distribuido) |
| **Retención** | Último mensaje por topic | Días/semanas (configurable) |
| **Replay** | No (solo último mensaje) | Sí (desde cualquier offset) |
| **Throughput** | Alto (millones/seg) | Muy alto (millones/seg por partición) |
| **Escalabilidad** | Broker clustering | Particionado masivo |
| **Caso ideal** | IoT, tiempo real | Event sourcing, analytics |

**Análisis**: MQTT es ideal para comunicación en tiempo real con dispositivos IoT donde solo importa el estado actual. Kafka es una plataforma de event streaming que persiste todos los eventos y permite reprocesamiento histórico, ideal para arquitecturas event-driven complejas y analytics. Son complementarios: MQTT puede ingestar datos de IoT que luego Kafka procesa y almacena para análisis.

### Posición en la Arquitectura de Sistemas IoT

```
┌─────────────────────────────────────────────────────────────┐
│                    DISPOSITIVOS IoT                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Sensores │  │ Actuador │  │ Wearable │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │ MQTT        │ MQTT        │ MQTT
┌───────▼─────────────▼─────────────▼─────────────────────────┐
│                    BROKER MQTT (Mosquitto)                    │
│              Publish/Subscribe + QoS + Retained              │
└───────┬─────────────────────────────┬───────────────────────┘
        │                             │
        │ MQTT (backend sub)          │ MQTT-over-WebSocket
        │                             │
┌───────▼───────────────────┐  ┌──────▼────────────────────────┐
│   BACKEND (Procesamiento) │  │   FRONTEND (Dashboard Web)    │
│   - Análisis en tiempo    │  │   - Visualización tiempo real │
│     real                  │  │   - Control manual            │
│   - Detección anomalías   │  │   - Gráficos históricos       │
│   - Integración con       │  │                               │
│     Kafka/RabbitMQ        │  │                               │
└───────────────────────────┘  └───────────────────────────────┘
```

**MQTT** opera en la capa de comunicación dispositivo-broker, mientras que RabbitMQ/Kafka operan en la capa de procesamiento backend.

### Ventajas de MQTT

1. **Eficiencia**: Overhead mínimo, ideal para dispositivos con recursos limitados
2. **Escalabilidad**: Broker puede manejar millones de dispositivos conectados
3. **Confiabilidad**: QoS garantiza entrega según criticidad del mensaje
4. **Flexibilidad**: Topics jerárquicos permiten organización lógica de datos
5. **Conectividad**: Funciona en redes inestables con reconexión automática
6. **Batería**: Protocolo diseñado para consumo mínimo de energía

### Limitaciones de MQTT

1. **Broker requerido**: Necesita infraestructura central (broker)
2. **Seguridad**: Requiere TLS para encriptación (no incluida por defecto)
3. **Navegadores**: No soportado nativamente en navegadores (requiere bridge WebSocket)
4. **Complejidad empresarial**: Menos patrones avanzados que RabbitMQ/Kafka
5. **Persistencia limitada**: Solo retiene último mensaje por topic

### Cuándo Usar MQTT

**Casos ideales**:
- Dispositivos IoT con recursos limitados (batería, CPU, memoria)
- Redes inestables o de baja potencia (móvil, LoRaWAN, NB-IoT)
- Comunicación bidireccional con miles/millones de dispositivos
- Escenarios donde solo importa el estado actual (no histórico)
- Aplicaciones que requieren QoS para garantizar entrega

**Casos donde NO usar MQTT**:
- Comunicación entre microservicios backend (usar RabbitMQ/Kafka)
- Aplicaciones web interactivas sin dispositivos IoT (usar WebSockets)
- Sistemas que requieren reprocesamiento histórico (usar Kafka)
- Notificaciones unidireccionales simples entre servicios (usar Webhooks)

## 4. Implementación PoC

### Arquitectura de la Solución

Esta PoC implementa un **Dashboard de Monitoreo de Sensores IoT en Tiempo Real** con los siguientes componentes:

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Sensor     │  MQTT   │   Mosquitto  │  MQTT   │   Backend    │
│  Simulator   │ ──────▶ │    Broker    │ ◀────── │   (FastAPI)  │
│  (Python)    │ publish │  (Docker)    │  sub    │              │
└──────────────┘         └──────────────┘         └──────┬───────┘
                                                         │
                                              WebSocket (Socket.IO)
                                                         │
                                               ┌─────────▼────────┐
                                               │    Frontend      │
                                               │    (React +      │
                                               │  TanStack Query) │
                                               └──────────────────┘
```

### Componentes del Backend (Python/FastAPI + paho-mqtt + Socket.IO)

**Archivo**: `backend/main.py`

**Integración MQTT + WebSocket**:

El backend actúa como puente entre MQTT y WebSocket:
1. Se suscribe a topics MQTT de sensores
2. Recibe datos de sensores vía MQTT
3. Procesa y almacena datos en memoria
4. Emite eventos Socket.IO a clientes web conectados

**Eventos Socket.IO Implementados**:

1. **`connect`**
   - Cliente WebSocket se conecta al backend
   - Backend envía datos históricos almacenados vía evento `initial_data`
   - Cliente recibe estado actual de todos los sensores

2. **`initial_data`**
   - Enviado automáticamente cuando un cliente se conecta
   - Contiene últimas 20 lecturas de cada tipo de sensor
   - Permite al cliente mostrar historial inmediatamente

3. **`sensor_update`**
   - Emitido cada vez que llega un mensaje MQTT de un sensor
   - Contiene tipo de sensor y datos de la lectura
   - Todos los clientes WebSocket reciben actualización en tiempo real

**Callback MQTT `on_message`**:

```python
def on_message(client, userdata, msg):
    topic = msg.topic
    payload = json.loads(msg.payload.decode())
    
    # Extraer tipo de sensor del topic
    sensor_type = topic.split('/')[-1]  # "sensors/temperature" -> "temperature"
    
    # Agregar timestamp si no existe
    if 'timestamp' not in payload:
        payload['timestamp'] = datetime.now().isoformat()
    
    # Almacenar en memoria (deque con maxlen=100)
    sensor_data[sensor_type].append(payload)
    
    # Broadcast a todos los clientes WebSocket
    sio.emit('sensor_update', {
        'sensor_type': sensor_type,
        'data': payload
    })
```

**Endpoints REST API**:

1. **GET /api/sensors/latest**
   - Retorna última lectura de cada tipo de sensor
   - Usado por frontend para mostrar valores actuales en gauges

2. **GET /api/sensors/{sensor_type}**
   - Retorna historial de lecturas para un tipo de sensor
   - Parámetro `limit` controla cantidad de lecturas (default: 50)
   - Usado por frontend para gráficos y tablas de historial

3. **GET /api/sensors/all**
   - Retorna todos los datos de sensores almacenados
   - Endpoint de debugging/administración

**Almacenamiento en Memoria**:

```python
from collections import deque

sensor_data = {
    'temperature': deque(maxlen=100),  # Últimas 100 lecturas
    'humidity': deque(maxlen=100),
    'pressure': deque(maxlen=100)
}
```

**Características Técnicas**:
- **Threading**: Cliente MQTT corre en thread separado para no bloquear FastAPI
- **AsyncServer**: Socket.IO en modo asíncrono para integración con FastAPI
- **Deque**: Estructura de datos eficiente para storing últimas N lecturas
- **JSON parsing**: Mensajes MQTT se parsean automáticamente a dict Python

### Sensor Simulator

**Archivo**: `backend/sensor_simulator.py`

Simulador que publica datos de sensores ficticios cada 2 segundos:

**Topics MQTT**:
- `sensors/temperature`: Temperatura ambiente (18-28°C)
- `sensors/humidity`: Humedad relativa (30-70%)
- `sensors/pressure`: Presión atmosférica (1000-1020 hPa)

**Estructura de Mensaje**:

```json
{
  "value": 23.45,
  "unit": "°C",
  "sensor_id": "temp_1",
  "location": "office"
}
```

**Características**:
- Genera valores aleatorios dentro de rangos realistas
- Simula múltiples sensores por tipo (temp_1, temp_2, temp_3)
- Asigna ubicaciones aleatorias (office, server_room, warehouse)
- QoS 1 para garantizar entrega
- Loop continuo con pausa de 2 segundos

### Componentes del Frontend (React + Socket.IO Client + TanStack Query)

**Arquitectura de Componentes**:

```
App.jsx
├── SensorGauges.jsx      # Gauges con valores actuales
├── SensorChart.jsx       # Gráfico de líneas con historial
└── SensorHistory.jsx     # Tabla con lecturas recientes
```

**Integración con TanStack Query**:

TanStack Query gestiona datos de sensores y se sincroniza con eventos Socket.IO:

**Queries HTTP (Fallback)**:

```javascript
// Última lectura de cada sensor (polling cada 5 segundos)
const { data: latestData } = useQuery({
  queryKey: ['sensors', 'latest'],
  queryFn: async () => {
    const response = await fetch('/api/sensors/latest')
    return response.json()
  },
  refetchInterval: 5000
})

// Historial del sensor seleccionado
const { data: historyData } = useQuery({
  queryKey: ['sensors', selectedSensor, 'history'],
  queryFn: async () => {
    const response = await fetch(`/api/sensors/${selectedSensor}?limit=50`)
    return response.json()
  },
  enabled: !!selectedSensor
})
```

**Sincronización WebSocket → TanStack Query**:

```javascript
useEffect(() => {
  // Recibir datos iniciales al conectar
  socket.on('initial_data', (data) => {
    Object.entries(data).forEach(([sensorType, readings]) => {
      if (readings.length > 0) {
        queryClient.setQueryData(['sensors', sensorType, 'history'], {
          sensor_type: sensorType,
          readings: readings
        })
      }
    })
  })

  // Recibir actualizaciones en tiempo real
  socket.on('sensor_update', (data) => {
    const { sensor_type, data: sensorData } = data
    
    // Actualizar última lectura
    queryClient.setQueryData(['sensors', 'latest'], (old) => {
      return { ...old, [sensor_type]: sensorData }
    })

    // Actualizar historial
    queryClient.setQueryData(['sensors', sensor_type, 'history'], (old) => {
      if (!old) return { sensor_type, readings: [sensorData] }
      
      const newReadings = [...old.readings, sensorData]
      return {
        sensor_type,
        readings: newReadings.slice(-100)  // Mantener solo últimas 100
      }
    })
  })
}, [queryClient])
```

**Patrón de Integración**:
1. **Carga inicial**: Queries HTTP cargan datos históricos vía REST API
2. **Polling fallback**: Queries se refrescan cada 5 segundos como backup
3. **Actualizaciones push**: Socket.IO emite eventos cuando llegan datos MQTT
4. **Sincronización**: Event handlers actualizan caché de TanStack Query usando `setQueryData`
5. **Re-renderizado**: React re-renderiza componentes automáticamente cuando cambia la caché

**Componente SensorGauges**:
- Muestra 3 tarjetas con valores actuales (temperatura, humedad, presión)
- Cada tarjeta muestra: valor, unidad, ID del sensor, ubicación
- Actualización en tiempo real vía TanStack Query
- Diseño responsivo con grid CSS

**Componente SensorChart**:
- Gráfico de líneas usando Recharts
- Muestra evolución temporal del sensor seleccionado
- Eje X: timestamps, Eje Y: valores del sensor
- Línea de color según tipo de sensor (rojo=temperatura, turquesa=humedad, verde=presión)
- Tooltip interactivo al pasar el mouse
- ResponsiveContainer para adaptarse al tamaño del contenedor

**Componente SensorHistory**:
- Tabla con últimas 20 lecturas en orden cronológico inverso
- Columnas: Timestamp, Value, Sensor ID, Location
- Selector de tipo de sensor (botones)
- Actualización automática cuando llegan nuevos datos

### Flujo de Datos Completo

**Escenario: Sensor Publica Nueva Lectura**

1. **Sensor Simulator publica mensaje MQTT**:
   ```python
   # sensor_simulator.py
   payload = {
       "value": 23.45,
       "unit": "°C",
       "sensor_id": "temp_1",
       "location": "office"
   }
   client.publish("sensors/temperature", json.dumps(payload), qos=1)
   ```

2. **Broker Mosquitto recibe y enruta**:
   - Almacena mensaje temporalmente
   - Busca subscribers del topic `sensors/temperature`
   - Envía mensaje a backend suscrito

3. **Backend recibe mensaje MQTT**:
   ```python
   # main.py - on_message callback
   def on_message(client, userdata, msg):
       sensor_type = "temperature"
       payload = {"value": 23.45, "unit": "°C", ...}
       
       # Almacenar en memoria
       sensor_data['temperature'].append(payload)
       
       # Emitir a clientes WebSocket
       sio.emit('sensor_update', {
           'sensor_type': 'temperature',
           'data': payload
       })
   ```

4. **Frontend recibe evento Socket.IO**:
   ```javascript
   // App.jsx
   socket.on('sensor_update', (data) => {
       queryClient.setQueryData(['sensors', 'latest'], (old) => {
           return { ...old, temperature: data.data }
       })
       
       queryClient.setQueryData(['sensors', 'temperature', 'history'], (old) => {
           const newReadings = [...old.readings, data.data]
           return { ...old, readings: newReadings.slice(-100) }
       })
   })
   ```

5. **React re-renderiza componentes**:
   - SensorGauges actualiza valor de temperatura
   - SensorChart agrega nuevo punto al gráfico
   - SensorHistory agrega nueva fila a la tabla

### Configuración de Infraestructura

**Docker Compose** (`docker-compose.yml`):

```yaml
version: '3.8'
services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"    # MQTT
      - "9001:9001"    # MQTT over WebSocket
    volumes:
      - ./mosquitto/config:/mosquitto/config

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MQTT_BROKER=mosquitto
    depends_on:
      - mosquitto

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - backend

  sensor-simulator:
    build:
      context: ./backend
      dockerfile: Dockerfile.simulator
    environment:
      - MQTT_BROKER=mosquitto
    depends_on:
      - mosquitto
```

**Configuración Mosquitto** (`mosquitto/config/mosquitto.conf`):

```
persistence true
allow_anonymous true
listener 1883 0.0.0.0
listener 9001 0.0.0.0
protocol websockets
```

### Instrucciones de Ejecución

**Modo Desarrollo (Local)**:

```bash
# Terminal 1: Mosquitto broker (Docker)
cd mqtt
docker-compose up mosquitto -d

# Terminal 2: Sensor simulator
cd mqtt/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python sensor_simulator.py

# Terminal 3: Backend
cd mqtt/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 4: Frontend
cd mqtt/frontend
npm install
npm run dev
```

**Modo Producción (Docker)**:

```bash
cd mqtt
docker-compose up --build
```

**Acceso**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Documentación API: http://localhost:8000/docs
- MQTT Broker: localhost:1883

### Pruebas de Funcionalidad

**Test 1: Recepción de Datos en Tiempo Real**
1. Iniciar todos los servicios (Docker Compose)
2. Abrir frontend en navegador
3. Verificar que gauges muestran valores actuales
4. Observar que valores cambian cada 2 segundos
5. Verificar que gráfico se actualiza en tiempo real

**Test 2: Selección de Sensor**
1. Click en botón "Temperature" → ver gráfico de temperatura
2. Click en botón "Humidity" → ver gráfico de humedad
3. Click en botón "Pressure" → ver gráfico de presión
4. Verificar que tabla de historial cambia según sensor seleccionado

**Test 3: Múltiples Clientes**
1. Abrir frontend en dos navegadores diferentes
2. Verificar que ambos reciben actualizaciones simultáneamente
3. Cerrar un navegador y reabrir
4. Verificar que recibe datos históricos al reconectar

**Test 4: MQTT CLI (opcional)**
```bash
# Suscribirse a todos los topics de sensores
mosquitto_sub -h localhost -p 1883 -t "sensors/#" -v

# Publicar mensaje manual
mosquitto_pub -h localhost -p 1883 -t "sensors/temperature" \
  -m '{"value": 25.5, "unit": "°C", "sensor_id": "manual", "location": "test"}'
```

### Limitaciones de la PoC

1. **Almacenamiento In-Memory**: Datos se pierden al reiniciar backend
2. **Sin Autenticación MQTT**: Broker permite conexiones anónimas
3. **Sin TLS**: Comunicación MQTT no está encriptada
4. **Single Broker**: No implementa clustering de Mosquitto
5. **Sin Rate Limiting**: No limita cantidad de mensajes por segundo

### Extensiones Posibles

1. **Base de Datos Time-Series**: Persistir datos en InfluxDB/TimescaleDB
2. **Autenticación MQTT**: Configurar usuarios/contraseñas en Mosquitto
3. **TLS/SSL**: Encriptar comunicación MQTT con certificados
4. **EMQX Cluster**: Usar EMQX en lugar de Mosquitto para escalabilidad masiva
5. **Integración con Kafka**: Backend publica en Kafka para procesamiento posterior
6. **Alertas Configurables**: Sistema de umbrales y notificaciones
7. **Control de Actuadores**: Frontend puede publicar comandos MQTT para controlar dispositivos

---

**Siguiente Nivel**: RabbitMQ - Message brokering avanzado con exchanges, queues y patrones de routing
