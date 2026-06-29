function EventStream({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="no-data">
        No events yet. Events will appear here as they are produced.
      </div>
    )
  }

  return (
    <div className="event-list">
      {[...events].reverse().map((event, index) => (
        <div key={event.event_id || index} className="event-item">
          <div className="event-header">
            <span className="event-type">{event.event_type}</span>
            <span className="event-source">{event.source}</span>
          </div>
          <div className="event-payload">
            <pre>{JSON.stringify(event.payload, null, 2)}</pre>
          </div>
          <div className="event-metadata">
            <span>Event ID: {event.event_id}</span>
            <span style={{ marginLeft: '1rem' }}>
              Partition: {event.partition} | Offset: {event.offset}
            </span>
            <span style={{ marginLeft: '1rem' }}>
              {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default EventStream
