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
      <p>Simula un evento del sistema ATS que dispara un webhook hacia servicios externos.</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Tipo de Evento</label>
          <select 
            value={eventType} 
            onChange={(e) => setEventType(e.target.value)}
            required
          >
            <option value="candidate.applied">Candidato Aplicó</option>
            <option value="candidate.interview.scheduled">Entrevista Programada</option>
            <option value="candidate.status.updated">Estado Actualizado</option>
            <option value="candidate.offer.sent">Oferta Enviada</option>
            <option value="candidate.rejected">Candidato Rechazado</option>
          </select>
        </div>

        <div className="form-group">
          <label>Nombre del Candidato</label>
          <input
            type="text"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="Juan Pérez"
            required
          />
        </div>

        <div className="form-group">
          <label>Email del Candidato</label>
          <input
            type="email"
            value={candidateEmail}
            onChange={(e) => setCandidateEmail(e.target.value)}
            placeholder="juan.perez@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label>Estado Actual</label>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="En revisión"
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
