import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import WebhookTrigger from './components/WebhookTrigger'
import EventList from './components/EventList'
import SubscriptionManager from './components/SubscriptionManager'
import './App.css'

function App() {
  const queryClient = useQueryClient()

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['webhookEvents'],
    queryFn: async () => {
      const response = await axios.get('/api/webhooks/events')
      return response.data
    },
  })

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['webhookSubscriptions'],
    queryFn: async () => {
      const response = await axios.get('/api/webhooks/subscriptions')
      return response.data
    },
  })

  const triggerMutation = useMutation({
    mutationFn: async (eventData) => {
      const response = await axios.post('/api/webhooks/trigger', eventData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookEvents'] })
    },
  })

  const subscribeMutation = useMutation({
    mutationFn: async (subscriptionData) => {
      const response = await axios.post('/api/webhooks/subscribe', subscriptionData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookSubscriptions'] })
    },
  })

  const clearEventsMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.delete('/api/webhooks/events/clear')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookEvents'] })
    },
  })

  return (
    <div className="app">
      <header>
        <h1>Webhooks PoC - ATS Integration</h1>
        <p>Sistema de notificaciones asíncronas para seguimiento de candidatos</p>
      </header>

      <main>
        <WebhookTrigger 
          onTrigger={triggerMutation.mutate}
          isLoading={triggerMutation.isPending}
        />

        <SubscriptionManager
          onSubscribe={subscribeMutation.mutate}
          isLoading={subscribeMutation.isPending}
          subscriptions={subsData?.subscriptions || []}
          isLoadingSubs={subsLoading}
        />

        <EventList
          events={eventsData?.events || []}
          isLoading={eventsLoading}
          onClear={() => clearEventsMutation.mutate()}
        />
      </main>
    </div>
  )
}

export default App
