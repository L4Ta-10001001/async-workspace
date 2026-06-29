import TaskCard from './TaskCard'

function TaskBoard({ tasks, onMoveTask, onDeleteTask }) {
  const columns = {
    todo: { title: 'To Do', tasks: [] },
    'in-progress': { title: 'In Progress', tasks: [] },
    done: { title: 'Done', tasks: [] }
  }

  tasks.forEach(task => {
    if (columns[task.status]) {
      columns[task.status].tasks.push(task)
    }
  })

  return (
    <section>
      <h2>Task Board</h2>
      <div className="task-board">
        {Object.entries(columns).map(([status, column]) => (
          <div key={status} className="task-column">
            <h3>{column.title} ({column.tasks.length})</h3>
            {column.tasks.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
                No tasks
              </p>
            ) : (
              column.tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onMove={onMoveTask}
                  onDelete={onDeleteTask}
                />
              ))
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export default TaskBoard
