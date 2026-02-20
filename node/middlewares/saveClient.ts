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

    const found = await ctx.clients.masterdata.searchDocuments<{
      id: string
      email: string
    }>({
      dataEntity,
      fields: ['id', 'email'],
      where: `email=${email}`,
      pagination: { page: 1, pageSize: 1 },
    })

    if (found?.length) {
      await ctx.clients.masterdata.updatePartialDocument({
        dataEntity,
        id: found[0].id,
        fields: {
          homePhone,
          orderFormId,
        },
      })

      ctx.status = 200
      ctx.body = { ok: true, action: 'updated', id: found[0].id }
      await next()
      return
    }

    const res = await ctx.clients.masterdata.createDocument({
      dataEntity,
      fields: {
        email,
        homePhone,
        orderFormId,
        dataNascimento: DEFAULT_BIRTHDATE,
      },
    })

    ctx.status = 200
    ctx.body = {
      ok: true,
      action: 'created',
      id: (res as any)?.DocumentId ?? (res as any)?.Id ?? (res as any)?.id,
    }

    await next()
  } catch (err) {
    // LOG no node (aparece no vtex link)
    const e: any = err
    console.error('saveClient error:', e?.response?.data ?? e)

    const status = e?.response?.status ?? 500
    const mdMessage =
      e?.response?.data?.Message ??
      e?.response?.data?.message ??
      e?.message ??
      'Erro interno'

    ctx.status = status
    ctx.body = {
      ok: false,
      error: mdMessage,
      details: e?.response?.data ?? null,
    }
  }
}
