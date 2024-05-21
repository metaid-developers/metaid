import { MvcConnector } from '@/core/connector/mvc.js'
import type { BtcConnector } from '@/core/connector/btc'

import { BtcEntity } from '@/core/entity/btc/index.js'
import { MvcEntity } from '@/core/entity/mvc/index.js'

import { type EntitySchema } from '@/metaid-entities/entity.js'

import type { BtcEntity as IBtcEntity } from '@/core/entity/btc/index.js'
import type { MvcEntity as IMvcEntity } from '@/core/entity/mvc/index.js'

export async function loadMvc(entitySchema: EntitySchema, options?: { connector?: MvcConnector }): Promise<IMvcEntity> {
  let entity
  entity = new MvcEntity(entitySchema.name, entitySchema)

  if (options?.connector) {
    entity.connector = options.connector
  }
  return entity
}

export async function loadBtc(entitySchema: EntitySchema, options?: { connector?: BtcConnector }): Promise<IBtcEntity> {
  let entity
  entity = new BtcEntity(entitySchema.name, entitySchema)

  if (options?.connector) {
    entity.connector = options.connector
  }
  return entity
}
