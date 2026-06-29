import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function AnalyticsDashboard({ analytics }) {
  if (!analytics) {
    return (
      <section>
        <h2>Analytics Dashboard</h2>
        <div className="loading">Loading analytics...</div>
      </section>
    )
  }

  // Prepare data for charts
  const eventTypeData = Object.entries(analytics.events_by_type || {}).map(([type, count]) => ({
    name: type,
    count: count
  }))

  const sourceData = Object.entries(analytics.events_by_source || {}).map(([source, count]) => ({
    name: source,
    count: count
  }))

  const hourlyData = Object.entries(analytics.hourly_counts || {}).map(([hour, count]) => ({
    name: hour.split(' ')[1] || hour,
    count: count
  }))

  return (
    <section>
      <h2>Analytics Dashboard</h2>
      
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-value">{analytics.total_events}</div>
          <div className="analytics-label">Total Events</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-value">{analytics.unique_event_types}</div>
          <div className="analytics-label">Event Types</div>
        </div>

        <div className="analytics-card">
          <div className="analytics-value">{analytics.unique_sources}</div>
          <div className="analytics-label">Sources</div>
        </div>
      </div>

      <div className="analytics-details">
        <div className="analytics-section">
          <h3>Events by Type</h3>
          {eventTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eventTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#999' }}>No data yet</p>
          )}
        </div>

        <div className="analytics-section">
          <h3>Events by Source</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#764ba2" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#999' }}>No data yet</p>
          )}
        </div>

        <div className="analytics-section">
          <h3>Top Event Types</h3>
          <ul className="analytics-list">
            {eventTypeData
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map(item => (
                <li key={item.name}>
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </li>
              ))
            }
          </ul>
        </div>

        <div className="analytics-section">
          <h3>Top Sources</h3>
          <ul className="analytics-list">
            {sourceData
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map(item => (
                <li key={item.name}>
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </li>
              ))
            }
          </ul>
        </div>
      </div>
    </section>
  )
}

export default AnalyticsDashboard
