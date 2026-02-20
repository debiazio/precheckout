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

    const dataEntity = 'CL'

    // Não filtra por email (nesse ambiente dá "Cannot filter by private fields")
    // Estratégia: tenta criar. Se já existir, não falha (duplicated entry).
    await ctx.clients.masterdata.createDocument({
      dataEntity,
      fields: {
        email,
        homePhone,
        orderFormId,
        dataNascimento: DEFAULT_BIRTHDATE,
      },
    })

    ctx.status = 200
    ctx.body = { ok: true, action: 'created' }
    await next()
  } catch (err) {
    const e: any = err
    const mdMessage =
      e?.response?.data?.Message ??
      e?.response?.data?.message ??
      e?.message ??
      'Erro interno'

    // Se já existir, Master Data costuma responder "duplicated entry" (400).
    // Nesse caso, retornamos OK porque o contato já está capturado.
    if (String(mdMessage).toLowerCase().includes('duplicated entry')) {
      ctx.status = 200
      ctx.body = { ok: true, action: 'already-exists' }
      return
    }

    console.error('saveClient error:', e?.response?.data ?? e)

    ctx.status = e?.response?.status ?? 500
    ctx.body = { ok: false, error: mdMessage, details: e?.response?.data ?? null }
  }
}
