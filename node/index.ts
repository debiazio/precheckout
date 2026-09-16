// node/index.ts
import { Service, method } from '@vtex/api'
import type { ClientsConfig } from '@vtex/api'
import { Clients } from './clients'
import { saveClient } from './middlewares/saveClient'

/** Timeout padrão (em ms) aplicado a todas as chamadas dos clients. */
const TIMEOUT_MS = 10_000

/**
 * Configuração dos clients disponíveis no contexto do serviço (`ctx.clients`).
 *
 * - `implementation`: classe que agrega todos os clients customizados (ver `./clients`).
 * - `options.default`: opções padrão aplicadas a todos os clients (timeout e
 *   número de retentativas em falhas de rede).
 */
const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
    },
  },
}

/**
 * Serviço VTEX IO (Node) do app `precheckout`.
 *
 * Define os clients disponíveis e as rotas HTTP expostas pelo backend.
 *
 * Rotas registradas:
 * - `POST /_v/precheckout/client` → middleware {@link saveClient}, responsável
 *   por validar e persistir os dados de contato do cliente na Data Entity
 *   `CL` do Master Data VTEX.
 *
 * O nome da rota (`saveClient`) deve corresponder à chave definida em
 * `manifest.json` (`routes.saveClient.path`).
 */
export default new Service({
  clients,
  routes: {
    saveClient: method({
      POST: [saveClient],
    }),
  },
}) as any
