function SensorGauges({ latestData }) {
  if (!latestData) {
    return (
      <section>
        <h2>Current Readings</h2>
        <div className="no-data">Loading sensor data...</div>
      </section>
    )
  }

  const sensors = [
    {
      key: 'temperature',
      icon: '🌡️',
      label: 'Temperature'
    },
    {
      key: 'humidity',
      icon: '💧',
      label: 'Humidity'
    },
    {
      key: 'pressure',
      icon: '📊',
      label: 'Pressure'
    }
  ]

  return (
    <section>
      <h2>Current Readings</h2>
      <div className="gauges-grid">
        {sensors.map(sensor => {
          const data = latestData[sensor.key]
          return (
            <div key={sensor.key} className="gauge-card">
              <h3>{sensor.icon} {sensor.label}</h3>
              {data ? (
                <>
                  <div className="gauge-value">
                    {data.value}
                  </div>
                  <div className="gauge-unit">{data.unit}</div>
                  <div className="gauge-meta">
                    <div>Sensor: {data.sensor_id}</div>
                    <div>Location: {data.location}</div>
                  </div>
                </>
              ) : (
                <div className="gauge-value">--</div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default SensorGauges
