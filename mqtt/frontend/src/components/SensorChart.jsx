import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function SensorChart({ sensorType, readings }) {
  if (!readings || readings.length === 0) {
    return (
      <section>
        <h2>Sensor Chart</h2>
        <div className="no-data">No data available for chart</div>
      </section>
    )
  }

  // Format data for Recharts
  const chartData = readings.map((reading, index) => ({
    time: new Date(reading.timestamp).toLocaleTimeString(),
    value: reading.value,
    index: index
  }))

  // Get unit from first reading
  const unit = readings[0]?.unit || ''

  // Color based on sensor type
  const colors = {
    temperature: '#ff6b6b',
    humidity: '#4ecdc4',
    pressure: '#95e1d3'
  }

  return (
    <section>
      <h2>{sensorType.charAt(0).toUpperCase() + sensorType.slice(1)} Over Time</h2>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#666"
              style={{ fontSize: '12px' }}
              label={{ 
                value: unit, 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: '12px' }
              }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={colors[sensorType] || '#667eea'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default SensorChart
