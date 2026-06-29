import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import OrderForm from './components/OrderForm'
import OrderList from './components/OrderList'
import OrderStats from './components/OrderStats'
import ActivityLog from './components/ActivityLog'
import './App.css'

const socket = io('http://localhost:8000', {
  path: '/ws/socket.io',
  transports: ['websocket', 'polling']
})

function App() {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const [activityLog, setActivityLog] = useState([])

  // Fetch all orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders')
      return response.json()
    },
    refetchInterval: 3000,
  })

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await fetch('/api/stats')
      return response.json()
    },
    refetchInterval: 2000,
  })

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    }
  })

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true)
      addActivity('System', 'WebSocket connected')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      addActivity('System', 'WebSocket disconnected')
    })

    socket.on('initial_orders', (data) => {
      queryClient.setQueryData(['orders'], data)
      addActivity('System', `Loaded ${data.orders.length} orders`)
    })

    socket.on('order_created', (order) => {
      queryClient.setQueryData(['orders'], (old) => {
        if (!old) return { orders: [order] }
        return {
          ...old,
          orders: [order, ...old.orders]
        }
      })
      addActivity('Order Created', `Order ${order.order_id.substring(0, 8)}... created`)
    })

    socket.on('order_updated', (update) => {
      queryClient.setQueryData(['orders'], (old) => {
        if (!old) return old
        return {
          ...old,
          orders: old.orders.map(o => 
            o.order_id === update.order_id 
              ? { ...o, status: update.status, updated_at: update.timestamp }
              : o
          )
        }
      })
      addActivity(
        'Order Updated',
        `Order ${update.order_id.substring(0, 8)}... → ${update.status} (${update.worker})`
      )
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('initial_orders')
      socket.off('order_created')
      socket.off('order_updated')
    }
  }, [queryClient])

  const addActivity = (type, message) => {
    setActivityLog(prev => [
      { type, message, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49)
    ])
  }

  const handleCreateOrder = (orderData) => {
    createOrderMutation.mutate(orderData)
  }

  return (
    <div className="app">
      <header>
        <h1>Order Processing Pipeline</h1>
        <div className="header-info">
          <span className="connection-status">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </header>

      <main>
        <section className="intro">
          <h2>RabbitMQ Microservices Architecture</h2>
          <p>
            This demo showcases RabbitMQ's message routing capabilities with multiple exchange types:
          </p>
          <ul>
            <li><strong>Direct Exchange:</strong> Payment processing (work queue pattern)</li>
            <li><strong>Topic Exchange:</strong> Email/SMS notifications (selective routing)</li>
            <li><strong>Fanout Exchange:</strong> Analytics processing (broadcast to all)</li>
          </ul>
        </section>

        <OrderForm
          onCreateOrder={handleCreateOrder}
          isLoading={createOrderMutation.isPending}
        />

        <OrderStats stats={statsData} />

        <OrderList
          orders={ordersData?.orders || []}
          isLoading={ordersLoading}
        />

        <ActivityLog activities={activityLog} />
      </main>
    </div>
  )
}

export default App
