function EventList({ events, isLoading, onClear }) {
  if (isLoading) {
    return (
      <section>
        <h2>Eventos Webhook Recibidos</h2>
        <div className="loading">Cargando eventos...</div>
      </section>
    )
  }

  return (
    <section>
      <h2>Eventos Webhook Recibidos</h2>
      <p>Lista de todos los eventos webhook procesados por el servidor.</p>
      
      {events.length > 0 && (
        <button onClick={onClear} style={{ marginBottom: '1rem', background: '#dc3545' }}>
          Limpiar Eventos
        </button>
      )}

      {events.length === 0 ? (
        <div className="empty-state">
          No hay eventos registrados. Dispara un webhook para comenzar.
        </div>
      ) : (
        <ul className="event-list">
          {events.map((event, index) => (
            <li key={event.event_id || index} className="event-item">
              <strong>{event.event_type}</strong>
              <div>
                <p><strong>Candidato:</strong> {event.payload?.candidate_name || 'N/A'}</p>
                <p><strong>Email:</strong> {event.payload?.candidate_email || 'N/A'}</p>
                {event.payload?.status && (
                  <p><strong>Estado:</strong> {event.payload.status}</p>
                )}
                {event.payload?.application_date && (
                  <p><strong>Fecha:</strong> {new Date(event.payload.application_date).toLocaleString()}</p>
                )}
              </div>
              <small>
                Event ID: {event.event_id} | 
                Timestamp: {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
              </small>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default EventList
