# Apache Kafka - Proof of Concept

## 1. Definición

**Apache Kafka** es una plataforma distribuida de streaming de eventos diseñada para manejar flujos de datos en tiempo real a gran escala. Originalmente desarrollado por LinkedIn y open-sourced en 2011, Kafka se ha convertido en el estándar de la industria para arquitecturas basadas en eventos y procesamiento de big data.

### Características Fundamentales

- **Event Streaming**: Publicar, suscribirse, almacenar y procesar flujos de eventos en tiempo real
- **Alta Escalabilidad**: Arquitectura distribuida con particionado horizontal
- **Durabilidad**: Almacenamiento persistente en disco con replicación
- **Alto Throughput**: Capacidad de procesar millones de eventos por segundo
- **Baja Latencia**: Procesamiento en tiempo real con latencias de milisegundos
- **Retención Configurable**: Eventos persisten por días, semanas o indefinidamente
- **Replay de Eventos**: Capacidad de reprocesar eventos históricos desde cualquier offset

### Arquitectura de Kafka

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KAFKA CLUSTER                                 │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Broker 1   │  │   Broker 2   │  │   Broker 3   │               │
│  │              │  │              │  │              │               │
│  │  Partition 0 │  │  Partition 1 │  │  Partition 2 │               │
│  │  (Leader)    │  │  (Leader)    │  │  (Leader)    │               │
│  │              │  │              │  │              │               │
│  │  Partition 1 │  │  Partition 2 │  │  Partition 0 │               │
│  │  (Follower)  │  │  (Follower)  │  │  (Follower)  │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
    ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
    │Producer │          │Producer │          │Consumer │
    │   App   │          │   App   │          │  Group  │
    └─────────┘          └─────────┘          └─────────┘
```

### Conceptos Clave

#### Topics y Particiones
- **Topic**: Categoría o feed de eventos (ej: "user-events", "transactions")
- **Partición**: Subdivisión de un topic para paralelismo y escalabilidad
- **Orden**: Dentro de una partición, los eventos están ordenados por offset
- **Paralelismo**: Diferentes particiones pueden ser procesadas concurrentemente

#### Productores y Consumidores
- **Producer**: Publica eventos a topics
- **Consumer**: Lee eventos de topics
- **Consumer Group**: Conjunto de consumers que cooperan para procesar un topic
- **Load Balancing**: Particiones se distribuyen entre consumers del mismo grupo

#### Offsets y Replay
- **Offset**: Identificador único de cada evento dentro de una partición
- **Commit**: Consumidores marcan offsets procesados para tracking de progreso
- **Replay**: Capacidad de retroceder a offsets anteriores y reprocesar eventos

#### Replicación y Fault Tolerance
- **Replication Factor**: Número de copias de cada partición (típicamente 3)
- **Leader**: Réplica que maneja lecturas/escrituras
- **Follower**: Réplicas que sincronizan datos del leader
- **ISR (In-Sync Replicas)**: Réplicas que están al día con el leader

### Comparación con Message Brokers Tradicionales

| Característica | Kafka | RabbitMQ |
|----------------|-------|----------|
| **Modelo** | Event streaming | Message queuing |
| **Persistencia** | Duradera (días/semanas) | Temporal (hasta consumo) |
| **Consumo** | Múltiples consumers independientes | Competing consumers |
| **Replay** | Sí (cualquier offset) | No |
| **Orden** | Garantizado por partición | Garantizado por cola |
| **Throughput** | Millones/seg | Cientos de miles/seg |
| **Escalabilidad** | Particionado masivo | Clustering limitado |
| **Caso de uso** | Event sourcing, analytics | Task queues, workflows |

## 2. Casos de Uso

### Caso 1: Event Sourcing y CQRS en Microservicios

**Contexto**: Sistema de e-commerce donde cada cambio de estado (orden creada, pagada, enviada) debe ser registrado como evento inmutable para auditoría y reconstrucción de estado.

**Implementación**:
- **Producers**: Microservicios publican eventos de dominio a topics específicos
  - `order-events`: order.created, order.paid, order.shipped
  - `inventory-events`: stock.reserved, stock.deducted
  - `payment-events`: payment.initiated, payment.completed
- **Kafka Topics**: Configurados con replicación 3 y retención de 7 días
- **Consumers**: 
  - Read models se actualizan consumiendo eventos (CQRS)
  - Servicio de auditoría consume todos los eventos
  - Analytics service procesa eventos para métricas
- **Event Replay**: Nuevos servicios pueden consumir eventos históricos para construir sus propias vistas

**Beneficio**: Historia completa e inmutable del sistema, capacidad de reconstruir estado en cualquier punto del tiempo, fácil adición de nuevos consumidores sin modificar productores.

### Caso 2: Plataforma de Analytics en Tiempo Real

**Contexto**: Plataforma SaaS que procesa millones de eventos de usuario (clicks, pageviews, conversiones) para generar dashboards y alertas en tiempo real.

**Implementación**:
- **Producers**: SDKs de frontend y backend envían eventos a topic `user-activity`
- **Kafka Streams**: Procesamiento en tiempo real
  - Agregación de métricas por ventana de tiempo (1 min, 5 min, 1 hora)
  - Detección de anomalías (picos de tráfico, errores)
  - Enriquecimiento de eventos con datos de usuario
- **Topics de salida**:
  - `metrics-aggregated`: Métricas listas para dashboards
  - `alerts-triggered`: Alertas para notificaciones
- **Consumers**: Servicios que alimentan dashboards, envían alertas, almacenan en data warehouse

**Beneficio**: Procesamiento de millones de eventos por segundo, latencia de segundos para alertas, escalabilidad horizontal, y capacidad de reprocesar datos históricos para nuevos análisis.

### Caso 3: Integración de Sistemas Legacy y Modernos

**Contexto**: Empresa con sistemas legacy (mainframe, ERP antiguo) que necesitan integrarse con microservicios modernos sin acoplamiento directo.

**Implementación**:
- **Producers**: 
  - Conectores CDC (Change Data Capture) leen cambios de bases de datos legacy
  - APIs de sistemas legacy publican eventos a Kafka
- **Kafka como Backbone**: 
  - Topics organizados por dominio: `customer-events`, `transaction-events`, `inventory-events`
  - Schema Registry asegura compatibilidad de formatos
- **Consumers**: 
  - Microservicios modernos consumen eventos relevantes
  - Conectores exportan datos a sistemas externos (data warehouse, search engine)
- **Transformación**: Kafka Streams transforma eventos entre formatos legacy y modernos

**Beneficio**: Desacoplamiento entre sistemas legacy y modernos, migración gradual sin big bang, punto único de integración, y capacidad de auditar todos los flujos de datos.

### Caso 4: Procesamiento de Logs y Monitoreo Centralizado

**Contexto**: Infraestructura con cientos de microservicios que generan logs, métricas y traces que deben ser agregados y analizados centralizadamente.

**Implementación**:
- **Producers**: 
  - Filebeat/Fluentd agents en cada servidor envían logs a `application-logs`
  - Métricas de Prometheus exportadas a `metrics-stream`
  - Traces de Jaeger/Zipkin enviados a `distributed-traces`
- **Kafka como Buffer**: 
  - Absorbe picos de volumen sin perder datos
  - Retención de 30 días para troubleshooting
- **Consumers**:
  - Elasticsearch indexing service para búsqueda de logs
  - Grafana/Prometheus para visualización de métricas
  - ML service para detección de anomalías
  - Alerting service para notificaciones

**Beneficio**: Buffer contra picos de volumen, punto único de ingestión, capacidad de añadir nuevos consumidores sin modificar productores, y retención configurable para compliance.

### Caso 5: Plataforma de Mensajería y Notificaciones

**Contexto**: Sistema de mensajería que debe entregar millones de notificaciones (email, SMS, push) con garantías de entrega y tracking de estado.

**Implementación**:
- **Producers**: 
  - Servicios de aplicación publican notificaciones a `notifications`
  - Metadata incluye: tipo (email/SMS/push), destinatario, contenido, prioridad
- **Kafka Topics**:
  - `notifications`: Cola principal de notificaciones
  - `notification-status`: Estado de entrega (enviado, entregado, fallido)
- **Consumers**:
  - Email service (SendGrid/SES integration)
  - SMS service (Twilio integration)
  - Push notification service (FCM/APNs)
  - Status tracking service
- **Consumer Groups**: Cada servicio de canal tiene su propio consumer group
- **Dead Letter Queue**: Notificaciones fallidas van a topic `notifications-failed` para retry

**Beneficio**: Escalabilidad masiva, garantías de entrega, tracking de estado en tiempo real, fácil adición de nuevos canales de comunicación, y manejo robusto de fallos.

## 3. Análisis Arquitectónico

### Kafka en el Espectro de Comunicación Asíncrona

Kafka ocupa el extremo más avanzado del espectro, diseñado para casos de uso de big data y event streaming:

#### Kafka vs Webhooks

| Aspecto | Kafka | Webhooks |
|---------|-------|----------|
| **Dirección** | Multi-direccional | Unidireccional (push) |
| **Persistencia** | Duradera (días/semanas) | Ninguna |
| **Replay** | Sí | No |
| **Escalabilidad** | Masiva (particionado) | Limitada |
| **Consumidores** | Múltiples independientes | Uno por endpoint |
| **Complejidad** | Alta | Baja |
| **Caso ideal** | Event streaming, big data | Integraciones simples |

**Análisis**: Kafka es una plataforma completa de event streaming con capacidades avanzadas de persistencia y replay. Webhooks son apropiados para notificaciones simples entre servicios donde la simplicidad es prioritaria.

#### Kafka vs WebSockets

| Aspecto | Kafka | WebSockets |
|---------|-------|------------|
| **Propósito** | Event streaming backend | Comunicación cliente-servidor |
| **Persistencia** | Duradera | Volátil (sesión) |
| **Escala** | Cluster distribuido | Single server (típicamente) |
| **Consumidores** | Múltiples consumer groups | Múltiples conexiones |
| **Latencia** | Milisegundos-segundos | Milisegundos |
| **Caso ideal** | Procesamiento de eventos | Apps interactivas tiempo real |

**Análisis**: Kafka y WebSockets son complementarios. Kafka maneja el streaming de eventos en el backend, mientras que WebSockets entrega datos en tiempo real a clientes frontend. Una arquitectura típica usa Kafka internamente y WebSockets para push notifications.

#### Kafka vs MQTT

| Aspecto | Kafka | MQTT |
|---------|-------|------|
| **Protocolo** | Custom (TCP) | MQTT (ligero) |
| **Dispositivos** | Servidores, servicios | IoT, dispositivos limitados |
| **Overhead** | Medio | Muy bajo |
| **Persistencia** | Duradera | Limitada |
| **Throughput** | Muy alto | Alto |
| **Ecosistema** | Enterprise | IoT |
| **Caso ideal** | Big data, event sourcing | IoT, dispositivos embebidos |

**Análisis**: Kafka está optimizado para procesamiento de big data en servidores, mientras que MQTT está diseñado para dispositivos IoT con recursos limitados. Son complementarios: MQTT puede ingestar datos de dispositivos IoT que luego Kafka procesa y almacena.

#### Kafka vs RabbitMQ

| Aspecto | Kafka | RabbitMQ |
|---------|-------|----------|
| **Modelo** | Event streaming | Message queuing |
| **Persistencia** | Duradera (configurable) | Temporal (hasta consumo) |
| **Consumo** | Múltiples consumers leen mismos eventos | Mensajes se eliminan tras consumo |
| **Replay** | Sí (desde cualquier offset) | No |
| **Orden** | Por partición | Por cola |
| **Escalabilidad** | Particionado masivo | Clustering + mirroring |
| **Throughput** | Millones/seg | Cientos de miles/seg |
| **Complejidad** | Alta | Media |
| **Madurez** | 12+ años | 15+ años |
| **Caso ideal** | Event sourcing, analytics, big data | Task queues, workflows, microservicios |

**Análisis**: Kafka es superior para casos de uso donde se necesita:
1. **Event replay**: Reprocesar eventos históricos
2. **Múltiples consumidores**: Diferentes servicios procesan los mismos eventos independientemente
3. **Alto throughput**: Millones de eventos por segundo
4. **Retención a largo plazo**: Eventos persisten por días/semanas

RabbitMQ es mejor para:
1. **Task queues**: Mensajes se procesan una vez y se eliminan
2. **Workflows complejos**: Routing avanzado con exchanges
3. **Simplicidad**: Más fácil de operar y configurar
4. **Garantías de entrega**: Acknowledgments y dead letter queues

### Posición en la Arquitectura de Sistemas

```
┌─────────────────────────────────────────────────────────────┐
│                    DISPOSITIVOS / CLIENTES                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ IoT      │  │ Web App  │  │ Mobile   │                   │
│  │ Devices  │  │          │  │ App      │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │ MQTT        │ WebSocket   │ REST API
        │             │             │
┌───────▼─────────────▼─────────────▼─────────────────────────┐
│                    CAPA DE INGESTIÓN                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Gateway / Load Balancer / MQTT Broker           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    KAFKA (Event Backbone)                     │
│  Topics: user-events, transactions, logs, metrics, ...      │
│  Partitions: Distributed across cluster                     │
│  Replication: 3x for fault tolerance                        │
│  Retention: 7 days (configurable)                           │
└──┬──────────┬──────────┬──────────┬─────────────────────────┘
   │          │          │          │
┌──▼───┐  ┌──▼───┐  ┌──▼───┐  ┌──▼───┐
│Micro │  │Micro │  │Micro │  │Micro │
│serv. │  │serv. │  │serv. │  │serv. │
│  1   │  │  2   │  │  3   │  │  4   │
└──────┘  └──────┘  └──────┘  └──────┘
   │          │          │          │
   │          │          │          │
┌──▼──────────▼──────────▼──────────▼─────────────────────────┐
│                    RABBITMQ (Task Queues)                     │
│  Para workflows específicos y processing asíncrono           │
└─────────────────────────────────────────────────────────────┘
```

**Kafka** opera como el backbone de eventos de toda la arquitectura, mientras que:
- **MQTT** maneja comunicación con dispositivos IoT
- **WebSockets** proporciona comunicación en tiempo real con clientes
- **RabbitMQ** maneja task queues y workflows específicos

### Ventajas de Kafka

1. **Event Replay**: Capacidad de reprocesar eventos históricos para nuevos consumidores o debugging
2. **Alta Escalabilidad**: Particionado permite escalar horizontalmente a millones de eventos/seg
3. **Durabilidad**: Replicación y persistencia garantizan que no se pierdan eventos
4. **Desacoplamiento**: Productores y consumidores evolucionan independientemente
5. **Ecosistema Rico**: Kafka Connect, Kafka Streams, KSQL para procesamiento avanzado
6. **Orden Garantizado**: Dentro de particiones, eventos están ordenados
7. **Multi-tenant**: Consumer groups permiten múltiples consumidores independientes

### Limitaciones de Kafka

1. **Complejidad**: Configuración y operación requieren expertise especializado
2. **Overhead**: Más recursos que sistemas más simples
3. **No para task queues**: No es ideal para mensajes que se procesan una vez y se eliminan
4. **Curva de aprendizaje**: Conceptos como particiones, offsets, consumer groups toman tiempo
5. **Costo**: Clusters de producción requieren infraestructura significativa

### Cuándo Usar Kafka

**Casos ideales**:
- Event sourcing y CQRS
- Plataformas de analytics en tiempo real
- Integración de múltiples sistemas (event backbone)
- Procesamiento de logs y monitoreo
- Casos que requieren replay de eventos históricos
- Alto throughput (millones de eventos/seg)
- Múltiples consumidores necesitan los mismos eventos

**Casos donde NO usar Kafka**:
- Task queues simples (usar RabbitMQ)
- Comunicación en tiempo real con clientes (usar WebSockets)
- Dispositivos IoT con recursos limitados (usar MQTT)
- Integraciones simples unidireccionales (usar Webhooks)
- Proyectos pequeños donde la complejidad no se justifica

## 4. Implementación PoC

### Arquitectura de la Solución

Esta PoC implementa una **Plataforma de Event Streaming y Analytics** que demuestra las capacidades core de Kafka:

```
┌─────────────────┐
│  React Frontend │
│  (Puerto 5173)  │
└────────┬────────┘
         │ REST API + WebSocket
┌────────▼────────┐
│  FastAPI Backend│
│  (Puerto 8000)  │
│                 │
│  - Producer API │
│  - Consumer     │
│  - Analytics    │
│  - Replay API   │
└────────┬────────┘
         │ Kafka Client (aiokafka)
┌────────▼────────────────────────────────┐
│         KAFKA BROKER                     │
│         (KRaft mode - no Zookeeper)     │
│                                         │
│  Topic: "events"                        │
│  - Partitions: 1 (simplified for PoC)   │
│  - Replication: 1 (single broker)       │
│  - Retention: 7 days                    │
└────────┬────────────────────────────────┘
         │
         │ Kafka Producer
         │
┌────────▼────────┐
│ Event Producer  │
│   Service       │
│ (Simulates      │
│  external       │
│  event sources) │
└─────────────────┘
```

### Componentes del Backend (Python/FastAPI + aiokafka)

**Archivo**: `backend/main.py`

**Kafka Producer y Consumer Setup**:

```python
async def setup_kafka():
    # Producer: Publica eventos al topic 'events'
    kafka_producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8'),
        key_serializer=lambda k: k.encode('utf-8')
    )
    await kafka_producer.start()
    
    # Consumer: Consume eventos para analytics
    kafka_consumer = AIOKafkaConsumer(
        'events',
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='earliest',  # Start from beginning if no committed offset
        enable_auto_commit=True,
        group_id='analytics-consumer-group'
    )
    await kafka_consumer.start()
    
    # Start background task to consume events
    asyncio.create_task(consume_events())
```

**Endpoint para Producir Eventos**:

```python
@app.post("/api/events")
async def produce_event(event: Event):
    event_id = str(uuid.uuid4())
    event_data = {
        'event_id': event_id,
        'event_type': event.event_type,
        'source': event.source,
        'payload': event.payload,
        'timestamp': datetime.now().isoformat()
    }
    
    # Produce to Kafka with event_type as key (for partitioning)
    await kafka_producer.send_and_wait(
        'events',
        value=event_data,
        key=event.event_type
    )
    
    return {'event_id': event_id, 'status': 'produced'}
```

**Consumer Background Task**:

```python
async def consume_events():
    """Background task to consume events from Kafka."""
    async for msg in kafka_consumer:
        event_data = msg.value
        
        # Store in memory for PoC (in production: write to database)
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
        
        # Broadcast to WebSocket clients
        await sio.emit('new_event', {
            'event': event_data,
            'partition': msg.partition,
            'offset': msg.offset
        })
```

**Event Replay API**:

```python
@app.get("/api/events/replay")
async def replay_events(from_offset: int = 0, limit: int = 100):
    """Replay events from Kafka starting from specific offset."""
    replay_consumer = AIOKafkaConsumer(
        'events',
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='earliest',
        enable_auto_commit=False,
        group_id=f'replay-{datetime.now().timestamp()}'
    )
    
    await replay_consumer.start()
    
    try:
        # Seek to specific offset
        partitions = replay_consumer.partitions_for_topic('events')
        for partition_id in partitions:
            tp = TopicPartition('events', partition_id)
            await replay_consumer.seek(tp, from_offset)
        
        # Collect events
        events = []
        async for msg in replay_consumer:
            events.append({
                'event': msg.value,
                'partition': msg.partition,
                'offset': msg.offset
            })
            if len(events) >= limit:
                break
        
        return {'events': events, 'from_offset': from_offset, 'count': len(events)}
    finally:
        await replay_consumer.stop()
```

**Endpoints REST API**:

1. **POST /api/events**: Produce evento a Kafka
2. **GET /api/events**: Obtener eventos recientes del consumer
3. **GET /api/events/replay**: Replay eventos desde offset específico
4. **GET /api/analytics**: Estadísticas agregadas
5. **GET /api/topics**: Listar todos los topics de Kafka

**Características Técnicas**:
- **aiokafka**: Cliente Kafka asíncrono para Python
- **Consumer Groups**: Analytics consumer usa group ID para tracking de offsets
- **Event Replay**: Nuevo consumer con offset específico para demostrar replay
- **WebSocket Integration**: Broadcast de eventos en tiempo real al frontend
- **Analytics Aggregation**: Contadores en memoria para diferentes dimensiones

### Event Producer Service

**Archivo**: `backend/event_producer.py`

Servicio que simula fuentes externas de eventos:

```python
async def generate_event():
    """Generate a random event."""
    event_type = random.choice([
        'user.login', 'user.logout', 'page.view',
        'button.click', 'api.request', 'error.occurred'
    ])
    
    source = random.choice([
        'web-app', 'mobile-app', 'api-gateway'
    ])
    
    payload = {
        'user_id': f'user_{random.randint(1, 1000)}',
        'session_id': str(uuid.uuid4())[:8]
    }
    
    # Add type-specific data
    if event_type == 'page.view':
        payload['page'] = random.choice(['/home', '/products', '/about'])
    elif event_type == 'api.request':
        payload['endpoint'] = random.choice(['/api/users', '/api/products'])
        payload['response_time_ms'] = random.randint(50, 500)
    
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
    
    while True:
        event = await generate_event()
        await producer.send_and_wait('events', value=event, key=event['event_type'])
        await asyncio.sleep(random.uniform(0.5, 3.0))  # Random delay
```

**Comportamiento**:
- Genera eventos aleatorios de diferentes tipos
- Produce eventos cada 0.5-3 segundos
- Usa event_type como key para particionado consistente
- Simula cargas de trabajo realistas

### Componentes del Frontend (React + Socket.IO + TanStack Query)

**Arquitectura de Componentes**:

```
App.jsx
├── AnalyticsDashboard.jsx    # Métricas y gráficos en tiempo real
├── EventProducer.jsx         # Formulario para producir eventos
├── EventReplay.jsx           # Interfaz para replay de eventos
└── EventStream.jsx           # Stream de eventos en tiempo real
```

**Integración con TanStack Query**:

```javascript
// Fetch analytics (polling every 2 seconds)
const { data: analyticsData } = useQuery({
  queryKey: ['analytics'],
  queryFn: async () => {
    const response = await fetch('/api/analytics')
    return response.json()
  },
  refetchInterval: 2000
})

// Fetch recent events (polling every 3 seconds as fallback)
const { data: eventsData } = useQuery({
  queryKey: ['events'],
  queryFn: async () => {
    const response = await fetch('/api/events?limit=100')
    return response.json()
  },
  refetchInterval: 3000
})
```

**Sincronización WebSocket → TanStack Query**:

```javascript
useEffect(() => {
  // Real-time event updates from Kafka consumer
  socket.on('new_event', (data) => {
    queryClient.setQueryData(['events'], (old) => {
      if (!old) return { events: [data.event], total: 1 }
      return {
        ...old,
        events: [...old.events, data.event].slice(-100),
        total: (old.total || 0) + 1
      }
    })
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  })
}, [queryClient])
```

**Componente AnalyticsDashboard**:
- Tarjetas con métricas principales: total events, event types, sources
- Gráficos de barras: events by type, events by source
- Listas de top event types y sources
- Actualización automática cada 2 segundos

**Componente EventProducer**:
- Formulario para producir eventos manualmente
- Selectores de event type y source
- Textarea para payload JSON
- Botón para producir evento a Kafka

**Componente EventReplay**:
- Inputs para from_offset y limit
- Botón para iniciar replay
- Muestra eventos replayed con metadata (partition, offset)
- Demuestra capacidad de Kafka de reprocesar eventos históricos

**Componente EventStream**:
- Lista de eventos recientes en tiempo real
- Filtro por event type
- Muestra event type, source, payload, partition, offset, timestamp
- Scroll automático para eventos nuevos

### Flujo de Datos Completo

**Escenario: Event Producer Service Genera Evento**

1. **Event Producer Service genera evento aleatorio**:
   ```python
   event = {
     'event_id': 'abc123...',
     'event_type': 'user.login',
     'source': 'web-app',
     'payload': {'user_id': 'user_456', 'session_id': 'xyz789'},
     'timestamp': '2024-01-15T10:30:00'
   }
   ```

2. **Producer publica evento a Kafka**:
   ```python
   await producer.send_and_wait(
     'events',
     value=event,
     key='user.login'  # Partitioning key
   )
   ```

3. **Kafka Broker recibe y almacena evento**:
   - Evento escrito a partición basada en hash de key
   - Offset asignado (ej: offset 1234)
   - Evento persistido en disco
   - Replicado a followers (en producción)

4. **Backend Consumer recibe evento**:
   ```python
   async for msg in kafka_consumer:
     event_data = msg.value
     # msg.partition = 0
     # msg.offset = 1234
     
     # Store in memory
     events_store.append({...})
     
     # Update analytics
     analytics_data['total_events'] += 1
     analytics_data['events_by_type']['user.login'] += 1
     
     # Broadcast to WebSocket clients
     await sio.emit('new_event', {...})
   ```

5. **Frontend recibe evento vía WebSocket**:
   ```javascript
   socket.on('new_event', (data) => {
     queryClient.setQueryData(['events'], (old) => {
       return {
         ...old,
         events: [...old.events, data.event].slice(-100)
       }
     })
   })
   ```

6. **UI actualiza en tiempo real**:
   - EventStream muestra nuevo evento
   - AnalyticsDashboard incrementa contadores
   - Gráficos se actualizan

**Escenario: Usuario Hace Replay de Eventos**

1. **Usuario configura replay**:
   - From offset: 1000
   - Limit: 50

2. **Frontend llama a replay API**:
   ```javascript
   const response = await fetch('/api/events/replay?from_offset=1000&limit=50')
   ```

3. **Backend crea nuevo consumer**:
   ```python
   replay_consumer = AIOKafkaConsumer(
     'events',
     group_id=f'replay-{timestamp}'
   )
   
   # Seek to offset 1000
   await replay_consumer.seek(tp, 1000)
   
   # Collect 50 events
   events = []
   async for msg in replay_consumer:
     events.append(msg.value)
     if len(events) >= 50:
       break
   ```

4. **Kafka lee eventos desde offset 1000**:
   - Eventos persistidos en disco
   - Kafka busca offset 1000 en partición
   - Lee eventos secuencialmente

5. **Frontend muestra eventos replayed**:
   - Lista de 50 eventos desde offset 1000
   - Metadata: partition, offset, timestamp
   - Demuestra capacidad de reprocesamiento histórico

### Configuración de Infraestructura

**Docker Compose** (`docker-compose.yml`):

```yaml
version: '3.8'
services:
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      # KRaft mode (no Zookeeper)
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    volumes:
      - kafka_data:/var/lib/kafka/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
    depends_on:
      - kafka

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - backend

  event-producer:
    build:
      context: ./backend
      dockerfile: Dockerfile.producer
    environment:
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
    depends_on:
      - kafka
```

**Nota**: Esta PoC usa Kafka en modo KRaft (sin Zookeeper) para simplificar. En producción, se usaría un cluster con múltiples brokers y replicación.

### Instrucciones de Ejecución

**Modo Desarrollo (Local)**:

```bash
# Terminal 1: Kafka broker (Docker)
cd kafka
docker-compose up kafka -d

# Terminal 2: Backend
cd kafka/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 3: Event Producer (opcional - genera eventos automáticos)
cd kafka/backend
source venv/bin/activate
python event_producer.py

# Terminal 4: Frontend
cd kafka/frontend
npm install
npm run dev
```

**Modo Producción (Docker)**:

```bash
cd kafka
docker-compose up --build
```

**Acceso**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Kafka Broker: localhost:9092

### Pruebas de Funcionalidad

**Test 1: Event Streaming en Tiempo Real**
1. Iniciar todos los servicios (Docker Compose)
2. Abrir frontend en navegador
3. Event Producer Service genera eventos automáticamente
4. Verificar que EventStream muestra eventos en tiempo real
5. Verificar que AnalyticsDashboard actualiza contadores

**Test 2: Producción Manual de Eventos**
1. En frontend, usar EventProducer form
2. Seleccionar event type, source, y escribir payload JSON
3. Click "Produce Event"
4. Verificar que evento aparece en EventStream
5. Verificar que analytics se actualiza

**Test 3: Event Replay**
1. Esperar a que se produzcan 100+ eventos
2. En EventReplay, configurar:
   - From offset: 50
   - Limit: 20
3. Click "Replay Events"
4. Verificar que se muestran 20 eventos desde offset 50
5. Comparar con eventos en EventStream (deben ser más antiguos)

**Test 4: Kafka CLI Tools (opcional)**
```bash
# Entrar al container de Kafka
docker-compose exec kafka bash

# Listar topics
kafka-topics --bootstrap-server localhost:9092 --list

# Describir topic 'events'
kafka-topics --bootstrap-server localhost:9092 --describe --topic events

# Consumir eventos desde el inicio
kafka-console-consumer --bootstrap-server localhost:9092 --topic events --from-beginning

# Consumir últimos 10 eventos
kafka-console-consumer --bootstrap-server localhost:9092 --topic events --max-messages 10
```

### Limitaciones de la PoC

1. **Single Broker**: No demuestra replicación ni fault tolerance
2. **Single Partition**: No demuestra paralelismo de múltiples particiones
3. **In-Memory Storage**: Eventos en memoria del backend (no base de datos)
4. **Consumer Group Simple**: Solo un consumer group para analytics
5. **Sin Schema Registry**: No validación de esquemas de eventos
6. **Sin Kafka Streams**: No procesamiento avanzado de streams

### Extensiones Posibles

1. **Multi-Broker Cluster**: 3 brokers con replicación
2. **Multiple Partitions**: Topic con 3+ particiones para paralelismo
3. **Kafka Connect**: Conectores para bases de datos, Elasticsearch
4. **Kafka Streams**: Procesamiento de streams en tiempo real
5. **Schema Registry**: Validación de esquemas con Avro/Protobuf
6. **KSQL**: SQL-like queries sobre streams de Kafka
7. **Multiple Consumer Groups**: Diferentes servicios consumiendo mismos eventos
8. **Dead Letter Queue**: Topic para eventos fallidos
9. **Exactly-Once Semantics**: Transacciones de Kafka
10. **Monitoring**: Prometheus + Grafana para métricas de Kafka

---

**Fin de la Serie**: Has completado los 5 niveles de tecnologías de comunicación asíncrona:
1. Webhooks - Notificaciones HTTP simples
2. WebSockets - Comunicación bidireccional en tiempo real
3. MQTT - Protocolo ligero para IoT
4. RabbitMQ - Message brokering con patrones avanzados
5. Apache Kafka - Event streaming y big data

Cada tecnología tiene su lugar en el espectro de complejidad y casos de uso. La elección depende de los requisitos específicos de escalabilidad, latencia, durabilidad, y complejidad del proyecto.
