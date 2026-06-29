# Async Communication Patterns - Proof of Concepts

Este repositorio contiene 5 implementaciones independientes de tecnologías de comunicación asíncrona, cada una en su propia rama.

## Estructura del Repositorio

El repositorio utiliza un modelo de ramas donde cada tecnología tiene su propia rama aislada con su implementación completa:

- **`webhooks`** - Webhooks HTTP
- **`websockets`** - WebSockets y Socket.IO
- **`mqtt`** - MQTT (Mosquitto)
- **`rabbitmq`** - RabbitMQ
- **`kafka`** - Apache Kafka

## Tecnologías Implementadas

### 1. Webhooks (rama: `webhooks`)
**Definición**: Patrón de comunicación HTTP donde un sistema envía notificaciones a otro mediante solicitudes POST cuando ocurren eventos específicos.

**Proyecto**: Pasarela de pagos y notificaciones de GitHub
- Backend: FastAPI
- Frontend: React + TanStack Query
- Escenario: Procesamiento de pagos y webhooks de repositorios Git

**Ver implementación**: `git checkout webhooks`

---

### 2. WebSockets & Socket.IO (rama: `websockets`)
**Definición**: Protocolo de comunicación bidireccional persistente que permite comunicación en tiempo real entre cliente y servidor.

**Proyecto**: Dashboard colaborativo de tareas
- Backend: FastAPI + Socket.IO
- Frontend: React + Socket.IO Client + TanStack Query
- Escenario: Tablero Kanban con actualizaciones en tiempo real y sincronización multi-usuario

**Ver implementación**: `git checkout websockets`

---

### 3. MQTT (rama: `mqtt`)
**Definición**: Protocolo de mensajería ligero basado en publicación/suscripción, diseñado para dispositivos IoT y redes con ancho de banda limitado.

**Proyecto**: Dashboard de monitoreo de sensores IoT
- Backend: FastAPI + Paho MQTT
- Frontend: React + TanStack Query
- Broker: Eclipse Mosquitto
- Escenario: Monitoreo en tiempo real de sensores de temperatura, humedad y presión

**Ver implementación**: `git checkout mqtt`

---

### 4. RabbitMQ (rama: `rabbitmq`)
**Definición**: Message broker que implementa el protocolo AMQP, permitiendo comunicación asíncrona entre microservicios mediante colas de mensajes.

**Proyecto**: Sistema de procesamiento de órdenes
- Backend: FastAPI + Pika
- Frontend: React + TanStack Query
- Workers: Payment Worker, Notification Worker, Analytics Worker
- Escenario: Pipeline de procesamiento de órdenes con múltiples consumidores

**Ver implementación**: `git checkout rabbitmq`

---

### 5. Apache Kafka (rama: `kafka`)
**Definición**: Plataforma distribuida de streaming de eventos que permite publicar, suscribirse, almacenar y procesar flujos de eventos en tiempo real.

**Proyecto**: Plataforma de streaming de eventos y analytics
- Backend: FastAPI + Confluent Kafka
- Frontend: React + TanStack Query
- Escenario: Ingesta y procesamiento de eventos de usuario con análisis en tiempo real

**Ver implementación**: `git checkout kafka`

---

## Stack Tecnológico Común

Todas las implementaciones comparten:

- **Backend**: Python + FastAPI
- **Frontend**: React + JavaScript
- **State Management**: TanStack Query
- **Infraestructura**: Docker + Docker Compose
- **Documentación**: README.md académico con casos de uso reales

## Cómo Usar

1. **Seleccionar la tecnología a explorar**:
   ```bash
   git checkout <nombre-rama>
   ```

2. **Leer la documentación**:
   Cada rama contiene un `README.md` detallado con:
   - Definición de la tecnología
   - 5 casos de uso reales de ingeniería web
   - Análisis arquitectónico comparativo
   - Instrucciones de implementación

3. **Ejecutar el proyecto**:
   ```bash
   docker-compose up --build
   ```

4. **Acceder a la aplicación**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Documentación API: http://localhost:8000/docs

## Objetivo

Este repositorio sirve como material de estudio para comprender las diferencias, ventajas y casos de uso de cada tecnología de comunicación asíncrona en el contexto de desarrollo web moderno.

Cada implementación es independiente y autocontenida, permitiendo estudiar cada tecnología de forma aislada.
