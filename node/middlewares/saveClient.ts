import type { ServiceContext } from '@vtex/api'
import coBody from 'co-body'

export async function saveClient(ctx: ServiceContext, next: () => Promise<void>) {
  const body = (await coBody.json(ctx.req)) as { email?: string; phone?: string }
  const { email, phone } = body ?? {}

  if (!email || !phone) {
    ctx.status = 400
    ctx.body = { error: 'email e phone são obrigatórios' }
    return
  }

  const res = await ctx.clients.masterdata.createDocument({
    dataEntity: 'CL',
    fields: { email, phone },
  })

  ctx.status = 200
  ctx.body = { ok: true, id: (res as any)?.DocumentId ?? (res as any)?.Id ?? (res as any)?.id }

  await next()
}
