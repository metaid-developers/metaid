import { staticImplements } from '@/utils/index.js'
import type { MetaIDWalletForBtc, WalletStatic } from './btcWallet.js'
import { TxComposer, mvc } from 'meta-contract'
import { errors } from '@/data/errors.js'
import { broadcast as broadcastToApi, batchBroadcast as batchBroadcastApi } from '@/service/mvc.js'
import { DERIVE_MAX_DEPTH } from '@/data/constants.js'

import { isNil } from 'ramda'
import { BtcNetwork } from '@/service/btc.js'

@staticImplements<WalletStatic>()
export class MetaletWalletForBtc implements MetaIDWalletForBtc {
  public address: string
  public pub: string
  public network: BtcNetwork

  public internal: Window['metaidwallet']
  private constructor() {}

  static async create(): Promise<MetaIDWalletForBtc> {
    // if it's not in the browser, throw an error
    if (typeof window === 'undefined') {
      throw new Error(errors.NOT_IN_BROWSER)
    }

    // get xpub from metalet

    const pub: string = await window.metaidwallet.btc.getPublicKey()

    const wallet = new MetaletWalletForBtc()

    const connectRes = await window.metaidwallet.btc.connect()
    if (!isNil(connectRes?.address)) {
      wallet.address = connectRes.address
      wallet.pub = pub
      wallet.internal = window.metaidwallet
      wallet.network = (await window.metaidwallet.getNetwork()).network
    }

    return wallet
  }

  static restore({
    address,
    pub,
    internal,
  }: {
    address: string
    pub: string
    internal?: Window['metaidwallet']
  }): MetaIDWalletForBtc {
    if (typeof window === 'undefined') {
      throw new Error(errors.NOT_IN_BROWSER)
    }
    const wallet = new MetaletWalletForBtc()
    wallet.address = address
    wallet.pub = pub
    wallet.internal = internal ?? window.metaidwallet
    return wallet
  }

  public hasAddress() {
    return !!this.address
  }

  public async getAddress({ path }: { path?: string }) {
    if (!path) return this.address

    return await this.internal.btc.getAddress()
  }

  public async inscribe({ data, options }: { data: any; options?: { noBroadcast: boolean } }): Promise<any> {
    return await this.internal.btc.inscribe({ data, options })
  }

  public async getPublicKey(path: string = '/0/0') {
    return await this.internal.btc.getPublicKey()
  }

  public async getBalance() {
    return await this.internal.btc.getBalance()
  }

  // public async signMessage(message): Promise<string> {
  //   const signature = await this.internal.btc.signMessage(message)
  //   return signature
  // }

  // public async signPsbt(psbtHex: string, options?: any): Promise<string> {
  //   return await this.internal.btc.signPsbt({ psbtHex, options })
  // }

  // public async broadcast(txComposer: TxComposer): Promise<{ txid: string }> {
  //   // broadcast locally first
  //   const txHex = txComposer.getTx().toString()
  //   return await broadcastToApi({ txHex })
  // }

  // public async batchBroadcast(txComposer: TxComposer[]): Promise<{ txid: string }[]> {
  //   // broadcast locally first
  //   const hexs = txComposer.map((d) => {
  //     return { hex: d.getTx().toString() }
  //   })
  //   return await batchBroadcastApi(hexs)
  // }
}
