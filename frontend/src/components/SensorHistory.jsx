function SensorHistory({ sensorType, readings }) {
  if (!readings || readings.length === 0) {
    return (
      <section>
        <h2>Reading History</h2>
        <div className="no-data">No historical data available</div>
      </section>
    )
  }

  // Show last 20 readings in reverse chronological order
  const recentReadings = [...readings].reverse().slice(0, 20)

  return (
    <section>
      <h2>Recent {sensorType.charAt(0).toUpperCase() + sensorType.slice(1)} Readings</h2>
      <table className="history-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Value</th>
            <th>Sensor ID</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {recentReadings.map((reading, index) => (
            <tr key={index}>
              <td>{new Date(reading.timestamp).toLocaleString()}</td>
              <td>
                <strong>{reading.value} {reading.unit}</strong>
              </td>
              <td>{reading.sensor_id}</td>
              <td>{reading.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default SensorHistory
