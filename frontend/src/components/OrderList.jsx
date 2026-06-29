function OrderList({ orders, isLoading }) {
  if (isLoading) {
    return (
      <section>
        <h2>Orders</h2>
        <div className="loading">Loading orders...</div>
      </section>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <section>
        <h2>Orders</h2>
        <div className="no-data">No orders yet. Create your first order above.</div>
      </section>
    )
  }

  return (
    <section>
      <h2>Orders ({orders.length})</h2>
      <table className="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.order_id}>
              <td title={order.order_id}>
                {order.order_id.substring(0, 8)}...
              </td>
              <td>
                <div>{order.customer_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  {order.customer_email}
                </div>
              </td>
              <td>
                {order.items.length} item{order.items.length > 1 ? 's' : ''}
              </td>
              <td>${order.total_amount.toFixed(2)}</td>
              <td>
                <span className={`status-badge status-${order.status}`}>
                  {order.status}
                </span>
              </td>
              <td>
                {new Date(order.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default OrderList
