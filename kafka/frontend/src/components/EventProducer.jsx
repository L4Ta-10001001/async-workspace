import { useState } from 'react'

function EventProducer({ onProduceEvent, isLoading }) {
  const [eventType, setEventType] = useState('user.login')
  const [source, setSource] = useState('web-app')
  const [payload, setPayload] = useState('{"user_id": "user_123", "action": "manual_event"}')

  const handleSubmit = (e) => {
    e.preventDefault()

    try {
      const eventData = {
        event_type: eventType,
        source: source,
        payload: JSON.parse(payload)
      }

      onProduceEvent(eventData)

      // Reset form
      setPayload('{"user_id": "user_123", "action": "manual_event"}')
    } catch (error) {
      alert('Invalid JSON payload')
    }
  }

  return (
    <section>
      <h2>Produce Event</h2>
      <p>Manually produce an event to the Kafka topic</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Event Type</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="user.login">user.login</option>
            <option value="user.logout">user.logout</option>
            <option value="user.signup">user.signup</option>
            <option value="page.view">page.view</option>
            <option value="button.click">button.click</option>
            <option value="api.request">api.request</option>
            <option value="error.occurred">error.occurred</option>
            <option value="transaction.completed">transaction.completed</option>
          </select>
        </div>

        <div className="form-group">
          <label>Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="web-app">web-app</option>
            <option value="mobile-app">mobile-app</option>
            <option value="api-gateway">api-gateway</option>
            <option value="admin-panel">admin-panel</option>
            <option value="third-party-integration">third-party-integration</option>
          </select>
        </div>

        <div className="form-group">
          <label>Payload (JSON)</label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows="5"
            placeholder='{"key": "value"}'
            required
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Producing...' : 'Produce Event'}
        </button>
      </form>
    </section>
  )
}

export default EventProducer
