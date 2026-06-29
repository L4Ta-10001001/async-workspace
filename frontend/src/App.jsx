import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import SensorGauges from './components/SensorGauges'
import SensorChart from './components/SensorChart'
import SensorHistory from './components/SensorHistory'
import './App.css'

const socket = io('http://localhost:8000', {
  path: '/ws/socket.io',
  transports: ['websocket', 'polling']
})

function App() {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const [selectedSensor, setSelectedSensor] = useState('temperature')

  // Fetch latest sensor data
  const { data: latestData } = useQuery({
    queryKey: ['sensors', 'latest'],
    queryFn: async () => {
      const response = await fetch('/api/sensors/latest')
      return response.json()
    },
    refetchInterval: 5000, // Poll every 5 seconds as fallback
  })

  // Fetch sensor history for selected sensor
  const { data: historyData } = useQuery({
    queryKey: ['sensors', selectedSensor, 'history'],
    queryFn: async () => {
      const response = await fetch(`/api/sensors/${selectedSensor}?limit=50`)
      return response.json()
    },
    enabled: !!selectedSensor,
  })

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to WebSocket')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from WebSocket')
    })

    // Receive initial data when connecting
    socket.on('initial_data', (data) => {
      console.log('Received initial data:', data)
      // Update cache with initial data
      Object.entries(data).forEach(([sensorType, readings]) => {
        if (readings.length > 0) {
          queryClient.setQueryData(['sensors', sensorType, 'history'], {
            sensor_type: sensorType,
            readings: readings
          })
        }
      })
    })

    // Receive real-time sensor updates
    socket.on('sensor_update', (data) => {
      const { sensor_type, data: sensorData } = data
      
      // Update latest data cache
      queryClient.setQueryData(['sensors', 'latest'], (old) => {
        if (!old) return { [sensor_type]: sensorData }
        return {
          ...old,
          [sensor_type]: sensorData
        }
      })

      // Update history cache for this sensor type
      queryClient.setQueryData(['sensors', sensor_type, 'history'], (old) => {
        if (!old) {
          return {
            sensor_type: sensor_type,
            readings: [sensorData]
          }
        }
        
        const newReadings = [...old.readings, sensorData]
        // Keep only last 100 readings
        return {
          sensor_type: sensor_type,
          readings: newReadings.slice(-100)
        }
      })
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('initial_data')
      socket.off('sensor_update')
    }
  }, [queryClient])

  return (
    <div className="app">
      <header>
        <h1>IoT Sensor Dashboard</h1>
        <div className="header-info">
          <span className="connection-status">
            {isConnected ? '🟢 MQTT Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </header>

      <main>
        <section className="intro">
          <h2>Real-Time Sensor Monitoring</h2>
          <p>
            This dashboard displays real-time data from IoT sensors via MQTT protocol.
            Sensors publish data to topics (temperature, humidity, pressure), and updates
            are pushed to the UI via WebSocket.
          </p>
        </section>

        <SensorGauges latestData={latestData} />

        <section className="sensor-selector">
          <h2>Sensor History</h2>
          <div className="button-group">
            <button
              className={selectedSensor === 'temperature' ? 'active' : ''}
              onClick={() => setSelectedSensor('temperature')}
            >
              Temperature
            </button>
            <button
              className={selectedSensor === 'humidity' ? 'active' : ''}
              onClick={() => setSelectedSensor('humidity')}
            >
              Humidity
            </button>
            <button
              className={selectedSensor === 'pressure' ? 'active' : ''}
              onClick={() => setSelectedSensor('pressure')}
            >
              Pressure
            </button>
          </div>
        </section>

        <SensorChart
          sensorType={selectedSensor}
          readings={historyData?.readings || []}
        />

        <SensorHistory
          sensorType={selectedSensor}
          readings={historyData?.readings || []}
        />
      </main>
    </div>
  )
}

export default App
