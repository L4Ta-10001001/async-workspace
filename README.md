# WebSockets & Socket.IO - Proof of Concept

## 1. Definición

**WebSockets** son un protocolo de comunicación que proporciona canales de comunicación bidireccional y full-duplex sobre una única conexión TCP persistente. A diferencia del modelo HTTP request/response tradicional, WebSockets permiten que tanto el cliente como el servidor envíen datos en cualquier momento sin necesidad de establecer nuevas conexiones.

**Socket.IO** es una biblioteca JavaScript que abstrae y simplifica el uso de WebSockets, proporcionando fallback automático a técnicas como long-polling cuando WebSockets no están disponibles, además de funcionalidades adicionales como rooms, namespaces y reconexión automática.

### Características Fundamentales

- **Comunicación Bidireccional**: Tanto cliente como servidor pueden iniciar el envío de datos en cualquier momento
- **Conexión Persistente**: Una vez establecida, la conexión permanece abierta durante toda la sesión
- **Baja Latencia**: Elimina el overhead de establecer nuevas conexiones HTTP para cada intercambio de datos
- **Full-Duplex**: Los datos fluyen simultáneamente en ambas direcciones sin bloquearse mutuamente
- **Event-Driven**: La comunicación se basa en eventos emitidos y escuchados por ambas partes

### Arquitectura de Funcionamiento

1. **Handshake HTTP**: La conexión WebSocket comienza con un handshake HTTP Upgrade request
2. **Protocol Switch**: El servidor acepta y cambia el protocolo de HTTP a WebSocket
3. **Conexión Persistente**: Se establece un canal TCP bidireccional persistente
4. **Intercambio de Mensajes**: Cliente y servidor envían y reciben mensajes en tiempo real
5. **Cierre**: Cualquiera de las partes puede cerrar la conexión de manera controlada

### Comparación con Polling y Long-Polling

| Característica | WebSockets | HTTP Polling | Long-Polling |
|----------------|------------|--------------|--------------|
| Conexión | Persistente | Múltiples conexiones | Conexiones repetidas |
| Latencia | Muy baja | Alta | Media |
| Overhead | Mínimo | Alto (headers HTTP) | Medio |
| Bidireccional | Sí | No | No |
| Escalabilidad | Alta | Baja | Media |
| Complejidad | Media | Baja | Media |

### Ventajas de Socket.IO sobre WebSockets Nativos

- **Fallback Automático**: Cambia a long-polling si WebSocket no está disponible
- **Reconexión Automática**: Intenta reconectar automáticamente si se pierde la conexión
- **Rooms y Namespaces**: Permite agrupar conexiones y crear canales lógicos
- **Broadcasting**: Facilita el envío de mensajes a múltiples clientes o grupos específicos
- **Acknowledge Callbacks**: Permite confirmar la recepción de mensajes
