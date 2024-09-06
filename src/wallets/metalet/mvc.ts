import { staticImplements } from '@/utils/index.js'
import type { MetaIDWalletForMvc, Transaction, WalletStatic } from './mvcWallet.js'
import { TxComposer, mvc } from 'meta-contract'
import { errors } from '@/data/errors.js'
import { broadcast as broadcastToApi, batchBroadcast as batchBroadcastApi } from '@/service/mvc.js'
import { DERIVE_MAX_DEPTH } from '@/data/constants.js'
import { isNil } from 'ramda'
import { BtcNetwork } from '@/service/btc.js'

@staticImplements<WalletStatic>()
export class MetaletWalletForMvc implements MetaIDWalletForMvc {
  public address: string
  public xpub: string
  public network: BtcNetwork

  private internal: any
  private constructor() {}

  static async create(): Promise<MetaIDWalletForMvc> {
    // if it's not in the browser, throw an error
    if (typeof window === 'undefined') {
      throw new Error(errors.NOT_IN_BROWSER)
    }

    const wallet = new MetaletWalletForMvc()

    const connectRes = await window.metaidwallet.connect()
    if (!isNil(connectRes?.address)) {
      wallet.address = connectRes.address
      // get xpub from metalet
      const xpub: string = await window.metaidwallet.getXPublicKey()
      wallet.xpub = xpub
      wallet.internal = window.metaidwallet
    }

    return wallet
  }

  static restore({ address, xpub }: { address: string; xpub: string }): MetaIDWalletForMvc {
    if (typeof window === 'undefined') {
      throw new Error(errors.NOT_IN_BROWSER)
    }
    const wallet = new MetaletWalletForMvc()
    wallet.address = address
    wallet.xpub = xpub
    wallet.internal = window.metaidwallet
    return wallet
  }

  public hasAddress() {
    return !!this.address
  }

  public async getAddress({ path }: { path?: string }) {
    if (!path) return this.address

    // cut the first slash for compatibility
    return await this.internal.getAddress({ path: path.slice(1) })

    // if (this.blockchain === 'btc') {
    //   return await this.internal.btc.getAddress()
    // }
  }

  public async getPublicKey(path: string = '/0/0') {
    // cut the first slash for compatibility
    return await this.internal.getPublicKey({ path: path.slice(1) })

    // if (this.blockchain === 'btc') {
    //   return await this.internal.btc.getPublicKey()
    // }
  }

  public async getBalance() {
    return await this.internal.getBalance()

    // if (this.blockchain === 'btc') {
    //   return await this.internal.btc.getBalance()
    // }
  }

  public async signMessage(message, encoding): Promise<string> {
    const { signature } = await this.internal.signMessage({
      message,
      encoding,
    })
    return signature.signature

    // if (this.blockchain === 'btc') {
    //   const { signature } = await this.internal.btc.signMessage({
    //     message,
    //     encoding,
    //   })
    //   return signature.signature
    // }
  }

  public async signInput({ txComposer, inputIndex }: { txComposer: TxComposer; inputIndex: number }) {
    const prevOutput = txComposer.getInput(inputIndex).output
    if (!prevOutput) throw new Error(errors.NO_OUTPUT)

    const outputScript = prevOutput.script
    const address = outputScript.toAddress().toString()
    const satoshis = prevOutput.satoshis

    // get xpub from metalet
    const xpubObj = mvc.HDPublicKey.fromString(this.xpub)
    // loop through the path and derive the private key
    let deriver = 0
    let toUsePath: string
    while (deriver < DERIVE_MAX_DEPTH) {
      const childAddress = xpubObj
        .deriveChild(0)
        .deriveChild(deriver)
        .publicKey.toAddress('mainnet' as any)
        .toString()

      if (childAddress === address) {
        toUsePath = `0/${deriver}`
        break
      }

      deriver++
    }
    if (!toUsePath) throw new Error(errors.CANNOT_DERIVE_PATH)

    // cut the first slash for compatibility
    const { signedTransactions } = await this.internal.signTransactions({
      transactions: [
        {
          txHex: txComposer.getTx().toString(),
          inputIndex,
          scriptHex: outputScript.toHex(),
          path: toUsePath,
          satoshis,
          // sigtype: 0xc1,
        },
      ],
    })

    // update the txComposer
    const signedTx = new mvc.Transaction(signedTransactions[0].txHex)

    return new TxComposer(signedTx)
  }

  public async pay({ transactions }: { transactions: Transaction[] }) {
    const {
      payedTransactions,
    }: {
      payedTransactions: string[]
    } = await this.internal.pay({
      transactions: transactions.map((transaction) => {
        return {
          txComposer: transaction.txComposer.serialize(),
          message: transaction.message,
        }
      }),
      hasMetaid: true,
    })

    return payedTransactions.map((txComposerSerialized: string) => {
      return TxComposer.deserialize(txComposerSerialized)
    })
  }

  public async send(
    toAddress: string,
    amount: number
  ): Promise<{
    txid: string
  }> {
    const sendRes = await this.internal.transfer({
      tasks: [
        {
          receivers: [
            {
              address: toAddress,
              amount,
            },
          ],
        },
      ],
    })

    return {
      txid: sendRes.txids[0],
    }
  }

  public async broadcast({
    txComposer,
    network,
  }: {
    txComposer: TxComposer
    network: BtcNetwork
  }): Promise<{ txid: string }> {
    // broadcast locally first
    const txHex = txComposer.getTx().toString()
    return await broadcastToApi({ txHex, network })
  }

  public async batchBroadcast({
    txComposer,
    network,
  }: {
    txComposer: TxComposer[]
    network: BtcNetwork
  }): Promise<{ txid: string }[]> {
    // broadcast locally first
    const hexs = txComposer.map((d) => {
      return { hex: d.getTx().toString() }
    })
    return await batchBroadcastApi({ params: hexs, network })
  }
}
