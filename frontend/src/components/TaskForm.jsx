import { useState } from 'react'

function TaskForm({ onCreateTask }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [status, setStatus] = useState('todo')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!title.trim()) return

    onCreateTask({
      title: title.trim(),
      description: description.trim(),
      assignee: assignee.trim() || null,
      status
    })

    setTitle('')
    setDescription('')
    setAssignee('')
    setStatus('todo')
  }

  return (
    <section>
      <h2>Create New Task</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Task description"
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Assignee</label>
          <input
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Assignee name (optional)"
          />
        </div>

        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <button type="submit">Create Task</button>
      </form>
    </section>
  )
}

export default TaskForm
