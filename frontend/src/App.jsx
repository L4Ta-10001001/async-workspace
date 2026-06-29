import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import TaskBoard from './components/TaskBoard'
import TaskForm from './components/TaskForm'
import NotificationLog from './components/NotificationLog'
import './App.css'

const socket = io('http://localhost:8000', {
  path: '/ws/socket.io',
  transports: ['websocket', 'polling']
})

function App() {
  const queryClient = useQueryClient()
  const [boardId] = useState('board-1')
  const [username, setUsername] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState([])

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const response = await fetch(`/api/boards/${boardId}/tasks`)
      return response.json()
    },
    enabled: !!boardId,
  })

  useEffect(() => {
    if (username && !isConnected) {
      socket.emit('join_board', { board_id: boardId, user: username })
      setIsConnected(true)
    }
  }, [username, boardId, isConnected])

  useEffect(() => {
    socket.on('connected', (data) => {
      addNotification('System', `Connected with SID: ${data.sid}`)
    })

    socket.on('board_state', (data) => {
      queryClient.setQueryData(['board', data.board_id], {
        board_id: data.board_id,
        tasks: data.tasks
      })
      addNotification('System', `Board state loaded: ${data.tasks.length} tasks`)
    })

    socket.on('user_joined', (data) => {
      addNotification('User Joined', `${data.user} joined the board`)
    })

    socket.on('user_left', (data) => {
      addNotification('User Left', `${data.user} left the board`)
    })

    socket.on('task_created', (data) => {
      queryClient.setQueryData(['board', data.board_id], (old) => {
        if (!old) return { board_id: data.board_id, tasks: [data.task] }
        return {
          ...old,
          tasks: [...old.tasks, data.task]
        }
      })
      addNotification('Task Created', `New task: ${data.task.title}`)
    })

    socket.on('task_updated', (data) => {
      queryClient.setQueryData(['board', data.board_id], (old) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map(t => t.id === data.task.id ? data.task : t)
        }
      })
      addNotification('Task Updated', `Task updated: ${data.task.title}`)
    })

    socket.on('task_moved', (data) => {
      queryClient.setQueryData(['board', data.board_id], (old) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map(t => t.id === data.task.id ? data.task : t)
        }
      })
      addNotification('Task Moved', `"${data.task.title}" moved to ${data.task.status}`)
    })

    socket.on('task_deleted', (data) => {
      queryClient.setQueryData(['board', data.board_id], (old) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.filter(t => t.id !== data.task_id)
        }
      })
      addNotification('Task Deleted', `Task removed from board`)
    })

    return () => {
      socket.off('connected')
      socket.off('board_state')
      socket.off('user_joined')
      socket.off('user_left')
      socket.off('task_created')
      socket.off('task_updated')
      socket.off('task_moved')
      socket.off('task_deleted')
    }
  }, [queryClient])

  const addNotification = (type, message) => {
    setNotifications(prev => [
      { type, message, timestamp: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19)
    ])
  }

  const handleJoin = (e) => {
    e.preventDefault()
    const input = e.target.elements.username
    if (input.value.trim()) {
      setUsername(input.value.trim())
    }
  }

  const handleCreateTask = (taskData) => {
    socket.emit('create_task', { board_id: boardId, task: taskData })
  }

  const handleMoveTask = (taskId, newStatus) => {
    socket.emit('move_task', {
      board_id: boardId,
      task_id: taskId,
      new_status: newStatus
    })
  }

  const handleDeleteTask = (taskId) => {
    socket.emit('delete_task', { board_id: boardId, task_id: taskId })
  }

  if (!username) {
    return (
      <div className="app">
        <div className="join-form">
          <h1>Real-Time Task Board</h1>
          <p>Collaborative Kanban board with WebSocket synchronization</p>
          <form onSubmit={handleJoin}>
            <input
              name="username"
              type="text"
              placeholder="Enter your name"
              required
              autoFocus
            />
            <button type="submit">Join Board</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>Real-Time Task Board</h1>
        <div className="header-info">
          <span className="user-badge">👤 {username}</span>
          <span className="connection-status">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </header>

      <main>
        <TaskForm onCreateTask={handleCreateTask} />
        
        {isLoading ? (
          <div className="loading">Loading board...</div>
        ) : (
          <TaskBoard
            tasks={boardData?.tasks || []}
            onMoveTask={handleMoveTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        <NotificationLog notifications={notifications} />
      </main>
    </div>
  )
}

export default App
