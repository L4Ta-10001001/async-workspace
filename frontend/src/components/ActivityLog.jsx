function ActivityLog({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <section>
        <h2>Activity Log</h2>
        <div className="no-data">No activity yet. Create an order to see real-time updates.</div>
      </section>
    )
  }

  return (
    <section>
      <h2>Real-Time Activity Log</h2>
      <div className="activity-log">
        {activities.map((activity, index) => (
          <div key={index} className="activity-item">
            <strong>{activity.type}</strong>
            {activity.message}
            <span className="timestamp">{activity.timestamp}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ActivityLog
