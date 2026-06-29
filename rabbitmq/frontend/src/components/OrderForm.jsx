import { useState } from 'react'

function OrderForm({ onCreateOrder, isLoading }) {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [items, setItems] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('credit_card')

  const handleSubmit = (e) => {
    e.preventDefault()

    const orderData = {
      customer_name: customerName,
      customer_email: customerEmail,
      items: items.split(',').map(item => ({ name: item.trim(), quantity: 1 })),
      total_amount: parseFloat(totalAmount),
      payment_method: paymentMethod
    }

    onCreateOrder(orderData)

    // Reset form
    setCustomerName('')
    setCustomerEmail('')
    setItems('')
    setTotalAmount('')
    setPaymentMethod('credit_card')
  }

  return (
    <section>
      <h2>Create New Order</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="John Doe"
            required
          />
        </div>

        <div className="form-group">
          <label>Customer Email</label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="john@example.com"
            required
          />
        </div>

        <div className="form-group">
          <label>Items (comma-separated)</label>
          <input
            type="text"
            value={items}
            onChange={(e) => setItems(e.target.value)}
            placeholder="Laptop, Mouse, Keyboard"
            required
          />
        </div>

        <div className="form-group">
          <label>Total Amount (USD)</label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="299.99"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label>Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="credit_card">Credit Card</option>
            <option value="paypal">PayPal</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Order'}
        </button>
      </form>
    </section>
  )
}

export default OrderForm
