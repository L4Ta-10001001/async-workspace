import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import EventProducer from './components/EventProducer'
import EventStream from './components/EventStream'
import EventReplay from './components/EventReplay'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import './App.css'

const socket = io('http://localhost:8000', {
  path: '/ws/socket.io',
  transports: ['websocket', 'polling']
})

function App() {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const [selectedEventType, setSelectedEventType] = useState('all')

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics')
      return response.json()
    },
    refetchInterval: 2000,
  })

  // Fetch recent events
  const { data: eventsData } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch('/api/events?limit=100')
      return response.json()
    },
    refetchInterval: 3000,
  })

  // Produce event mutation
  const produceEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    }
  })

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('recent_events', (data) => {
      queryClient.setQueryData(['events'], (old) => {
        if (!old) return { events: data.events, total: data.events.length }
        return {
          ...old,
          events: data.events
        }
      })
    })

    socket.on('new_event', (data) => {
      queryClient.setQueryData(['events'], (old) => {
        if (!old) return { events: [data.event], total: 1 }
        return {
          ...old,
          events: [...old.events, data.event].slice(-100),
          total: (old.total || 0) + 1
        }
      })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('recent_events')
      socket.off('new_event')
    }
  }, [queryClient])

  const handleProduceEvent = (eventData) => {
    produceEventMutation.mutate(eventData)
  }

  const filteredEvents = eventsData?.events?.filter(event => {
    if (selectedEventType === 'all') return true
    return event.event_type === selectedEventType
  }) || []

  return (
    <div className="app">
      <header>
        <h1>Event Streaming Platform</h1>
        <div className="header-info">
          <span className="connection-status">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </header>

      <main>
        <section className="intro">
          <h2>Apache Kafka Event Streaming</h2>
          <p>
            This demo showcases Kafka's event streaming capabilities:
          </p>
          <ul>
            <li><strong>High Throughput:</strong> Process millions of events per second</li>
            <li><strong>Durable Storage:</strong> Events persist for days/weeks</li>
            <li><strong>Event Replay:</strong> Re-process events from any offset</li>
            <li><strong>Real-time Processing:</strong> Stream processing with low latency</li>
            <li><strong>Scalability:</strong> Partitioned topics for horizontal scaling</li>
          </ul>
        </section>

        <AnalyticsDashboard analytics={analyticsData} />

        <EventProducer
          onProduceEvent={handleProduceEvent}
          isLoading={produceEventMutation.isPending}
        />

        <EventReplay />

        <section>
          <h2>Event Stream</h2>
          <div className="filter-controls">
            <label>Filter by Event Type:</label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
            >
              <option value="all">All Events</option>
              {analyticsData?.events_by_type &&
                Object.keys(analyticsData.events_by_type).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))
              }
            </select>
          </div>
          <EventStream events={filteredEvents} />
        </section>
      </main>
    </div>
  )
}

export default App
