// node/clients/index.ts
import { IOClients } from '@vtex/api'

/**
 * Agrega todos os clients (HTTP) disponíveis no contexto do serviço
 * (`ctx.clients`).
 *
 * Esta classe estende `IOClients`, que já fornece nativamente os clients
 * padrão da plataforma VTEX (ex.: `masterdata`, `catalog`, `logistics`, etc.)
 * sem necessidade de declaração explícita.
 *
 * Clients customizados (que estendem `ExternalClient`, como `Status`)
 * devem ser declarados aqui como getters para ficarem acessíveis via
 * `ctx.clients.<nome>`.
 *
 * @example
 * // Para registrar um client customizado:
 * export class Clients extends IOClients {
 *   public get status() {
 *     return this.getOrSet('status', Status)
 *   }
 * }
 */
export class Clients extends IOClients {}
