import { useState } from 'react'

function WebhookTrigger({ onTrigger, isLoading }) {
  const [eventType, setEventType] = useState('candidate.applied')
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [status, setStatus] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const eventData = {
      event_type: eventType,
      payload: {
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        status: status,
        application_date: new Date().toISOString()
      }
    }

    onTrigger(eventData)
    setCandidateName('')
    setCandidateEmail('')
    setStatus('')
  }

  return (
    <section>
      <h2>Disparar Evento Webhook</h2>
      <p>Simula un evento de sistemas externos (pasarela de pagos, e-commerce, GitHub) que dispara un webhook.</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Tipo de Evento</label>
          <select 
            value={eventType} 
            onChange={(e) => setEventType(e.target.value)}
            required
          >
            <option value="payment.completed">Pago Completado</option>
            <option value="payment.failed">Pago Fallido</option>
            <option value="order.shipped">Pedido Enviado</option>
            <option value="order.delivered">Pedido Entregado</option>
            <option value="github.push">GitHub Push Event</option>
          </select>
        </div>

        <div className="form-group">
          <label>ID de Orden / Transacción</label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="ORD-12345"
            required
          />
        </div>

        <div className="form-group">
          <label>Monto (USD)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="99.99"
            step="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label>Email del Cliente</label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="cliente@email.com"
            required
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Enviando...' : 'Disparar Webhook'}
        </button>
      </form>
    </section>
  )
}

export default WebhookTrigger
