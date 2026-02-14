import { Service, method } from '@vtex/api'
import type { ClientsConfig } from '@vtex/api'
import { Clients } from './clients'
import { saveClient } from './middlewares/saveClient'

const TIMEOUT_MS = 10_000

const clients: ClientsConfig<Clients> = {
  implementation: Clients,
  options: {
    default: {
      retries: 2,
      timeout: TIMEOUT_MS,
    },
  },
}

export default new Service({
  clients,
  routes: {
    saveClient: method({
      POST: [saveClient],
    }),
  },
}) as any
