// node/middlewares/saveClient.ts
import type { ServiceContext } from '@vtex/api'
import coBody from 'co-body'

/**
 * Payload esperado no corpo da requisição POST.
 */
type Payload = {
  /** E-mail do cliente. */
  email?: string
  /** Telefone do cliente (nome preferencial do campo). */
  homePhone?: string
  /** Telefone do cliente (alias aceito por compatibilidade, caso `homePhone` não seja enviado). */
  phone?: string
  /** ID do orderForm (carrinho) do VTEX Checkout associado ao cadastro. */
  orderFormId?: string
}

/** Data de nascimento padrão usada quando o valor real não é coletado no formulário. */
const DEFAULT_BIRTHDATE = '1900-01-01'

/**
 * Pausa a execução por um tempo determinado.
 *
 * @param ms - Tempo de espera em milissegundos.
 * @returns Promise resolvida após o tempo especificado.
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extrai uma mensagem de erro legível a partir de diferentes formatos de
 * exceção (erros HTTP do Master Data, erros nativos do JS, etc.).
 *
 * @param err - Objeto de erro capturado (tipo `any` por vir de fontes heterogêneas).
 * @returns Mensagem de erro legível, ou `'Erro interno'` como fallback.
 */
function getErrorMessage(err: any) {
  return (
    err?.response?.data?.Message ??
    err?.response?.data?.message ??
    err?.message ??
    'Erro interno'
  )
}

/**
 * Cria um documento de cliente na Data Entity `CL` do Master Data (VTEX),
 * com retentativas automáticas em caso de falha.
 *
 * Comportamento especial:
 * - Se o Master Data retornar erro de "duplicated entry" (cliente já
 *   cadastrado com esse e-mail/telefone), a função **não lança erro** e
 *   retorna `{ ok: true, action: 'already-exists' }`.
 * - Em outros erros, tenta novamente até `retries` vezes, com delay
 *   crescente (`delayMs * tentativa`).
 *
 * @param ctx - Contexto do serviço VTEX IO (contém os clients, incluindo `masterdata`).
 * @param payload - Dados do cliente a serem persistidos.
 * @param payload.email - E-mail do cliente.
 * @param payload.homePhone - Telefone do cliente.
 * @param payload.orderFormId - ID do carrinho associado (opcional).
 * @param retries - Número máximo de tentativas adicionais em caso de erro. Padrão: 2.
 * @param delayMs - Delay base (ms) entre tentativas. Padrão: 400.
 * @returns Objeto indicando sucesso e a ação realizada: `'created'` ou `'already-exists'`.
 * @throws Repassa o último erro capturado se todas as tentativas falharem
 *         (exceto em caso de "duplicated entry").
 */
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

/**
 * Middleware da rota `POST /_v/precheckout/client`.
 *
 * Fluxo:
 * 1. Lê e valida o corpo da requisição (`email` e `homePhone`/`phone` são obrigatórios).
 * 2. Se algum campo obrigatório estiver ausente, responde `400` com mensagem de erro.
 * 3. Caso contrário, tenta criar o documento do cliente no Master Data
 *    (via {@link createClientWithRetry}).
 * 4. Em caso de sucesso, responde `200` com `{ ok: true, action }`.
 * 5. Em caso de erro não tratado, loga o erro no console, responde com o
 *    status HTTP do erro original (ou `500` como fallback) e um corpo
 *    contendo `{ ok: false, error, details }`.
 *
 * @param ctx - Contexto da requisição VTEX IO (`ctx.req`, `ctx.clients`, `ctx.status`, `ctx.body`).
 * @param next - Função para passar o controle ao próximo middleware da cadeia.
 * @returns Promise que resolve quando a resposta HTTP é montada.
 */
export async function saveClient(ctx: ServiceContext, next: () => Promise<void>) {
  try {
    const body = (await coBody.json(ctx.req)) as Payload

    const email = body?.email?.trim()
    const homePhone = (body?.homePhone ?? body?.phone ?? '').trim()
    const orderFormId = body?.orderFormId?.trim()

    if (!email) {
      ctx.status = 400
      ctx.body = { ok: false, error: 'email é obrigatório' }
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
