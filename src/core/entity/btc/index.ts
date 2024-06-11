import { connected } from '@/decorators/connected.js'
import type { EntitySchema } from '@/metaid-entities/entity.js'
import {
  inscribePsbt,
  type InscribePsbts,
  type Operation,
  type PrevOutput,
} from '../../../utils/btc-inscribe/inscribePsbt.js'
import { Psbt } from '../../../utils/btc-inscribe/bitcoinjs-lib/psbt.js'

import * as bitcoin from '../../../utils/btc-inscribe/bitcoinjs-lib/index.js'
import { BtcNetwork, fetchUtxos, getAllPinByPath, getPinDetailByPid, getPinListByAddress, Pin } from '@/service/btc.js'
import { errors } from '@/data/errors.js'
import type { BtcConnector, InscribeResultForIfBroadcasting } from '@/core/connector/btc.js'
import { isNil } from 'ramda'

import BIP32Factory, { type BIP32Interface } from 'bip32'
import * as bip39 from 'bip39'
// import * as ecc from 'tiny-secp256k1'
import { taprootFinalInput, taprootSignInput } from '../../../utils/btc-inscribe/btcUtils.js'
import { SubMetaidData, MetaidData } from '@/types/index.js'

// const bip32 = BIP32Factory(ecc)

export type InscribeData = Omit<MetaidData, 'revealAddr'>

export class BtcEntity {
  public connector: BtcConnector
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

  public async one({ pid, network }: { pid: string; network: BtcNetwork }): Promise<Pin> {
    // const pins = await getPinListByAddress({ address: 'tb1qlwvue3swm044hqf7s3ww8um2tuh0ncx65a6yme' })
    const path = this.schema.path
    return await getPinDetailByPid({ pid, network: network ?? this.connector.network })
  }

  //cursor  == (page - 1) * size
  public async list({
    page,
    limit,
    network,
    address,
  }: {
    page: number
    limit: number
    network?: BtcNetwork
    address?: string
  }): Promise<Pin[]> {
    // const pins = await getPinListByAddress({ address: 'tb1qlwvue3swm044hqf7s3ww8um2tuh0ncx65a6yme' })
    const path = this.schema.path
    if (!isNil(address)) {
      const pins = await getPinListByAddress({
        address: address,
        cursor: ((Number(page) - 1) * Number(limit)).toString(),
        size: limit.toString(),
        network: network ?? 'testnet',
      })
      return pins.list.filter((d) => d.path.includes(this.schema.path))
    }

    const pins = await getAllPinByPath({ path, page, limit, network: network ?? this.connector.network })
    return pins.currentPage.filter((d) => d.path.includes(this.schema.path))
  }

  public async total({ network }: { network?: BtcNetwork }): Promise<number> {
    const path = this.schema.path
    const pins = await getAllPinByPath({ path, page: 1, limit: 2, network: network ?? this.connector.network })
    return pins.total
  }

  // //////////////////////////////////////// to be deleted method ///////////////////////////////////
  // public async getPins({ page, limit }: { page: number; limit: number }): Promise<Pin[]> {
  //   // const pins = await getPinListByAddress({ address: 'tb1qlwvue3swm044hqf7s3ww8um2tuh0ncx65a6yme' })
  //   const path = this.schema.path
  //   const pins = await getAllPinByPath({ path, page, limit, network: this.connector.network })
  //   return pins.currentPage.filter((d) => d.path.includes(this.schema.path))
  // }

  // public async calcPins(): Promise<number> {
  //   const path = this.schema.path
  //   const pins = await getAllPinByPath({ path, page: 1, limit: 2, network: this.connector.network })
  //   return pins.total
  // }
  ///////////////////////////////////////// to be deleted method ///////////////////////////////////

  @connected
  public async create<T extends keyof InscribeResultForIfBroadcasting>({
    data,
    options,
  }: {
    data: SubMetaidData[]
    options: {
      noBroadcast: T
      feeRate?: number
      service?: {
        address: string
        satoshis: string
      }
    }
  }): Promise<InscribeResultForIfBroadcasting[T]> {
    const path = this.schema.path
    // console.log('pin path', path)
    const res = await this.connector.inscribe({
      inscribeDataArray: data.map((d) => ({ ...d, operation: 'create', path })),
      options,
    })

    return res
  }

  @connected
  public async inscribeOld(
    operation: Operation,
    address: string,
    netWork: bitcoin.networks.Network,
    options?: InscribeData | undefined
  ) {
    //   const faucetUtxos = await fetchUtxos({
    //     address: address,
    //     network: 'testnet',
    //   })
    //   const toUseUtxo = faucetUtxos[0] // presume toUseUtxo.value >= 11546
    //   console.log('to use utxo have satoshi', toUseUtxo.satoshi)
    //   const pub = await this.connector.getPublicKey(`m/86'/0'/0'/0/0`)
    //   const commitTxPrevOutputList: PrevOutput[] = [
    //     {
    //       txId: toUseUtxo.txId,
    //       vOut: toUseUtxo.vout,
    //       amount: toUseUtxo.satoshi,
    //       address: address,
    //       pub,
    //     },
    //   ]
    //   const metaidDataList: MetaidData[] = [
    //     {
    //       operation,
    //       revealAddr: address,
    //       body: options?.body,
    //       path: options?.path,
    //       contentType: options?.contentType,
    //       encryption: options?.encryption,
    //       version: '1.0.0', //this._schema.versions[0].version.toString(),
    //       encoding: options?.encoding,
    //     },
    //   ]
    //   const request: InscriptionRequest = {
    //     commitTxPrevOutputList,
    //     commitFeeRate: 1,
    //     revealFeeRate: 1,
    //     revealOutValue: 546,
    //     metaidDataList,
    //     changeAddress: address,
    //   }
    //   console.log('request', request)
    //   const psbts: InscribePsbts = inscribePsbt(netWork, request)
    //   if (psbts.commitPsbt === '') {
    //     alert(errors.NOT_ENOUGH_BALANCE)
    //     throw new Error(errors.NOT_ENOUGH_BALANCE)
    //   }
    //   console.log('all psbts', psbts)
    //   console.log('treehash', psbts.hash!.toString('hex'))
    //   const commitPsbtHex = psbts.commitPsbt
    //   const signCommitPsbt = await this.connector.signPsbt(commitPsbtHex)
    //   console.log('has sign commit success', signCommitPsbt !== psbts.commitPsbt)
    //   const signedCommit = Psbt.fromHex(signCommitPsbt)
    //   console.log('signed commit psbt', { signed: signedCommit })
    //   const signCommitTxHex = Psbt.fromHex(signCommitPsbt, { network: netWork }).extractTransaction().toHex()
    //   const commitRes = await this.connector.broadcast(
    //     signCommitTxHex,
    //     'testnet',
    //     Buffer.from(pub, 'hex').toString('hex'),
    //     'commit tx'
    //   )
    //   console.log('commit res', commitRes)
    //   const revealPsbtHex = psbts.revealPsbts[0]
    //   /////////// ////// sign local test
    //   const memonic = 'vacant cheap figure menu damp gorilla antique hat hero afford egg magnet'
    //   const seed = bip39.mnemonicToSeedSync(memonic)
    //   const btcPath = `m/86'/0'/0'/0/0`
    //   const internalKey = bip32.fromSeed(seed, bitcoin.networks.testnet)
    //   const keyPairs = internalKey.derivePath(btcPath)
    //   const rootAddress = bitcoin.payments.p2tr({
    //     internalPubkey: keyPairs.publicKey.slice(1),
    //     network: bitcoin.networks.testnet,
    //   }).address
    //   console.log('rootAddress', rootAddress)
    //   const tweakedSigner = keyPairs.tweak(
    //     bitcoin.crypto.taggedHash('TapTweak', Buffer.concat([keyPairs.publicKey.slice(1), psbts.hash!]))
    //   )
    //   const revealPsbt = Psbt.fromHex(revealPsbtHex)
    //   let signedRevealPsbt = revealPsbt.clone()
    //   console.log('111')
    //   signedRevealPsbt = taprootSignInput(signedRevealPsbt, 0, tweakedSigner, psbts.hash!, [1])
    //   console.log('222')
    //   signedRevealPsbt = taprootFinalInput(signedRevealPsbt, 0, psbts.revealFn!)
    //   // const signedRevealPsbt = revealPsbt.signInput(0, tweakedSigner, [0])
    //   // signedRevealPsbt.finalizeInput(0, psbts.revealFn!)
    //   console.log('sign revel res', signedRevealPsbt)
    //   const signedRevealPsbtHex = signedRevealPsbt.toHex()
    //   const signedRevealTx = signedRevealPsbt.extractTransaction()
    //   const signRevealTxHex = signedRevealTx.toHex()
    //   //////////////////////////
    //   ///////////////////////// sign use wallet
    //   // const signedRevealPsbtHex = await this.connector.signPsbt(revealPsbtHex, {
    //   //   autoFinalized: false,
    //   //   toSignInputs: [
    //   //     {
    //   //       index: 0,
    //   //       publicKey: pub,
    //   //       sighashTypes: [1],
    //   //       treehash: psbts.hash!.toString('hex'),
    //   //     },
    //   //   ],
    //   // })
    //   // const signedRevealPsbt = Psbt.fromHex(signedRevealPsbtHex, { network: netWork })
    //   //////////////////////////
    //   console.log('unsinged reveal psbt hex', psbts.revealPsbts[0])
    //   console.log('signed reveal  ', { psbt: signedRevealPsbt, tx: signedRevealTx })
    //   console.log('has sign reveal success', signedRevealPsbtHex !== psbts.revealPsbts[0])
    //   // // /////////////////use revealFn add witness
    //   // const signedRevealTx = signedRevealPsbt.finalizeInput(0, psbts.revealFn!).extractTransaction()
    //   //  console.log('my func ', psbts.revealFn!)
    //   // manual add witness
    //   // const signedRevealTx = signedRevealPsbt.extractTransaction()
    //   // const signature = signedRevealTx.ins[0].witness
    //   // signedRevealTx.ins[0].witness = [...signature, ...psbts.witness!]
    //   // console.log('sing reveal tx  ', signedRevealTx)
    //   // const signRevealTxHex = signedRevealTx.toHex()
    //   // console.log('sign tx', signRevealTxHex)
    //   /////////////// broadcast reveal tx
    //   const revealRes = await this.connector.broadcast(
    //     signRevealTxHex,
    //     'testnet',
    //     Buffer.from(pub, 'hex').toString('hex'),
    //     'reveal tx'
    //   )
    //   console.log('reveal res', revealRes)
    //   if (!isNil(revealRes?.data)) {
    //     alert('inscribe success')
    //     return revealRes.data
    //   }
  }
}
