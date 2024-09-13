import { TxComposer, mvc } from 'meta-contract'

import {
  fetchUser,
  fetchBuzzes,
  fetchRootCandidate,
  fetchRoot,
  fetchUtxos,
  notify,
  type User,
  fetchOneBuzz,
} from '@/service/mvc.js'
import { connected } from '@/decorators/connected.js'
import { buildRootOpreturn, buildOpreturn, buildUserOpreturn } from '@/utils/opreturn-builder.js'
import { errors } from '@/data/errors.js'
import { UTXO_DUST } from '@/data/constants.js'
import { type Transaction } from '@/wallets/metalet/mvcWallet.js'
import type { EntitySchema } from '@/metaid-entities/entity.js'
import type { MvcConnector } from '../../connector/mvc.js'
import { SubMetaidData } from '@/types/index.js'
import { BtcNetwork } from '@/service/btc.js'

type Root = {
  id: string
  nodeName: string
  address: string
  txid: string
  publicKey: string
  parentTxid: string
  parentPublicKey: string
  version: string
  createdAt: number
}

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
    data: SubMetaidData
    options: {
      network?: BtcNetwork
      signMessage?: string
      serialAction?: 'combo' | 'finish'
      transactions?: Transaction[]
    }
  }) {
    const path = this.schema.path
    // console.log('pin path', path)
    const _options = { ...options, network: options.network ?? 'testnet' }
    const res = await this.connector.createPin({ ...data, operation: 'create', path }, _options)
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
