import { fetchBuzzes, fetchOneBuzz } from '@/service/mvc.js'
import { connected } from '@/decorators/connected.js'
import { errors } from '@/data/errors.js'
import { type Transaction } from '@/wallets/metalet/mvcWallet.js'
import type { EntitySchema } from '@/metaid-entities/entity.js'
import type { MvcConnector } from '../../connector/mvc.js'
import { MetaidData } from '@/types/index.js'
import { BtcNetwork } from '@/service/btc.js'

export class MvcEntity {
  public connector: MvcConnector
  public _name: string
  public _schema: EntitySchema
  constructor(name: string, schema: EntitySchema) {
    this._name = name
    this._schema = schema
  }

  get name() {
    return this._name
  }

  get schema() {
    return this._schema
  }

  public isConnected() {
    return this.connector?.isConnected() ?? false
  }

  public disconnect() {
    this.connector?.disconnect()
  }

  get address() {
    return this.connector?.address
  }

  get metaid() {
    return this.connector?.metaid
  }

  @connected
  public async create({
    data,
    options,
  }: {
    data: MetaidData
    options: {
      network?: BtcNetwork
      signMessage?: string
      serialAction?: 'combo' | 'finish'
      transactions?: Transaction[]
      service?: {
        address: string
        satoshis: string
      }
      outputs?: {
        address: string
        satoshis: string
      }[]
    }
  }) {
    const path = data?.path ?? this.schema.path
    const operation = data.operation ?? 'create'
    // console.log('pin path', path)
    const _options = { ...options, network: options.network ?? 'testnet' }
    const res = await this.connector.createPin({ ...data, operation, path, }, _options)
    console.log('res', res)

    return res
  }

  public async list(page: number) {
    if (this.name !== 'buzz') throw new Error(errors.NOT_SUPPORTED)

    const items = await fetchBuzzes({ metaid: this.metaid, page })

    return {
      items,
      limit: 50,
    }
  }
  public async one(txid: string) {
    if (this.name !== 'buzz') throw new Error(errors.NOT_SUPPORTED)

    const buzz = await fetchOneBuzz(txid)

    return buzz
  }
}
