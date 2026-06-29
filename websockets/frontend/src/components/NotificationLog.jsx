function NotificationLog({ notifications }) {
  return (
    <section>
      <h2>Real-Time Notifications</h2>
      <div className="notification-log">
        {notifications.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
            No notifications yet. Actions on the board will appear here.
          </p>
        ) : (
          notifications.map((notification, index) => (
            <div key={index} className="notification-item">
              <strong>{notification.type}</strong>
              {notification.message}
              <span className="timestamp">{notification.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default NotificationLog
