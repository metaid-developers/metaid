import { TxComposer, mvc } from 'meta-contract'

import {
  fetchUser,
  fetchBuzzes,
  fetchRootCandidate,
  fetchRoot,
  fetchUtxos,
  notify,
  type User,
  fetchTxid,
  fetchOneBuzz,
} from '@/service/mvc.js'
import { connected } from '@/decorators/connected.js'
import { buildRootOpreturn, buildOpreturn, buildUserOpreturn } from '@/utils/opreturn-builder.js'
import { errors } from '@/data/errors.js'
import { UTXO_DUST } from '@/data/constants.js'
import { checkBalance, sleep } from '@/utils/index.js'
import { type Transaction } from '@/wallets/metalet/mvcWallet.js'
import type { EntitySchema } from '@/metaid-entities/entity.js'
import type { MvcConnector } from '../../connector/mvc.js'

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
  private _root: Root
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

  get root() {
    return this._root
  }

  @connected
  public hasRoot() {
    return true
  }

  @connected
  public async getRoot(): Promise<Partial<Root>> {
    if (this._root) return this._root

    const root = await fetchRoot({
      metaid: this.metaid,
      nodeName: this.schema.nodeName,
      nodeId: this.schema.versions[0].id,
    })
    this._root = root

    if (!this._root) {
      const user = await fetchUser(this.metaid)

      if (user.metaid) {
        const protocolAddress = await this.connector.getAddress('/0/2')
        const rootCandidate = await fetchRootCandidate({
          xpub: this.connector.xpub,
          parentTxId: user.protocolTxid,
        })

        const { txid } = await this.createRoot({
          protocolAddress,
          protocolTxid: user.protocolTxid,

          candidatePublicKey: rootCandidate.publicKey,
        })

        await sleep(1000)

        // re fetch
        const root = await fetchRoot({
          metaid: this.metaid,
          nodeName: this.schema.nodeName,
          nodeId: this.schema.versions[0].id,
        })
        if (!root) throw new Error(errors.FAILED_TO_CREATE_ROOT)

        this._root = root
      }
    }

    return this._root
  }

  @connected
  private async createRoot({
    protocolAddress,
    protocolTxid,
    candidatePublicKey,
  }: {
    protocolAddress: string
    protocolTxid: string
    candidatePublicKey: string
  }) {
    const walletAddress = mvc.Address.fromString(this.connector.address, 'mainnet' as any)
    const transactions: Transaction[] = [] // apply pay

    let dustTxid = ''
    let dustValue = 0
    // 1.1 first, check if protocol address already has dust utxos;
    // if so, use it directly;
    const dusts = await fetchUtxos({ address: protocolAddress })
    if (dusts.length > 0) {
      dustTxid = dusts[0].txid
      dustValue = dusts[0].value
    } else {
      // 1.2 otherwise, send dust to root address
      if (!(await checkBalance(this.connector.address))) {
        throw new Error(errors.NOT_ENOUGH_BALANCE)
      }
      // apply pay
      const dustTxComposer = new TxComposer()
      dustTxComposer.appendP2PKHOutput({
        address: new mvc.Address(protocolAddress, 'mainnet' as any),
        satoshis: UTXO_DUST,
      })
      transactions.push({
        txComposer: dustTxComposer,
        message: 'Create link dust utxo',
      })
      // apply pay

      // const { txid } = await this.connector.send(protocolAddress, UTXO_DUST)
      dustTxid = dustTxComposer.getTxId()
      dustValue = UTXO_DUST
    }

    // 2. link tx
    let linkTxComposer = new TxComposer()
    linkTxComposer.appendP2PKHInput({
      address: mvc.Address.fromString(protocolAddress, 'mainnet' as any),
      txId: dustTxid,
      outputIndex: 0,
      satoshis: dustValue,
    })

    const metaidOpreturn = buildRootOpreturn({
      publicKey: candidatePublicKey,
      parentTxid: protocolTxid,
      schema: this.schema,
      body: undefined,
    })
    console.log('metaidOpreturn', metaidOpreturn)
    linkTxComposer.appendOpReturnOutput(metaidOpreturn)

    transactions.push({
      txComposer: linkTxComposer,
      message: 'Create Root',
    })

    /////////////
    // const biggestUtxo = await fetchBiggestUtxo({
    //   address: walletAddress.toString(),
    // })
    // linkTxComposer.appendP2PKHInput({
    //   address: walletAddress,
    //   txId: biggestUtxo.txid,
    //   outputIndex: biggestUtxo.outIndex,
    //   satoshis: biggestUtxo.value,
    // })

    // const tx = linkTxComposer.getTx()

    // linkTxComposer.appendChangeOutput(walletAddress, 1)

    // // save input-1's output for later use
    // const input1Output = linkTxComposer.getInput(1).output

    // linkTxComposer = await this.connector.signInput({
    //   txComposer: linkTxComposer,
    //   inputIndex: 0,
    // })

    // // reassign input-1's output
    // linkTxComposer.getInput(1).output = input1Output
    // linkTxComposer = await this.connector.signInput({
    //   txComposer: linkTxComposer,
    //   inputIndex: 1,
    // })
    // const { txid } = await this.connector.broadcast(linkTxComposer)

    // await notify({ txHex: linkTxComposer.getRawHex() })

    ///// apply pay
    const payRes = await this.connector.pay({
      transactions,
    })
    // for (const txComposer of payRes) {
    //   await this.connector.broadcast(txComposer)
    // }
    await this.connector.batchBroadcast({ txComposer: payRes, network: 'testnet' })
    await notify({ txHex: payRes[payRes.length - 1].getRawHex() })

    return {
      txid: payRes[payRes.length - 1].getTxId(),
    }
  }

  @connected
  async createMetaidRoot(
    parent: Partial<{
      address: string
      publicKey: string
      txid: string
      body: string
    }>,
    nodeName: string
  ) {
    const walletAddress = mvc.Address.fromString(this.connector.address, 'mainnet' as any)
    const transactions: Transaction[] = []

    // 1. send dust to root address

    let dustTxid = ''
    let dustValue = 0
    if (parent?.address) {
      // 1.1 first, check if root address already has dust utxos;
      // if so, use it directly;
      const dusts = await fetchUtxos({ address: parent.address })
      if (dusts.length > 0) {
        dustTxid = dusts[0].txid
        dustValue = dusts[0].value
      } else {
        // 1.2 otherwise, send dust to root address
        if (!(await checkBalance(this.connector.address))) {
          throw new Error(errors.NOT_ENOUGH_BALANCE)
        }
        const dustTxComposer = new TxComposer()
        dustTxComposer.appendP2PKHOutput({
          address: new mvc.Address(parent.address, 'mainnet' as any),
          satoshis: UTXO_DUST,
        })
        transactions.push({
          txComposer: dustTxComposer,
          message: 'Create link dust utxo',
        })

        const { txid } = await this.connector.send(parent.address, UTXO_DUST)
        dustTxid = dustTxComposer.getTxId()
        dustValue = UTXO_DUST
      }

      // const { txid } = await this.connector.send(parent.address, UTXO_DUST)
    }

    // 2. link tx
    let linkTxComposer = new TxComposer()
    if (dustTxid) {
      linkTxComposer.appendP2PKHInput({
        address: mvc.Address.fromString(parent.address, 'mainnet' as any),
        txId: dustTxid,
        outputIndex: 0,
        satoshis: dustValue,
      })
    }

    const metaidOpreturn = buildUserOpreturn({
      publicKey: parent.publicKey,
      parentTxid: parent?.txid,
      protocolName: nodeName,
      body: parent.body ? parent.body : 'NULL',
    })
    linkTxComposer.appendOpReturnOutput(metaidOpreturn)

    transactions.push({
      txComposer: linkTxComposer,
      message: `Create Root Metaid with ${nodeName}`,
    })

    // const biggestUtxo = await fetchBiggestUtxo({ address: walletAddress.toString() })
    // linkTxComposer.appendP2PKHInput({
    //   address: walletAddress,
    //   txId: biggestUtxo.txid,
    //   outputIndex: biggestUtxo.outIndex,
    //   satoshis: biggestUtxo.value,
    // })
    // linkTxComposer.appendChangeOutput(walletAddress, 1)

    // let input1Output: any
    // if (parent?.address) {
    //   // save input-1's output for later use
    //   input1Output = linkTxComposer.getInput(1).output
    // }

    // linkTxComposer = await this.connector.signInput({
    //   txComposer: linkTxComposer,
    //   inputIndex: 0,
    //   // path: parent.path, //"/0/0",
    // })
    // if (parent?.address) {
    //   linkTxComposer.getInput(1).output = input1Output
    //   linkTxComposer = await this.connector.signInput({
    //     txComposer: linkTxComposer,
    //     inputIndex: 1,
    //     // path: "/0/0",
    //   })
    // }

    // const { txid } = await this.connector.broadcast(linkTxComposer)
    // console.log('txid', txid)
    // await notify({ txHex: linkTxComposer.getRawHex() })

    // return { txid }
    ///// apply pay

    // const payRes = await this.connector.pay({
    //   transactions,
    // })

    // await this.connector.batchBroadcast(payRes)
    // await notify({ txHex: payRes[payRes.length - 1].getRawHex() })

    // return {
    //   txid: payRes[payRes.length - 1].getTxId(),
    // }

    return transactions
  }

  @connected
  public async create(
    body: unknown,
    options?: {
      invisible: boolean
      signMessage: string
      dataType?: string
      encoding?: string
      serialAction?: 'combo' | 'finish'
      transactions?: Transaction[]
    }
  ) {
    const root = await this.getRoot()
    const transactions: Transaction[] = options?.transactions ?? []

    let dustTxid = ''
    let dustValue = 0
    // 1.1 first, check if root address already has dust utxos;
    // if so, use it directly;
    const dusts = await fetchUtxos({ address: root.address })
    if (dusts.length > 0) {
      dustTxid = dusts[0].txid
      dustValue = dusts[0].value
    } else {
      // 1.2 otherwise, send dust to root address
      if (!(await checkBalance(this.connector.address))) {
        throw new Error(errors.NOT_ENOUGH_BALANCE)
      }

      const dustTxComposer = new TxComposer()
      dustTxComposer.appendP2PKHOutput({
        address: new mvc.Address(root.address, 'mainnet' as any),
        satoshis: UTXO_DUST,
      })
      transactions.push({
        txComposer: dustTxComposer,
        message: 'Create link dust utxo',
      })
      dustTxid = dustTxComposer.getTxId()
      dustValue = UTXO_DUST
    }

    // 2. link tx
    const randomPriv = new mvc.PrivateKey(undefined, 'mainnet')
    const randomPub = randomPriv.toPublicKey()

    let linkTxComposer = new TxComposer()
    linkTxComposer.appendP2PKHInput({
      address: mvc.Address.fromString(root.address, 'mainnet' as any),
      txId: dustTxid,
      outputIndex: 0,
      satoshis: dustValue,
    })

    const metaidOpreturn = buildOpreturn({
      publicKey: randomPub.toString(),
      parentTxid: root.txid,
      protocolName: this.schema.nodeName,
      body,
      invisible: options?.invisible,
      dataType: options?.dataType,
      encoding: options?.encoding,
    })
    linkTxComposer.appendOpReturnOutput(metaidOpreturn)

    transactions.push({
      txComposer: linkTxComposer,
      message: options.signMessage,
    })
    if (options?.serialAction === 'combo') {
      return { transactions }
    }

    ///// apply pay
    const payRes = await this.connector.pay({
      transactions,
    })
    // for (const txComposer of payRes) {
    //   await this.connector.broadcast(txComposer)
    // }
    await this.connector.batchBroadcast({ txComposer: payRes, network: 'testnet' })

    for (const p of payRes) {
      const txid = p.getTxId()
      const isValid = !!(await fetchTxid(txid))
      if (isValid) {
        await notify({ txHex: p.getRawHex() })
      } else {
        throw new Error('txid is not valid')
      }
    }
    return {
      txid: payRes[payRes.length - 1].getTxId(),
    }
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
