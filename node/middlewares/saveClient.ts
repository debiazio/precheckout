// node/middlewares/saveClient.ts
import type { ServiceContext } from '@vtex/api'
import coBody from 'co-body'

type Payload = { email?: string; homePhone?: string; orderFormId?: string }

const DEFAULT_BIRTHDATE = '1900-01-01' // placeholder para passar no campo obrigatório do CL

export async function saveClient(ctx: ServiceContext, next: () => Promise<void>) {
  const body = (await coBody.json(ctx.req)) as Payload
  const email = body?.email?.trim()
  const homePhone = body?.homePhone?.trim()
  const orderFormId = body?.orderFormId?.trim()
  const createdAt = new Date().toISOString()

  if (!email || !homePhone) {
    ctx.status = 400
    ctx.body = { error: 'email e telefone são obrigatórios' }
    return
  }

  const dataEntity = 'CL'

  // 1) Procura por email no CL
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
    // 2) Se já existe, atualiza telefone + rastreio
    await ctx.clients.masterdata.updatePartialDocument({
      dataEntity,
      id: found[0].id,
      fields: {
        homePhone,
        orderFormId,
        preCheckoutCapturedAt: createdAt,
      },
    })

    ctx.status = 200
    ctx.body = { ok: true, action: 'updated', id: found[0].id }
    await next()
    return
  }

  // 3) Se não existe, cria preenchendo o campo obrigatório dataNascimento
  const res = await ctx.clients.masterdata.createDocument({
    dataEntity,
    fields: {
      email,
      homePhone,
      orderFormId,
      preCheckoutCapturedAt: createdAt,
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
}
