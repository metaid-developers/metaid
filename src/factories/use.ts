import { MvcConnector } from '@/core/connector/mvc.js'
import { BtcEntity } from '@/core/entity/btc/index.js'
import { MvcEntity } from '@/core/entity/mvc/index.js'
import type { BtcEntity as IBtcEntity } from '@/core/entity/btc/index.js'
import type { MvcEntity as IMvcEntity } from '@/core/entity/mvc/index.js'
import type { EntitySchema } from '@/metaid-entities/entity.js'
import type { BtcConnector } from '@/core/connector/btc'

export async function useMvc(entitySymbol: string, options?: { connector?: MvcConnector }): Promise<IMvcEntity> {
  const entitySchema: EntitySchema = await import(`../metaid-entities/${entitySymbol}.entity.ts`).then(
    (module) => module.default
  )
  let entity

  entity = new MvcEntity(entitySchema.name, entitySchema)
  if (options?.connector) {
    entity.connector = options.connector
  }
  return entity
}

export async function useBtc(entitySymbol: string, options?: { connector?: BtcConnector }): Promise<IBtcEntity> {
  const entitySchema: EntitySchema = await import(`../metaid-entities/${entitySymbol}.entity.ts`).then(
    (module) => module.default
  )
  let entity

  entity = new BtcEntity(entitySchema.name, entitySchema)
  if (options?.connector) {
    entity.connector = options.connector
  }
  return entity
}
