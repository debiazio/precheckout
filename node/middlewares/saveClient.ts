// node/middlewares/saveClient.ts
import type { ServiceContext } from '@vtex/api'
import coBody from 'co-body'

type Payload = {
  email?: string
  homePhone?: string
  phone?: string
  orderFormId?: string
}

const DEFAULT_BIRTHDATE = '1900-01-01'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorMessage(err: any) {
  return (
    err?.response?.data?.Message ??
    err?.response?.data?.message ??
    err?.message ??
    'Erro interno'
  )
}

async function createClientWithRetry(
  ctx: ServiceContext,
  payload: {
    email: string
    homePhone: string
    orderFormId?: string
  },
  retries = 2,
  delayMs = 400
) {
  let lastError: any = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await ctx.clients.masterdata.createDocument({
        dataEntity: 'CL',
        fields: {
          email: payload.email,
          homePhone: payload.homePhone,
          orderFormId: payload.orderFormId,
          dataNascimento: DEFAULT_BIRTHDATE,
        },
      })

      return { ok: true, action: 'created' as const }
    } catch (err) {
      lastError = err
      const message = String(getErrorMessage(err)).toLowerCase()

      if (message.includes('duplicated entry')) {
        return { ok: true, action: 'already-exists' as const }
      }

      if (attempt < retries) {
        await sleep(delayMs * (attempt + 1))
        continue
      }
    }
  }

  throw lastError
}

export async function saveClient(ctx: ServiceContext, next: () => Promise<void>) {
  try {
    const body = (await coBody.json(ctx.req)) as Payload

    const email = body?.email?.trim()
    const homePhone = (body?.homePhone ?? body?.phone ?? '').trim()
    const orderFormId = body?.orderFormId?.trim()

    if (!email || !homePhone) {
      ctx.status = 400
      ctx.body = { ok: false, error: 'email e telefone são obrigatórios' }
      return
    }

    const result = await createClientWithRetry(ctx, {
      email,
      homePhone,
      orderFormId,
    })

    ctx.status = 200
    ctx.body = result

    await next()
  } catch (err) {
    const e: any = err
    const mdMessage = getErrorMessage(e)

    console.error('saveClient error:', e?.response?.data ?? e)

    ctx.status = e?.response?.status ?? 500
    ctx.body = {
      ok: false,
      error: mdMessage,
      details: e?.response?.data ?? null,
    }
  }
}
