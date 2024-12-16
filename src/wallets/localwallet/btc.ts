import { staticImplements } from '@/utils/index.js'
import type { MetaIDWalletForBtc, WalletStatic } from '../metalet/btcWallet.js'
import { errors } from '@/data/errors.js'

import { isNil } from 'ramda'
import { BtcNetwork } from '@/service/btc.js'
import { MetaletWalletForBtc } from '../metalet/btc.js'

@staticImplements<WalletStatic>()
export class LocalWalletForBtc implements MetaIDWalletForBtc {
  private mnemonic: string
  private derivePath: string
  internal: any | undefined
  public address: string
  public pub: string
  public network: BtcNetwork

  private constructor(mnemonic: string, derivePath: string = `m/44'/1'/0'/0/0`) {
    this.mnemonic = mnemonic
    this.derivePath = derivePath
  }

  static async create(mnemonic: string, derivePath: string): Promise<MetaIDWalletForBtc> {
    const wallet = new LocalWalletForBtc(mnemonic, derivePath)

    const connectRes = await window.metaidwallet.btc.connect()
    if (!isNil(connectRes?.address)) {
      wallet.address = connectRes.address
      wallet.pub = connectRes.pubKey
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
