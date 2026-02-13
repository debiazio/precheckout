import React, { useState } from 'react'

const CHECKOUT_CART_URL = '/checkout/#/cart'

export default function PreCheckoutForm() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const resp = await fetch('/_v/precheckout/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      })

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body?.error || 'Falha ao salvar no Master Data')
      }

      window.location.href = CHECKOUT_CART_URL
    } catch (err: any) {
      setError(err?.message ?? 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Identificação</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            style={{ width: '100%', padding: 10, marginTop: 6 }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Telefone</label>
          <input
            style={{ width: '100%', padding: 10, marginTop: 6 }}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: '10px 14px' }}>
          {loading ? 'Salvando...' : 'Continuar'}
        </button>
      </form>
    </div>
  )
}
