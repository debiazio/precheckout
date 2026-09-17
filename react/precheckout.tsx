/* react/precheckout.tsx */
/* eslint-disable react/jsx-no-bind */
import React, { useEffect, useMemo, useRef, useState } from 'react'

// ⚠️ Atualize este valor sempre que publicar uma nova versão (deve bater com manifest.json)
const APP_VERSION = '0.0.12*'

const CHECKOUT_URL = '/checkout/#/cart'

// ===== Helpers telefone BR =====
function onlyDigits(value: string) {
  return (value || '').replace(/\D/g, '')
}

function formatBRPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  const len = d.length

  if (len === 0) return ''
  if (len <= 2) return `(${d}`
  if (len <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`

  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
}

function isValidBRPhone(value: string) {
  const d = onlyDigits(value)

  if (d.length !== 11) return false
  if (d[2] !== '9') return false
  if (/^(\d)\1{10}$/.test(d)) return false

  return true
}

// ===== Helpers email =====
function isValidEmail(value: string) {
  const e = (value || '').trim()

  return e.length >= 5 && e.includes('@') && e.includes('.') && !e.includes(' ')
}

// ===== Helper valor monetário =====
function formatCurrencyFromCents(cents: number) {
  const value = cents / 100

  return value.toFixed(2).replace('.', ',')
}

// ===== Helper para montar o resumo do carrinho por produto =====
function buildCartSummary(items: any[]) {
  if (!items || items.length === 0) return ''

  return items
    .map((item: any, index: number) => {
      const name = item.name ?? 'Produto'
      // sellingPrice/price vêm em centavos e já são por unidade
      const unitPriceCents = item.sellingPrice ?? item.price ?? 0
      const totalItemCents = unitPriceCents * (item.quantity ?? 1)
      const totalItemValue = formatCurrencyFromCents(totalItemCents)

      return `${index + 1}) ${name} - ${totalItemValue} reais`
    })
    .join('  •  ')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type FetchRetryOptions = {
  retries?: number
  delayMs?: number
}

async function fetchJsonWithRetry(
  input: RequestInfo,
  init?: RequestInit,
  options?: FetchRetryOptions
) {
  const retries = options?.retries ?? 2
  const delayMs = options?.delayMs ?? 500

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const resp = await fetch(input, init)

      let body: any = null
      const contentType = resp.headers.get('content-type') ?? ''

      if (contentType.includes('application/json')) {
        // eslint-disable-next-line no-await-in-loop
        body = await resp.json().catch(() => null)
      } else {
        // eslint-disable-next-line no-await-in-loop
        const text = await resp.text().catch(() => '')

        body = text ? { message: text } : null
      }

      if (!resp.ok) {
        const message =
          body?.error ?? body?.message ?? `Erro na requisição (${resp.status})`

        throw new Error(message)
      }

      return body
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Erro inesperado')

      if (attempt < retries) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(delayMs * (attempt + 1))
        continue
      }

      throw lastError
    }
  }

  throw lastError ?? new Error('Erro inesperado')
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#ffffff',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
  },
  card: {
    width: '100%',
    maxWidth: 520,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: '2px solid #6B7280',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
  },
  title: {
    fontSize: 34,
    lineHeight: '38px',
    margin: 0,
    color: '#111827',
  },
  subtitle: {
    margin: '0 0 18px 44px',
    color: '#6B7280',
    fontSize: 14,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 999,
    border: '1px solid #D1D5DB',
    padding: '0 16px',
    fontSize: 16,
    outline: 'none',
  },
  hint: {
    marginTop: 8,
    marginLeft: 6,
    color: '#6B7280',
    fontSize: 13,
  },
  infoBox: {
    marginTop: 16,
    borderRadius: 12,
    border: '1px solid #E5E7EB',
    padding: 14,
    background: '#FAFAFA',
  },
  infoTitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: 600,
    marginBottom: 10,
  },
  list: {
    margin: 0,
    paddingLeft: 0,
    listStyle: 'none',
    color: '#4B5563',
    fontSize: 14,
  },
  li: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  check: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: 999,
    background: '#FDE2E7',
    color: '#DB2777',
    fontWeight: 800,
    fontSize: 12,
    flex: '0 0 18px',
  },
  error: {
    marginTop: 12,
    color: '#B91C1C',
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    padding: 10,
    borderRadius: 10,
    fontSize: 14,
  },
  button: {
    marginTop: 18,
    width: '100%',
    height: 54,
    borderRadius: 999,
    border: 'none',
    background: '#F7B6C6',
    color: '#ffffff',
    fontWeight: 800,
    letterSpacing: 0.6,
    fontSize: 16,
  },
  loading: {
    marginTop: 18,
    color: '#6B7280',
    fontSize: 14,
    marginLeft: 6,
  },
}

export default function PreCheckout() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [emailTouched, setEmailTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const mountedRef = useRef(true)

  const phoneDigits = useMemo(() => onlyDigits(phone), [phone])

  const emailOk = useMemo(() => isValidEmail(email), [email])
  const phoneOk = useMemo(() => isValidBRPhone(phoneDigits), [phoneDigits])

  const isValid = useMemo(() => emailOk && phoneOk, [emailOk, phoneOk])

  useEffect(() => {
    mountedRef.current = true

    // eslint-disable-next-line no-console
    console.log(`[precheckout] versão em execução: ${APP_VERSION}`)
    ;(async () => {
      try {
        const orderForm = await fetchJsonWithRetry(
          '/api/checkout/pub/orderForm',
          { method: 'GET' },
          { retries: 1, delayMs: 300 }
        )

        const existingEmail = orderForm?.clientProfileData?.email

        if (existingEmail) {
          window.location.assign(CHECKOUT_URL)

          return
        }
      } catch {
        // se falhar, não bloqueia a página
      } finally {
        if (mountedRef.current) setCheckingSession(false)
      }
    })()

    return () => {
      mountedRef.current = false
    }
  }, [])

  function handlePhoneChange(value: string) {
    setPhone(formatBRPhone(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!emailTouched) setEmailTouched(true)
    if (!phoneTouched) setPhoneTouched(true)

    if (!isValid || loading) return

    setLoading(true)
    setError(null)

    try {
      // 1) busca o orderForm completo para obter id e itens
      const orderForm = await fetchJsonWithRetry(
        '/api/checkout/pub/orderForm',
        { method: 'GET' },
        { retries: 2, delayMs: 400 }
      )

      const currentOrderFormId = orderForm?.orderFormId

      if (!currentOrderFormId) {
        throw new Error('Não foi possível identificar o carrinho')
      }

      // monta o resumo por produto: "1) Produto X - 1200,00 reais"
      const cartSummary = buildCartSummary(orderForm?.items ?? [])

      // 2) salva direto na Master Data (sem backend Node)
      await fetchJsonWithRetry(
        '/api/dataentities/CA/documents',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/vnd.vtex.ds.v10+json',
          },
          body: JSON.stringify({
            email: email.trim(),
            telefone: phoneDigits,
            cart: cartSummary,
          }),
        },
        { retries: 2, delayMs: 700 }
      )

      // 3) atualiza o clientProfileData do checkout
      await fetchJsonWithRetry(
        `/api/checkout/pub/orderForm/${currentOrderFormId}/attachments/clientProfileData`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            phone: phoneDigits,
          }),
        },
        { retries: 2, delayMs: 500 }
      )

      window.location.assign(CHECKOUT_URL)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao continuar para o checkout'

      if (mountedRef.current) setError(message)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.headerRow}>
            <div style={styles.step}>1</div>
            <h1 style={styles.title}>Email</h1>
          </div>
          <p style={styles.subtitle}>Rápido. Fácil. Seguro.</p>
          <div style={styles.loading}>Verificando seu carrinho…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div style={styles.step}>1</div>
          <h1 style={styles.title}>Email</h1>
        </div>

        <p style={styles.subtitle}>Rápido. Fácil. Seguro.</p>

        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            autoComplete="email"
            required
          />

          {emailTouched && !emailOk && (
            <div style={styles.hint}>
              Informe um e-mail válido. Ex.: <strong>nome@dominio.com</strong>
            </div>
          )}

          <input
            style={{ ...styles.input, marginTop: 12 }}
            type="tel"
            placeholder="(DD) 9xxxx-xxxx"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            autoComplete="tel"
            required
          />

          {phoneTouched && !phoneOk && (
            <div style={styles.hint}>
              Informe um celular válido: <strong>(DD) 9xxxx-xxxx</strong>
            </div>
          )}

          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>
              Usamos seu e-mail de forma 100% segura para:
            </div>
            <ul style={styles.list}>
              <li style={styles.li}>
                <span style={styles.check}>✓</span> Identificar seu perfil
              </li>
              <li style={styles.li}>
                <span style={styles.check}>✓</span> Notificar sobre o andamento
                do seu pedido
              </li>
              <li style={styles.li}>
                <span style={styles.check}>✓</span> Gerenciar seu histórico de
                compras
              </li>
              <li style={styles.li}>
                <span style={styles.check}>✓</span> Acelerar o preenchimento de
                suas informações
              </li>
            </ul>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={!isValid || loading}
            style={{
              ...styles.button,
              opacity: !isValid || loading ? 0.6 : 1,
              cursor: !isValid || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'CONTINUANDO...' : 'CONTINUAR'}
          </button>
        </form>
      </div>
    </div>
  )
}
