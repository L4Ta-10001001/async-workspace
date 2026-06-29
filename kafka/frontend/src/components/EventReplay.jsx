import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

function EventReplay() {
  const [fromOffset, setFromOffset] = useState(0)
  const [limit, setLimit] = useState(50)
  const [shouldFetch, setShouldFetch] = useState(false)

  const { data: replayData, isLoading, refetch } = useQuery({
    queryKey: ['replay', fromOffset, limit],
    queryFn: async () => {
      const response = await fetch(`/api/events/replay?from_offset=${fromOffset}&limit=${limit}`)
      return response.json()
    },
    enabled: shouldFetch,
  })

  const handleReplay = () => {
    setShouldFetch(true)
    refetch()
  }

  return (
    <section>
      <h2>Event Replay</h2>
      <p>
        Replay events from Kafka topic starting from a specific offset.
        This demonstrates Kafka's ability to re-process historical events.
      </p>

      <div className="replay-controls">
        <div className="form-group">
          <label>From Offset</label>
          <input
            type="number"
            value={fromOffset}
            onChange={(e) => setFromOffset(parseInt(e.target.value))}
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Limit</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            min="1"
            max="1000"
          />
        </div>

        <button onClick={handleReplay} disabled={isLoading}>
          {isLoading ? 'Replaying...' : 'Replay Events'}
        </button>
      </div>

      {isLoading && <div className="loading">Loading events from Kafka...</div>}

      {replayData && (
        <div className="replay-results">
          <h3>Replayed {replayData.count} events</h3>
          <p>Topic: {replayData.topic} | From offset: {replayData.from_offset}</p>
          
          <div className="event-list" style={{ marginTop: '1rem' }}>
            {replayData.events.map((item, index) => (
              <div key={index} className="event-item">
                <div className="event-header">
                  <span className="event-type">{item.event.event_type}</span>
                  <span className="event-source">{item.event.source}</span>
                </div>
                <div className="event-payload">
                  <pre>{JSON.stringify(item.event.payload, null, 2)}</pre>
                </div>
                <div className="event-metadata">
                  <span>Partition: {item.partition} | Offset: {item.offset}</span>
                  <span style={{ marginLeft: '1rem' }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default EventReplay
