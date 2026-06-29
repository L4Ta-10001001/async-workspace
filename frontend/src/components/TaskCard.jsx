function TaskCard({ task, onMove, onDelete }) {
  const getNextStatus = (currentStatus) => {
    const flow = { todo: 'in-progress', 'in-progress': 'done', done: 'todo' }
    return flow[currentStatus]
  }

  const getNextStatusLabel = (currentStatus) => {
    const labels = { todo: 'Start →', 'in-progress': 'Complete →', done: 'Reopen →' }
    return labels[currentStatus]
  }

  return (
    <div className="task-card">
      <h4>{task.title}</h4>
      {task.description && <p>{task.description}</p>}
      
      <div className="task-meta">
        {task.assignee && (
          <span className="assignee">👤 {task.assignee}</span>
        )}
        
        <div className="actions">
          <button
            onClick={() => onMove(task.id, getNextStatus(task.status))}
            title={`Move to ${getNextStatus(task.status)}`}
          >
            {getNextStatusLabel(task.status)}
          </button>
          <button
            className="delete"
            onClick={() => onDelete(task.id)}
            title="Delete task"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskCard
