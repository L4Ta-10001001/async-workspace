function OrderStats({ stats }) {
  if (!stats) {
    return (
      <section>
        <h2>Statistics</h2>
        <div className="loading">Loading stats...</div>
      </section>
    )
  }

  return (
    <section>
      <h2>Order Processing Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total_orders}</div>
          <div className="stat-label">Total Orders</div>
        </div>

        {stats.status_counts && Object.entries(stats.status_counts).map(([status, count]) => (
          <div key={status} className="stat-card">
            <div className="stat-value">{count}</div>
            <div className="stat-label">{status}</div>
          </div>
        ))}
      </div>

      {stats.recent_updates && stats.recent_updates.length > 0 && (
        <div>
          <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Recent Activity</h3>
          {stats.recent_updates.map((update, index) => (
            <div key={index} className="activity-item">
              <strong>{update.worker}</strong>
              Order {update.order_id.substring(0, 8)}... → {update.status}
              <span className="timestamp">{new Date(update.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default OrderStats
