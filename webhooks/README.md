# Webhooks - Proof of Concept

## 1. Definición

**Webhooks** son un mecanismo de comunicación asíncrona basado en HTTP donde un sistema (proveedor) envía automáticamente notificaciones a otro sistema (consumidor) cuando ocurren eventos específicos. A diferencia de las APIs tradicionales que requieren polling (consultas periódicas), los webhooks implementan un patrón "push" donde el servidor inicia la comunicación.

### Características Fundamentales

- **Comunicación Unidireccional**: El proveedor envía datos al consumidor mediante solicitudes HTTP POST
- **Event-Driven**: Se activan exclusivamente cuando ocurren eventos predefinidos en el sistema proveedor
- **Asíncronos**: No bloquean el procesamiento del sistema proveedor; las notificaciones se envían de forma independiente
- **Basados en HTTP**: Utilizan el protocolo HTTP estándar, facilitando la integración entre sistemas heterogéneos
- **Payload Estructurado**: Transportan datos en formato JSON o XML que describen el evento ocurrido

### Arquitectura de Funcionamiento

1. **Registro**: El consumidor registra una URL (endpoint) en el proveedor para recibir notificaciones
2. **Evento**: Ocurre un evento en el sistema proveedor (ej: nuevo candidato aplica)
3. **Notificación**: El proveedor envía una solicitud HTTP POST al endpoint registrado con los datos del evento
4. **Procesamiento**: El consumidor recibe y procesa la notificación
5. **Confirmación**: El consumidor responde con código HTTP 2xx para confirmar la recepción

### Comparación con Polling

| Característica | Webhooks | Polling |
|----------------|----------|---------|
| Latencia | Baja (tiempo real) | Alta (depende del intervalo) |
| Carga del servidor | Mínima | Alta (consultas innecesarias) |
| Complejidad | Media (requiere endpoint público) | Baja (solo cliente) |
| Confiabilidad | Alta (con reintentos) | Media (puede perder eventos) |

## 2. Casos de Uso

### Caso 1: Notificación de Nuevas Aplicaciones en ATS

**Contexto**: Un sistema de Applicant Tracking System (ATS) necesita notificar a servicios externos cuando un candidato aplica a una posición.

**Implementación**:
- El ATS actúa como proveedor de webhooks
- Los servicios de reclutamiento externos registran sus endpoints
- Cuando un candidato completa una aplicación, el ATS envía webhooks con:
  - Información del candidato (nombre, email, CV)
  - Posición aplicada
  - Timestamp de la aplicación
- Los servicios externos actualizan sus bases de datos automáticamente

**Beneficio**: Elimina la necesidad de que los servicios externos consulten constantemente el ATS, reduciendo la carga del servidor y mejorando la latencia de actualización.

### Caso 2: Sincronización con Plataformas de Nómina

**Contexto**: Cuando un candidato es contratado, el ATS debe notificar al sistema de nómina para iniciar el proceso de onboarding.

**Implementación**:
- El sistema de nómina se suscribe al evento `candidate.hired`
- Al cambiar el estado del candidato a "Contratado", el ATS envía un webhook con:
  - Datos personales del empleado
  - Posición y departamento
  - Fecha de inicio
  - Salario acordado
- El sistema de nómina crea automáticamente el registro del empleado

**Beneficio**: Automatiza el flujo entre reclutamiento y recursos humanos, eliminando entrada manual de datos y errores de transcripción.

### Caso 3: Integración con Sistemas de Background Check

**Contexto**: Servicios de verificación de antecedentes necesitan notificar al ATS cuando completan sus revisiones.

**Implementación**:
- El ATS registra un webhook endpoint en el servicio de background check
- El servicio envía webhooks con eventos como:
  - `verification.completed`: Verificación completada
  - `verification.failed`: Problema encontrado
  - `verification.pending`: Requiere información adicional
- El ATS actualiza el estado del candidato y notifica a los reclutadores

**Beneficio**: Permite seguimiento en tiempo real del estado de verificaciones sin consultar manualmente el sistema externo.

### Caso 4: Notificaciones de Entrevistas Programadas

**Contexto**: Cuando se programa una entrevista, múltiples sistemas deben ser notificados (calendario, sistema de videoconferencia, notificaciones).

**Implementación**:
- El ATS dispara webhooks al evento `interview.scheduled`
- Sistemas receptores:
  - **Calendario corporativo**: Crea el evento automáticamente
  - **Sistema de videoconferencia**: Genera el enlace de reunión
  - **Sistema de notificaciones**: Envía emails al candidato y entrevistadores
  - **Sistema de salas**: Reserva la sala de conferencias física

**Beneficio**: Coordina múltiples sistemas automáticamente desde un solo evento, asegurando consistencia y reduciendo trabajo manual.

### Caso 5: Webhooks para Métricas y Analytics

**Contexto**: Un sistema de analytics necesita recibir eventos del ATS para generar reportes en tiempo real sobre el proceso de reclutamiento.

**Implementación**:
- El sistema de analytics se suscribe a todos los eventos del ATS
- Recibe webhooks para:
  - Aplicaciones recibidas
  - Cambios de estado
  - Entrevistas programadas/completadas
  - Ofertas enviadas/aceptadas/rechazadas
- Procesa los eventos para calcular:
  - Tiempo promedio de contratación
  - Tasas de conversión por etapa
  - Fuentes de candidatos más efectivas
  - Cuellos de botella en el proceso

**Beneficio**: Permite dashboards en tiempo real sin necesidad de consultar constantemente la base de datos del ATS, reduciendo carga y mejorando la frescura de los datos.

## 3. Análisis Arquitectónico

### Relación con Otras Tecnologías

Webhooks representan el nivel más básico de comunicación asíncrona en esta serie de PoCs. Su análisis comparativo con las otras tecnologías revela un espectro de complejidad y capacidades:

#### Webhooks vs WebSockets/Socket.IO

| Aspecto | Webhooks | WebSockets |
|---------|----------|------------|
| **Dirección** | Unidireccional (proveedor → consumidor) | Bidireccional (cliente ↔ servidor) |
| **Conexión** | Stateless (HTTP request/response) | Stateful (conexión persistente) |
| **Latencia** | Segundos (overhead HTTP) | Milisegundos (conexión abierta) |
| **Complejidad** | Baja (solo HTTP) | Media (manejo de conexiones) |
| **Escalabilidad** | Alta (sin estado) | Media (requiere balanceo sticky) |
| **Caso de uso** | Notificaciones entre servicios | Chat, colaboración en tiempo real |

**Análisis**: Webhooks son ideales para integración entre sistemas independientes donde la latencia de segundos es aceptable. WebSockets son necesarios cuando se requiere comunicación bidireccional en tiempo real, como en aplicaciones de chat o edición colaborativa.

#### Webhooks vs MQTT

| Aspecto | Webhooks | MQTT |
|---------|----------|------|
| **Protocolo** | HTTP | MQTT (ligero, binario) |
| **Modelo** | Push directo | Pub/Sub con broker |
| **Overhead** | Alto (headers HTTP) | Bajo (2 bytes header) |
| **Conectividad** | Requiere IP pública | Funciona detrás de NAT |
| **QoS** | Ninguno (HTTP retry) | 3 niveles de QoS |
| **Dispositivos** | Servidores | IoT, móviles, embebidos |

**Análisis**: Webhooks son adecuados para integraciones servidor-servidor con infraestructura web estándar. MQTT es superior para IoT y dispositivos con recursos limitados o conectividad intermitente, gracias a su protocolo ligero y modelo pub/sub con broker.

#### Webhooks vs RabbitMQ

| Aspecto | Webhooks | RabbitMQ |
|---------|----------|----------|
| **Arquitectura** | Directa (P2P) | Mediada (broker) |
| **Garantías** | Best-effort | Confirmaciones, persistencia |
| **Routing** | Simple (URL fija) | Avanzado (exchanges, queues) |
| **Backpressure** | Ninguno | Control de flujo |
| **Complejidad** | Muy baja | Alta (configuración broker) |
| **Escalabilidad** | Limitada (acoplamiento) | Alta (desacoplamiento) |

**Análisis**: Webhooks son simples pero crean acoplamiento directo entre servicios. RabbitMQ introduce un broker que desacopla productores y consumidores, permitiendo patrones avanzados como work queues, pub/sub, y routing complejo con garantías de entrega.

#### Webhooks vs Apache Kafka

| Aspecto | Webhooks | Apache Kafka |
|---------|----------|--------------|
| **Modelo** | Eventos discretos | Stream de eventos |
| **Persistencia** | Ninguna | Duradera (log distribuido) |
| **Replay** | No posible | Sí (desde cualquier offset) |
| **Throughput** | Bajo (HTTP) | Muy alto (millones/seg) |
| **Orden** | No garantizado | Garantizado por partición |
| **Escalabilidad** | Limitada | Masiva (particionado) |

**Análisis**: Webhooks son adecuados para notificaciones simples donde la pérdida de eventos es tolerable. Kafka es una plataforma de streaming distribuida que permite procesamiento de eventos a escala masiva con persistencia, replay, y garantías de orden, ideal para arquitecturas event-driven complejas.

### Posición en el Espectro de Complejidad

```
Simplicidad ←─────────────────────────────────────────────→ Complejidad
Webhooks → WebSockets → MQTT → RabbitMQ → Apache Kafka
   ↓           ↓          ↓         ↓            ↓
 HTTP      Conexión    Broker    Message     Event
 Request   Persistente  Ligero    Broker     Streaming
```

**Webhooks** ocupan el extremo más simple del espectro:
- ✅ Fácil implementación y debugging
- ✅ No requiere infraestructura adicional
- ❌ Sin garantías de entrega robustas
- ❌ Acoplamiento directo entre servicios
- ❌ No soporta patrones avanzados (fan-out, work queues)

### Consideraciones Arquitectónicas

**Ventajas de Webhooks**:
1. **Simplicidad**: Solo requiere endpoints HTTP estándar
2. **Ubicuidad**: Cualquier lenguaje/framework soporta HTTP
3. **Firewall-friendly**: Usa puertos HTTP estándar (80/443)
4. **Costo**: Sin infraestructura adicional

**Desventajas de Webhooks**:
1. **Confiabilidad**: Sin reintentos automáticos (debe implementarse)
2. **Seguridad**: Requiere validación de firma o autenticación
3. **Escalabilidad**: Acoplamiento directo limita escalabilidad
4. **Debugging**: Difícil probar sin herramientas como ngrok
5. **NAT/Firewalls**: El consumidor debe tener IP pública

**Cuándo usar Webhooks**:
- Integraciones simples entre servicios
- Notificaciones donde la pérdida ocasional es tolerable
- Sistemas con recursos limitados para infraestructura adicional
- Prototipos y MVPs donde la simplicidad es prioritaria

**Cuándo NO usar Webhooks**:
- Se requieren garantías de entrega fuertes (usar RabbitMQ/Kafka)
- Comunicación bidireccional en tiempo real (usar WebSockets)
- Dispositivos IoT con conectividad limitada (usar MQTT)
- Procesamiento de eventos a gran escala (usar Kafka)

## 4. Implementación PoC

### Arquitectura de la Solución

Esta PoC implementa un sistema de webhooks para un ATS (Applicant Tracking System) con los siguientes componentes:

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │  HTTP   │                  │  HTTP   │                 │
│  React Frontend │ ──────→ │  FastAPI Backend │ ──────→ │  Webhook Events │
│  (Puerto 5173)  │ ←────── │  (Puerto 8000)   │ ←────── │  (In-Memory)    │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
     TanStack Query              REST API                   Event Storage
     + Components                + Webhook                  + Subscriptions
                                  Management
```

### Componentes del Backend (Python/FastAPI)

**Archivo**: `backend/main.py`

**Endpoints Implementados**:

1. **POST /api/webhooks/trigger**
   - Dispara un evento webhook genérico
   - Genera UUID único para cada evento
   - Almacena el evento con timestamp
   - Retorna confirmación con event_id

2. **GET /api/webhooks/events**
   - Lista todos los eventos webhook recibidos
   - Utilizado por el frontend para mostrar historial

3. **POST /api/webhooks/subscribe**
   - Registra una suscripción a webhooks
   - Almacena URL del endpoint y eventos de interés
   - Simula el registro de consumidores

4. **POST /api/webhooks/ats/candidate-update**
   - Endpoint específico para actualización de candidatos
   - Ejemplo de webhook especializado para ATS

5. **DELETE /api/webhooks/events/clear**
   - Limpia todos los eventos (para testing)

**Modelos de Datos**:

```python
class WebhookEvent(BaseModel):
    event_type: str           # Tipo de evento (ej: "candidate.applied")
    payload: dict             # Datos del evento
    timestamp: str            # Timestamp ISO 8601
    event_id: str             # UUID único

class WebhookSubscription(BaseModel):
    url: str                  # Endpoint del consumidor
    events: List[str]         # Lista de eventos suscritos
```

**Características Técnicas**:
- **CORS habilitado**: Permite conexiones desde el frontend React
- **Almacenamiento in-memory**: Listas Python para eventos y suscripciones
- **Async/await**: FastAPI maneja solicitudes de forma asíncrona nativamente
- **UUID generation**: Cada evento tiene identificador único
- **Timestamp automático**: Se agrega al recibir el evento

### Componentes del Frontend (React + TanStack Query)

**Arquitectura de Componentes**:

```
App.jsx
├── WebhookTrigger.jsx      # Formulario para disparar eventos
├── SubscriptionManager.jsx # Gestión de suscripciones
└── EventList.jsx           # Visualización de eventos
```

**Integración con TanStack Query**:

TanStack Query gestiona el estado asíncrono del frontend mediante queries y mutations:

**Queries (Lectura de Datos)**:

```javascript
// Consulta de eventos webhook (polling cada 3 segundos)
const { data: eventsData } = useQuery({
  queryKey: ['webhookEvents'],
  queryFn: async () => {
    const response = await axios.get('/api/webhooks/events')
    return response.data
  },
  refetchInterval: 3000  // Polling automático
})

// Consulta de suscripciones activas
const { data: subsData } = useQuery({
  queryKey: ['webhookSubscriptions'],
  queryFn: async () => {
    const response = await axios.get('/api/webhooks/subscriptions')
    return response.data
  }
})
```

**Mutations (Escritura de Datos)**:

```javascript
// Mutation para disparar webhook
const triggerMutation = useMutation({
  mutationFn: async (eventData) => {
    const response = await axios.post('/api/webhooks/trigger', eventData)
    return response.data
  },
  onSuccess: () => {
    // Invalida la caché para refrescar eventos
    queryClient.invalidateQueries({ queryKey: ['webhookEvents'] })
  }
})

// Mutation para registrar suscripción
const subscribeMutation = useMutation({
  mutationFn: async (subscriptionData) => {
    const response = await axios.post('/api/webhooks/subscribe', subscriptionData)
    return response.data
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['webhookSubscriptions'] })
  }
})
```

**Componente WebhookTrigger**:
- Formulario con campos específicos para ATS
- Selector de tipo de evento (5 tipos predefinidos)
- Campos para datos del candidato (nombre, email, estado)
- Dispara mutation al enviar formulario
- Reset de campos después de envío exitoso

**Componente EventList**:
- Muestra todos los eventos webhook recibidos
- Actualización automática vía polling (3 segundos)
- Muestra detalles del payload de cada evento
- Botón para limpiar eventos (llama a mutation DELETE)
- Estado vacío cuando no hay eventos

**Componente SubscriptionManager**:
- Formulario para registrar endpoint URL
- Checkboxes para seleccionar eventos de interés
- Lista de suscripciones activas
- Validación de URL y selección de eventos

### Flujo de Datos Completo

**Escenario: Disparar Webhook de Candidato**

1. **Usuario interactúa con WebhookTrigger**:
   - Selecciona tipo de evento: "candidate.applied"
   - Ingresa nombre: "María García"
   - Ingresa email: "maria.garcia@email.com"
   - Ingresa estado: "En revisión técnica"

2. **Frontend envía mutation**:
   ```javascript
   triggerMutation.mutate({
     event_type: "candidate.applied",
     payload: {
       candidate_name: "María García",
       candidate_email: "maria.garcia@email.com",
       status: "En revisión técnica",
       application_date: "2024-01-15T10:30:00Z"
     }
   })
   ```

3. **Backend procesa solicitud**:
   - Genera UUID: `550e8400-e29b-41d4-a716-446655440000`
   - Agrega timestamp: `2024-01-15T10:30:00.123456`
   - Almacena evento en lista `webhook_events`
   - Retorna: `{"status": "success", "event_id": "550e8400..."}`

4. **TanStack Query invalida caché**:
   - `queryClient.invalidateQueries(['webhookEvents'])`
   - Marca query como stale
   - Trigger refetch automático

5. **EventList actualiza UI**:
   - Polling detecta nuevo evento (próximo intervalo de 3s)
   - Renderiza nueva tarjeta con datos del candidato
   - Muestra event_id y timestamp formateado

### Configuración de Infraestructura

**Docker Compose** (`docker-compose.yml`):

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
  
  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - backend
```

**Nota**: A diferencia de otras tecnologías en esta serie (MQTT, RabbitMQ, Kafka), Webhooks no requiere infraestructura externa como message brokers. Solo necesita los servicios de aplicación (backend + frontend).

### Instrucciones de Ejecución

**Modo Desarrollo (Local)**:

```bash
# Terminal 1: Backend
cd webhooks/backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd webhooks/frontend
npm install
npm run dev
```

**Modo Producción (Docker)**:

```bash
cd webhooks
docker-compose up --build
```

**Acceso**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Documentación API: http://localhost:8000/docs

### Pruebas de Funcionalidad

**Test 1: Disparar Evento Webhook**
1. Abrir frontend en navegador
2. Seleccionar tipo de evento
3. Completar formulario con datos del candidato
4. Click en "Disparar Webhook"
5. Verificar evento aparece en lista (máximo 3 segundos)

**Test 2: Registrar Suscripción**
1. Ingresar URL de endpoint (ej: `http://localhost:8080/webhook`)
2. Seleccionar eventos de interés
3. Click en "Registrar Suscripción"
4. Verificar suscripción aparece en lista

**Test 3: Limpiar Eventos**
1. Disparar varios eventos
2. Click en "Limpiar Eventos"
3. Verificar lista queda vacía

### Limitaciones de la PoC

1. **Almacenamiento In-Memory**: Los eventos se pierden al reiniciar el servidor
2. **Sin Reintentos**: No implementa lógica de reintentos para webhooks fallidos
3. **Sin Validación de Firma**: No valida autenticidad de webhooks recibidos
4. **Sin Rate Limiting**: No limita cantidad de webhooks por segundo
5. **Sin Persistencia**: Suscripciones y eventos no se guardan en base de datos

### Extensiones Posibles

1. **Base de Datos**: Persistir eventos y suscripciones en PostgreSQL/MySQL
2. **Reintentos con Exponential Backoff**: Reintentar webhooks fallidos
3. **Validación HMAC**: Firmar webhooks con secreto compartido
4. **Queue de Webhooks**: Usar Redis/Celery para procesamiento asíncrono
5. **Dashboard de Entregas**: Mostrar estado de entrega de cada webhook
6. **Webhook Testing**: Integrar con RequestBin o ngrok para pruebas

---

**Siguiente Nivel**: WebSockets & Socket.IO - Comunicación bidireccional en tiempo real para aplicaciones interactivas
 tiempo real
