import { useState } from 'react'

function SubscriptionManager({ onSubscribe, isLoading, subscriptions, isLoadingSubs }) {
  const [url, setUrl] = useState('http://localhost:8080/webhook-receiver')
  const [selectedEvents, setSelectedEvents] = useState([])

  const availableEvents = [
    'candidate.applied',
    'candidate.interview.scheduled',
    'candidate.status.updated',
    'candidate.offer.sent',
    'candidate.rejected'
  ]

  const handleEventToggle = (event) => {
    setSelectedEvents(prev => 
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const subscriptionData = {
      url: url,
      events: selectedEvents
    }

    onSubscribe(subscriptionData)
    setUrl('')
    setSelectedEvents([])
  }

  return (
    <section>
      <h2>Gestión de Suscripciones</h2>
      <p>Registra endpoints para recibir notificaciones webhook.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>URL del Endpoint</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tu-servicio.com/webhook"
            required
          />
        </div>

        <div className="form-group">
          <label>Eventos a Suscribirse</label>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {availableEvents.map(event => (
              <label key={event} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={() => handleEventToggle(event)}
                  style={{ width: 'auto', margin: 0 }}
                />
                {event}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isLoading || selectedEvents.length === 0}>
          {isLoading ? 'Registrando...' : 'Registrar Suscripción'}
        </button>
      </form>

      {isLoadingSubs ? (
        <div className="loading">Cargando suscripciones...</div>
      ) : subscriptions.length > 0 ? (
        <div style={{ marginTop: '2rem' }}>
          <h3>Suscripciones Activas</h3>
          <ul className="event-list">
            {subscriptions.map((sub, index) => (
              <li key={index} className="event-item">
                <strong>Endpoint:</strong> {sub.url}
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Eventos:</strong>
                  <ul style={{ marginTop: '0.25rem', marginLeft: '1rem' }}>
                    {sub.events.map(event => (
                      <li key={event}>{event}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: '2rem' }}>
          No hay suscripciones registradas.
        </div>
      )}
    </section>
  )
}

export default SubscriptionManager
