# RabbitMQ - Proof of Concept

## 1. Definición

**RabbitMQ** es un message broker de código abierto que implementa el protocolo **AMQP** (Advanced Message Queuing Protocol). Actúa como intermediario entre aplicaciones, permitiendo comunicación asíncrona mediante colas de mensajes. RabbitMQ soporta múltiples patrones de mensajería y proporciona garantías de entrega, persistencia, y routing avanzado.

### Características Fundamentales

- **Protocolo AMQP**: Estándar abierto para mensajería empresarial con interoperabilidad entre sistemas
- **Múltiples Exchange Types**: Direct, Topic, Fanout, Headers para diferentes patrones de routing
- **Message Queues**: Almacenamiento temporal de mensajes hasta que sean procesados
- **Message Acknowledgments**: Confirmación explícita de procesamiento exitoso
- **Persistence**: Mensajes pueden sobrevivir reinicios del broker
- **High Availability**: Clustering y replicación para fault tolerance
- **Management UI**: Interfaz web para monitoreo y administración

### Arquitectura de Funcionamiento

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Producer   │ ──────▶ │    Exchange      │ ──────▶ │   Queue     │
│  (App)      │ publish │  (Routing Logic) │  bind   │  (Storage)  │
└─────────────┘         └──────────────────┘         └──────┬──────┘
                                                            │
                                                            ▼
                                                     ┌─────────────┐
                                                     │  Consumer   │
                                                     │  (Worker)   │
                                                     └─────────────┘
```

1. **Producer**: Publica mensajes a un exchange con routing key
2. **Exchange**: Recibe mensajes y los enruta a queues según tipo y bindings
3. **Queue**: Almacena mensajes hasta que un consumer los procese
4. **Consumer**: Recibe mensajes de la queue y los procesa
5. **Acknowledgment**: Consumer confirma procesamiento exitoso al broker

### Exchange Types

#### 1. **Direct Exchange**
- **Routing**: Exact match entre routing key del mensaje y binding key de la queue
- **Caso de uso**: Work queues, procesamiento específico por tipo
- **Ejemplo**: `payment` → queue de procesamiento de pagos

#### 2. **Topic Exchange**
- **Routing**: Pattern matching con wildcards (`*` para una palabra, `#` para cero o más)
- **Caso de uso**: Notificaciones selectivas, logging por nivel
- **Ejemplo**: `order.created`, `order.paid`, `log.error.*`

#### 3. **Fanout Exchange**
- **Routing**: Ignora routing key, envía copia a todas las queues bound
- **Caso de uso**: Broadcast a múltiples sistemas, analytics
- **Ejemplo**: Enviar orden a analytics, logging, y auditoría simultáneamente

#### 4. **Headers Exchange**
- **Routing**: Basado en headers del mensaje en lugar de routing key
- **Caso de uso**: Routing complejo basado en metadata
- **Ejemplo**: Mensajes con header `priority=high` van a queue prioritaria

### Patrones de Mensajería

#### Work Queue Pattern (Competing Consumers)
```
Producer → Direct Exchange → Queue → Consumer 1
                                      Consumer 2
                                      Consumer 3
```
- Múltiples consumers compiten por mensajes de la misma queue
- Cada mensaje es procesado por exactamente un consumer
- Distribución de carga automática
- **Caso de uso**: Procesamiento de tareas pesadas, background jobs

#### Publish/Subscribe Pattern
```
Producer → Fanout Exchange → Queue 1 → Consumer 1
                              Queue 2 → Consumer 2
                              Queue 3 → Consumer 3
```
- Cada consumer recibe su propia copia del mensaje
- Desacoplamiento total entre producer y consumers
- **Caso de uso**: Notificaciones a múltiples sistemas, event broadcasting

#### RPC Pattern (Request/Reply)
```
Client → Queue (Request) → Server
Client ← Queue (Reply) ← Server
```
- Comunicación síncrona sobre mensajería asíncrona
- Client envía request y espera reply en queue temporal
- **Caso de uso**: Microservicios que necesitan respuesta inmediata

### Comparación con Otras Tecnologías

| Característica | RabbitMQ | MQTT | WebSockets | Kafka |
|----------------|----------|------|------------|-------|
| **Protocolo** | AMQP | MQTT | WebSocket | Custom (TCP) |
| **Arquitectura** | Message broker | Pub/Sub broker | Cliente-servidor | Event streaming |
| **Routing** | Avanzado (exchanges) | Topics simples | Directo | Topics + particiones |
| **Persistencia** | Sí (opcional) | Limitada | No | Sí (siempre) |
| **Replay** | No | No | No | Sí |
| **Throughput** | Alto | Alto | Medio | Muy alto |
| **Caso ideal** | Microservicios | IoT | Apps web | Big data |

## 2. Casos de Uso

### Caso 1: Procesamiento de Pagos en E-commerce

**Contexto**: Plataforma de e-commerce que procesa miles de órdenes por hora, requiriendo validación de pagos, actualización de inventario, y envío de notificaciones.

**Implementación**:
- **Producer**: API de órdenes publica mensaje a exchange `orders` con routing key `order.created`
- **Exchange**: Topic exchange enruta según routing key
- **Queues**:
  - `payment.processing` (routing key: `order.created`) → Payment service
  - `inventory.update` (routing key: `order.created`) → Inventory service
  - `email.notification` (routing key: `order.created`, `order.paid`) → Email service
  - `analytics.orders` (fanout) → Analytics service
- **Consumers**: Microservicios independientes procesan mensajes asíncronamente
- **Acknowledgments**: Cada servicio confirma procesamiento exitoso

**Beneficio**: Desacoplamiento total entre servicios, escalabilidad independiente, tolerancia a fallos (si payment service cae, mensajes se acumulan en queue hasta que vuelva).

### Caso 2: Sistema de Notificaciones Multi-Canal

**Contexto**: Aplicación SaaS que necesita enviar notificaciones por email, SMS, push notifications, y webhooks según preferencias del usuario y tipo de evento.

**Implementación**:
- **Producer**: Application events service publica a exchange `notifications` (topic)
- **Routing keys**: `user.signup`, `order.shipped`, `payment.failed`, `alert.critical`
- **Queues**:
  - `email.notifications` (binding: `user.*`, `order.*`) → Email service
  - `sms.notifications` (binding: `alert.critical`, `payment.failed`) → SMS service
  - `push.notifications` (binding: `#`) → Push service (recibe todo)
  - `webhook.notifications` (binding: `user.*`) → Webhook dispatcher
- **Consumers**: Servicios especializados por canal
- **Dead Letter Exchange**: Mensajes fallidos van a queue de retry

**Beneficio**: Routing selectivo basado en tipo de evento, escalabilidad por canal, retry automático de notificaciones fallidas.

### Caso 3: Procesamiento de Imágenes y Videos

**Contexto**: Plataforma de contenido que permite usuarios subir imágenes/videos que requieren procesamiento (redimensionado, compresión, thumbnail generation, watermarking).

**Implementación**:
- **Producer**: Upload service publica mensaje a queue `media.processing` (direct exchange)
- **Queue**: `media.processing` con múltiples workers
- **Consumers**: 5-10 workers procesan imágenes/videos en paralelo
- **Work Queue Pattern**: Cada worker toma un mensaje, procesa, y confirma
- **Priority Queue**: Mensajes con header `priority=high` procesados primero
- **Progress Tracking**: Workers publican progreso a exchange `media.progress` (topic)
- **Completion**: Worker publica a `media.completed` cuando termina

**Beneficio**: Procesamiento paralelo automático, escalabilidad horizontal (añadir más workers), balanceo de carga, priorización de tareas urgentes.

### Caso 4: Sincronización de Datos entre Microservicios

**Contexto**: Arquitectura de microservicios donde cambios en un servicio (ej: actualización de perfil de usuario) deben propagarse a otros servicios (caching, search, analytics).

**Implementación**:
- **Producer**: User service publica eventos a exchange `user.events` (fanout)
- **Events**: `user.created`, `user.updated`, `user.deleted`
- **Queues** (cada servicio tiene su propia queue):
  - `cache.invalidate` → Cache service (invalida caché de usuario)
  - `search.reindex` → Search service (actualiza índice de búsqueda)
  - `analytics.events` → Analytics service (registra evento)
  - `audit.log` → Audit service (registra cambio para compliance)
- **Consumers**: Cada servicio procesa eventos independientemente
- **Idempotency**: Consumers manejan mensajes duplicados gracefully

**Beneficio**: Desacoplamiento entre servicios, eventual consistency, cada servicio evoluciona independientemente, fácil añadir nuevos consumidores.

### Caso 5: Sistema de Colas de Trabajo para Reportes

**Contexto**: Aplicación de business intelligence donde usuarios solicitan reportes complejos que toman minutos u horas en generarse (análisis de millones de registros).

**Implementación**:
- **Producer**: Report request API publica a queue `reports.generation` (direct exchange)
- **Queue**: `reports.generation` con prefetch=1 (un reporte por worker a la vez)
- **Consumers**: 3-5 report generation workers
- **Progress Updates**: Workers publican progreso a `reports.progress` (topic exchange)
- **Completion**: Workers publican a `reports.completed` con URL del reporte generado
- **Notification**: Frontend se suscribe a `reports.progress.{user_id}` para updates en tiempo real
- **Retry Logic**: Mensajes fallidos van a `reports.failed` con exponential backoff

**Beneficio**: Procesamiento asíncrono de tareas pesadas, feedback en tiempo real al usuario, escalabilidad según demanda, manejo robusto de fallos.

## 3. Análisis Arquitectónico

### RabbitMQ en el Espectro de Comunicación Asíncrona

RabbitMQ ocupa una posición intermedia en el espectro, ofreciendo más funcionalidades que WebSockets/MQTT pero menos complejidad que Kafka:

#### RabbitMQ vs Webhooks

| Aspecto | RabbitMQ | Webhooks |
|---------|----------|----------|
| **Arquitectura** | Message broker centralizado | Point-to-point HTTP |
| **Routing** | Avanzado (exchanges, patterns) | Simple (URL fija) |
| **Garantías** | Acknowledgments, persistence, retry | Best-effort (HTTP status) |
| **Escalabilidad** | Alta (clustering, mirroring) | Limitada (acoplamiento directo) |
| **Complejidad** | Media (configuración de exchanges/queues) | Baja (solo HTTP POST) |
| **Caso ideal** | Microservicios empresariales | Integraciones simples entre servicios |

**Análisis**: RabbitMQ proporciona infraestructura robusta para arquitecturas de microservicios con múltiples consumidores, routing complejo, y garantías de entrega. Webhooks son más apropiados para integraciones simples unidireccionales donde la simplicidad es prioritaria sobre la robustez.

#### RabbitMQ vs WebSockets

| Aspecto | RabbitMQ | WebSockets |
|---------|----------|------------|
| **Propósito** | Message brokering backend | Comunicación cliente-servidor |
| **Conexión** | Mensajes discretos | Conexión persistente bidireccional |
| **Persistencia** | Sí (opcional) | No (volátil) |
| **Routing** | Avanzado (exchanges) | Directo (sin routing) |
| **Consumidores** | Múltiples por queue | Múltiples conexiones al servidor |
| **Caso ideal** | Comunicación entre servicios | Apps web interactivas en tiempo real |

**Análisis**: RabbitMQ y WebSockets son complementarios. RabbitMQ maneja comunicación asíncrona entre microservicios backend, mientras que WebSockets proporciona comunicación en tiempo real con clientes frontend. Una arquitectura típica usa RabbitMQ internamente y WebSockets para push notifications al cliente.

#### RabbitMQ vs MQTT

| Aspecto | RabbitMQ | MQTT |
|---------|----------|------|
| **Protocolo** | AMQP (enterprise) | MQTT (ligero) |
| **Complejidad** | Alta (exchanges, bindings) | Baja (topics simples) |
| **Overhead** | Medio | Muy bajo |
| **Dispositivos** | Servidores, microservicios | IoT, dispositivos limitados |
| **Patrones** | Work queues, pub/sub, RPC | Pub/Sub puro |
| **QoS** | Acknowledgments explícitos | 3 niveles (0, 1, 2) |
| **Caso ideal** | Arquitecturas empresariales | IoT y dispositivos embebidos |

**Análisis**: RabbitMQ es más potente y flexible, diseñado para arquitecturas de microservicios complejas con múltiples patrones de mensajería. MQTT es más simple y ligero, optimizado para IoT y dispositivos con recursos limitados. Son complementarios: MQTT puede ingestar datos de dispositivos IoT que luego RabbitMQ procesa y distribuye a servicios backend.

#### RabbitMQ vs Apache Kafka

| Aspecto | RabbitMQ | Apache Kafka |
|---------|----------|--------------|
| **Propósito** | Message queuing | Event streaming |
| **Persistencia** | Mensajes se eliminan tras procesamiento | Log distribuido duradero |
| **Retención** | Hasta que se procesa | Días/semanas (configurable) |
| **Replay** | No | Sí (desde cualquier offset) |
| **Orden** | Por queue (FIFO) | Por partición (garantizado) |
| **Throughput** | Alto (decenas de miles/seg) | Muy alto (millones/seg) |
| **Escalabilidad** | Clustering + mirroring | Particionado masivo |
| **Caso ideal** | Task queues, microservicios | Event sourcing, big data |

**Análisis**: RabbitMQ es ideal para task queues y procesamiento de mensajes discretos donde cada mensaje se procesa una vez y se elimina. Kafka es ideal para event streaming donde los eventos se persisten indefinidamente y pueden reprocesarse múltiples veces. RabbitMQ es más simple de operar, Kafka es más potente para big data y event-driven architectures a gran escala.

### Posición en la Arquitectura de Sistemas

```
┌─────────────────────────────────────────────────────────────┐
│                    APLICACIONES FRONTEND                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Web App  │  │ Mobile   │  │ CLI Tool │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │ REST API    │ REST API    │ REST API
        │ + WebSocket │             │
┌───────▼─────────────▼─────────────▼─────────────────────────┐
│                    API GATEWAY / LOAD BALANCER                │
└───────┬─────────────────────────────┬───────────────────────┘
        │                             │
┌───────▼─────────────────────────────▼───────────────────────┐
│                    MICROSERVICIOS                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Order    │  │ Payment  │  │ Email    │                   │
│  │ Service  │  │ Service  │  │ Service  │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │ AMQP        │ AMQP        │ AMQP
┌───────▼─────────────▼─────────────▼─────────────────────────┐
│                    RABBITMQ BROKER                            │
│           Exchanges + Queues + Routing + Persistence          │
└───────┬─────────────────────────────┬───────────────────────┘
        │                             │
        │ AMQP (event streaming)      │ MQTT (IoT devices)
        │                             │
┌───────▼───────────────────┐  ┌──────▼────────────────────────┐
│   KAFKA (Big Data)        │  │   MQTT BROKER (IoT)           │
│   - Event sourcing        │  │   - Sensor data               │
│   - Analytics             │  │   - Device commands           │
└───────────────────────────┘  └───────────────────────────────┘
```

**RabbitMQ** opera en la capa de comunicación entre microservicios, mientras que WebSockets opera en la capa cliente-servidor, MQTT en la capa IoT, y Kafka en la capa de big data/analytics.

### Ventajas de RabbitMQ

1. **Flexibilidad**: Múltiples exchange types soportan diversos patrones de mensajería
2. **Confiabilidad**: Acknowledgments, persistence, y dead letter queues garantizan procesamiento
3. **Escalabilidad**: Clustering y mirroring para alta disponibilidad
4. **Ecosistema**: Cliente libraries para todos los lenguajes principales
5. **Management UI**: Interfaz web para monitoreo y debugging
6. **Madurez**: Proyecto estable con años de producción en empresas grandes

### Limitaciones de RabbitMQ

1. **Complejidad**: Configuración de exchanges/bindings puede ser confusa inicialmente
2. **No replay**: Mensajes se eliminan tras procesamiento (no hay historial)
3. **Throughput limitado**: Menos throughput que Kafka para volúmenes masivos
4. **Single queue ordering**: Orden garantizado solo dentro de una queue, no global
5. **Operaciones**: Clustering y alta disponibilidad requieren configuración cuidadosa

### Cuándo Usar RabbitMQ

**Casos ideales**:
- Arquitecturas de microservicios con comunicación asíncrona
- Task queues y background job processing
- Sistemas que requieren garantías de entrega y retry logic
- Routing complejo basado en tipo de mensaje o contenido
- Escenarios donde cada mensaje se procesa exactamente una vez

**Casos donde NO usar RabbitMQ**:
- Event sourcing o audit logs que requieren replay histórico (usar Kafka)
- Comunicación en tiempo real con clientes web (usar WebSockets)
- Dispositivos IoT con recursos limitados (usar MQTT)
- Big data streaming con millones de eventos por segundo (usar Kafka)
- Integraciones simples unidireccionales (usar Webhooks)

## 4. Implementación PoC

### Arquitectura de la Solución

Esta PoC implementa un **Sistema de Procesamiento de Órdenes con Microservicios** usando los tres tipos principales de exchanges de RabbitMQ:

```
┌─────────────────┐
│  React Frontend │
│  (Puerto 5173)  │
└────────┬────────┘
         │ REST API + WebSocket
┌────────▼────────┐
│  FastAPI Backend│         ┌──────────────────────────────────────┐
│  (Puerto 8000)  │         │         RABBITMQ BROKER              │
│                 │ ──────▶ │                                      │
│  Order Service  │ publish │  Exchanges:                          │
└─────────────────┘         │  - orders_direct (Direct)            │
                            │  - orders_notifications (Topic)      │
                            │  - orders_analytics (Fanout)         │
                            │                                      │
                            │  Queues:                             │
                            │  - payment_processing                │
                            │  - email_notifications               │
                            │  - sms_notifications                 │
                            │  - analytics_processing              │
                            └──────────┬───────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
            ┌───────▼──────┐  ┌────────▼───────┐  ┌──────▼──────┐
            │   Payment    │  │  Notification  │  │  Analytics  │
            │   Worker     │  │    Worker      │  │   Worker    │
            │  (Direct)    │  │   (Topic)      │  │  (Fanout)   │
            └──────────────┘  └────────────────┘  └─────────────┘
```

### Componentes del Backend (Python/FastAPI + aio-pika)

**Archivo**: `backend/main.py`

**Setup de RabbitMQ**:

```python
async def setup_rabbitmq():
    # Connect to RabbitMQ
    rabbitmq_connection = await aio_pika.connect_robust(
        f"amqp://{RABBITMQ_USER}:{RABBITMQ_PASS}@{RABBITMQ_HOST}:{RABBITMQ_PORT}/"
    )
    rabbitmq_channel = await rabbitmq_connection.channel()
    
    # Declare exchanges
    # 1. Direct exchange for payment processing
    await rabbitmq_channel.declare_exchange(
        'orders_direct',
        aio_pika.ExchangeType.DIRECT,
        durable=True
    )
    
    # 2. Topic exchange for notifications
    await rabbitmq_channel.declare_exchange(
        'orders_notifications',
        aio_pika.ExchangeType.TOPIC,
        durable=True
    )
    
    # 3. Fanout exchange for analytics
    await rabbitmq_channel.declare_exchange(
        'orders_analytics',
        aio_pika.ExchangeType.FANOUT,
        durable=True
    )
    
    # Declare and bind queues
    payment_queue = await rabbitmq_channel.declare_queue('payment_processing', durable=True)
    await payment_queue.bind('orders_direct', routing_key='payment')
    
    email_queue = await rabbitmq_channel.declare_queue('email_notifications', durable=True)
    await email_queue.bind('orders_notifications', routing_key='order.created')
    await email_queue.bind('orders_notifications', routing_key='order.paid')
    
    sms_queue = await rabbitmq_channel.declare_queue('sms_notifications', durable=True)
    await sms_queue.bind('orders_notifications', routing_key='order.paid')
    await sms_queue.bind('orders_notifications', routing_key='order.failed')
    
    analytics_queue = await rabbitmq_channel.declare_queue('analytics_processing', durable=True)
    await analytics_queue.bind('orders_analytics')
```

**Endpoint para Crear Orden**:

```python
@app.post("/api/orders")
async def create_order(order: OrderRequest):
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
    
    orders_db[order_id] = order_data
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
    
    await sio.emit('order_created', order_data)
    
    return OrderResponse(
        order_id=order_id,
        status='pending',
        message='Order created and queued for processing'
    )
```

**Endpoints REST API**:

1. **POST /api/orders**: Crea nueva orden y publica a los tres exchanges
2. **GET /api/orders**: Lista todas las órdenes
3. **GET /api/orders/{order_id}**: Obtiene orden específica
4. **POST /api/orders/{order_id}/status**: Actualiza estado (llamado por workers)
5. **GET /api/orders/{order_id}/history**: Historial de cambios de estado
6. **GET /api/stats**: Estadísticas de procesamiento

**Características Técnicas**:
- **aio-pika**: Cliente AMQP asíncrono para Python
- **Persistent messages**: `delivery_mode=PERSISTENT` sobrevive reinicios del broker
- **Durable queues**: Queues sobreviven reinicios del broker
- **WebSocket integration**: Notificaciones en tiempo real al frontend
- **In-memory storage**: Órdenes almacenadas en dict Python (para PoC)

### Worker Services

#### Payment Worker (`payment_worker.py`)

**Patrón**: Work Queue (competing consumers)

```python
async def main():
    connection = await aio_pika.connect_robust(...)
    
    async with connection:
        channel = await connection.channel()
        
        # Process only 1 message at a time
        await channel.set_qos(prefetch_count=1)
        
        queue = await channel.declare_queue('payment_processing', durable=True)
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    order_data = json.loads(message.body.decode())
                    await process_payment(order_data)
```

**Comportamiento**:
- Consume de queue `payment_processing`
- Simula procesamiento de pago (2-5 segundos)
- 90% success rate, 10% failure rate
- Actualiza estado de orden vía backend API
- Acknowledgment automático al completar procesamiento

#### Notification Worker (`notification_worker.py`)

**Patrón**: Topic Exchange (selective routing)

```python
async def email_worker():
    connection = await aio_pika.connect_robust(...)
    
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue('email_notifications', durable=True)
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    data = json.loads(message.body.decode())
                    routing_key = message.routing_key
                    await send_email_notification(routing_key, data)
```

**Comportamiento**:
- Email worker consume de `email_notifications` (binding: `order.created`, `order.paid`, `order.shipped`)
- SMS worker consume de `sms_notifications` (binding: `order.paid`, `order.failed`)
- Simula envío de notificaciones
- Routing key determina qué tipo de notificación enviar

#### Analytics Worker (`analytics_worker.py`)

**Patrón**: Fanout Exchange (broadcast)

```python
async def main():
    connection = await aio_pika.connect_robust(...)
    
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue('analytics_processing', durable=True)
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    order_data = json.loads(message.body.decode())
                    await process_analytics(order_data)
```

**Comportamiento**:
- Recibe copia de TODAS las órdenes (fanout exchange)
- Procesa datos para analytics (métricas, reportes)
- No afecta flujo principal de procesamiento

### Componentes del Frontend (React + Socket.IO + TanStack Query)

**Arquitectura de Componentes**:

```
App.jsx
├── OrderForm.jsx       # Formulario para crear órdenes
├── OrderStats.jsx      # Estadísticas de procesamiento
├── OrderList.jsx       # Lista de órdenes con estados
└── ActivityLog.jsx     # Log de actividad en tiempo real
```

**Integración con TanStack Query**:

```javascript
// Fetch all orders (polling every 3 seconds as fallback)
const { data: ordersData } = useQuery({
  queryKey: ['orders'],
  queryFn: async () => {
    const response = await fetch('/api/orders')
    return response.json()
  },
  refetchInterval: 3000
})

// Fetch stats (polling every 2 seconds)
const { data: statsData } = useQuery({
  queryKey: ['stats'],
  queryFn: async () => {
    const response = await fetch('/api/stats')
    return response.json()
  },
  refetchInterval: 2000
})

// Create order mutation
const createOrderMutation = useMutation({
  mutationFn: async (orderData) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    return response.json()
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }
})
```

**Sincronización WebSocket → TanStack Query**:

```javascript
useEffect(() => {
  // Initial orders load via WebSocket
  socket.on('initial_orders', (data) => {
    queryClient.setQueryData(['orders'], data)
  })

  // Real-time order creation
  socket.on('order_created', (order) => {
    queryClient.setQueryData(['orders'], (old) => {
      if (!old) return { orders: [order] }
      return {
        ...old,
        orders: [order, ...old.orders]
      }
    })
  })

  // Real-time order status updates
  socket.on('order_updated', (update) => {
    queryClient.setQueryData(['orders'], (old) => {
      if (!old) return old
      return {
        ...old,
        orders: old.orders.map(o => 
          o.order_id === update.order_id 
            ? { ...o, status: update.status, updated_at: update.timestamp }
            : o
        )
      }
    })
  })
}, [queryClient])
```

**Componente OrderForm**:
- Formulario con campos: customer name, email, items, total amount, payment method
- Al enviar, llama a `createOrderMutation.mutate()`
- Limpia campos después de creación exitosa

**Componente OrderList**:
- Tabla con todas las órdenes
- Columnas: Order ID, Customer, Items, Total, Status, Created
- Status badges con colores (pending=amarillo, paid=verde, failed=rojo)
- Actualización en tiempo real vía WebSocket

**Componente OrderStats**:
- Grid de tarjetas con estadísticas
- Total orders, pending, paid, failed, shipped
- Recent activity log
- Actualización cada 2 segundos vía polling

**Componente ActivityLog**:
- Lista de las últimas 50 actividades
- Muestra: tipo de evento, mensaje, timestamp
- Eventos: Order Created, Order Updated (con worker name)
- Actualización en tiempo real vía WebSocket

### Flujo de Datos Completo

**Escenario: Usuario Crea una Orden**

1. **Usuario completa formulario y hace click en "Create Order"**:
   - Frontend captura datos: customer name, email, items, amount, payment method

2. **Frontend envía POST request**:
   ```javascript
   createOrderMutation.mutate({
     customer_name: "John Doe",
     customer_email: "john@example.com",
     items: [{name: "Laptop", quantity: 1}],
     total_amount: 999.99,
     payment_method: "credit_card"
   })
   ```

3. **Backend recibe request y crea orden**:
   - Genera UUID para order_id
   - Almacena orden en memoria con status `pending`
   - Publica mensaje a tres exchanges:
     - `orders_direct` (routing key: `payment`) → queue `payment_processing`
     - `orders_notifications` (routing key: `order.created`) → queues `email_notifications`, `sms_notifications`
     - `orders_analytics` (fanout) → queue `analytics_processing`
   - Emite evento WebSocket `order_created`

4. **Payment Worker procesa mensaje**:
   - Recibe mensaje de queue `payment_processing`
   - Simula procesamiento de pago (2-5 segundos)
   - 90% éxito → actualiza status a `paid`
   - 10% fallo → actualiza status a `failed`
   - Llama a backend API: `POST /api/orders/{id}/status`

5. **Backend actualiza status y notifica**:
   - Actualiza orden en memoria
   - Publica a `orders_notifications` (routing key: `order.paid` o `order.failed`)
   - Emite evento WebSocket `order_updated`

6. **Notification Workers procesan mensajes**:
   - Email worker recibe mensaje con routing key `order.paid`
   - SMS worker recibe mensaje con routing key `order.paid`
   - Simulan envío de notificaciones

7. **Analytics Worker procesa mensaje**:
   - Recibe copia de orden original (fanout)
   - Procesa datos para analytics
   - No afecta flujo principal

8. **Frontend actualiza UI en tiempo real**:
   - Recibe evento `order_updated` vía WebSocket
   - Actualiza caché de TanStack Query
   - OrderList muestra nuevo status
   - OrderStats actualiza contadores
   - ActivityLog muestra actividad del worker

### Configuración de Infraestructura

**Docker Compose** (`docker-compose.yml`):

```yaml
version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"    # AMQP
      - "15672:15672"  # Management UI
    environment:
      - RABBITMQ_DEFAULT_USER=guest
      - RABBITMQ_DEFAULT_PASS=guest

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - RABBITMQ_HOST=rabbitmq
    depends_on:
      - rabbitmq

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - backend

  payment-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    command: python payment_worker.py
    environment:
      - RABBITMQ_HOST=rabbitmq
    depends_on:
      - rabbitmq

  notification-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    command: python notification_worker.py
    environment:
      - RABBITMQ_HOST=rabbitmq
    depends_on:
      - rabbitmq

  analytics-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    command: python analytics_worker.py
    environment:
      - RABBITMQ_HOST=rabbitmq
    depends_on:
      - rabbitmq
```

**Nota**: RabbitMQ Management UI disponible en http://localhost:15672 (user: guest, pass: guest)

### Instrucciones de Ejecución

**Modo Desarrollo (Local)**:

```bash
# Terminal 1: RabbitMQ broker (Docker)
cd rabbitmq
docker-compose up rabbitmq -d

# Terminal 2: Backend
cd rabbitmq/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 3: Payment Worker
cd rabbitmq/backend
source venv/bin/activate
python payment_worker.py

# Terminal 4: Notification Worker
cd rabbitmq/backend
source venv/bin/activate
python notification_worker.py

# Terminal 5: Analytics Worker
cd rabbitmq/backend
source venv/bin/activate
python analytics_worker.py

# Terminal 6: Frontend
cd rabbitmq/frontend
npm install
npm run dev
```

**Modo Producción (Docker)**:

```bash
cd rabbitmq
docker-compose up --build
```

**Acceso**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- RabbitMQ Management: http://localhost:15672 (guest/guest)
- AMQP: localhost:5672

### Pruebas de Funcionalidad

**Test 1: Crear Orden y Ver Procesamiento**
1. Abrir frontend en navegador
2. Crear orden con datos de prueba
3. Observar Activity Log:
   - "Order Created: Order abc12345... created"
   - Esperar 2-5 segundos
   - "Order Updated: Order abc12345... → paid (payment-worker)"
   - "Order Updated: Order abc12345... → paid (notification-worker)"
4. Verificar Order List muestra status "paid" o "failed"
5. Verificar Order Stats actualiza contadores

**Test 2: Múltiples Órdenes Simultáneas**
1. Crear 5 órdenes rápidamente
2. Observar que payment worker procesa una por una (prefetch=1)
3. Verificar que todas las órdenes se procesan eventualmente
4. Observar queue depth en RabbitMQ Management UI

**Test 3: RabbitMQ Management UI**
1. Abrir http://localhost:15672
2. Login: guest / guest
3. Verificar exchanges creados:
   - `orders_direct` (Direct)
   - `orders_notifications` (Topic)
   - `orders_analytics` (Fanout)
4. Verificar queues creadas:
   - `payment_processing`
   - `email_notifications`
   - `sms_notifications`
   - `analytics_processing`
5. Observar message rates y queue depths en tiempo real

**Test 4: Worker Failure Recovery**
1. Detener payment worker (Ctrl+C)
2. Crear varias órdenes
3. Verificar que mensajes se acumulan en queue `payment_processing`
4. Reiniciar payment worker
5. Verificar que worker procesa mensajes acumulados

### Limitaciones de la PoC

1. **Almacenamiento In-Memory**: Órdenes se pierden al reiniciar backend
2. **Sin Dead Letter Queue**: Mensajes fallidos no se reintentan automáticamente
3. **Sin Autenticación**: RabbitMQ usa credenciales por defecto (guest/guest)
4. **Single Node**: No implementa clustering de RabbitMQ
5. **Sin Rate Limiting**: No limita cantidad de órdenes por segundo

### Extensiones Posibles

1. **Base de Datos**: Persistir órdenes en PostgreSQL/MongoDB
2. **Dead Letter Exchange**: Configurar retry logic con exponential backoff
3. **Autenticación RabbitMQ**: Configurar usuarios y permisos
4. **RabbitMQ Clustering**: Alta disponibilidad con mirrored queues
5. **Message Priority**: Priorizar órdenes urgentes
6. **Batch Processing**: Workers procesan múltiples mensajes a la vez
7. **Circuit Breaker**: Proteger servicios downstream de cascading failures
8. **Distributed Tracing**: Rastrear mensajes a través de múltiples servicios

---

**Siguiente Nivel**: Apache Kafka - Event streaming y procesamiento de big data
