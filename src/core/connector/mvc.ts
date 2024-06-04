import { useMvc, useBtc } from '@/factories/use.js'
import { type MetaIDWalletForMvc, type Transaction } from '@/wallets/metalet/mvcWallet.js'
import { TxComposer, mvc } from 'meta-contract'
import { type User, fetchUser, fetchMetaid, fetchUtxos, notify, fetchTxid } from '@/service/mvc.js'
import { DEFAULT_USERNAME, LEAST_AMOUNT_TO_CREATE_METAID } from '@/data/constants.js'
import { checkBalance, sleep, staticImplements } from '@/utils/index.js'
import type { EntitySchema } from '@/metaid-entities/entity.js'
import { loadBtc, loadMvc } from '@/factories/load.js'
import { errors } from '@/data/errors.js'
import type { Blockchain, MetaidData, UserInfo } from '@/types/index.js'
import { IMvcConnector, MvcConnectorStatic } from './mvcConnector'
import { BtcNetwork, getInfoByAddress } from '@/service/btc'
import { isNil, isEmpty } from 'ramda'
import { InscribeOptions } from '../entity/btc'
import { buildOpReturnV2 } from '@/utils/opreturn-builder'
import { sha256 } from 'bitcoinjs-lib/src/crypto'

@staticImplements<MvcConnectorStatic>()
export class MvcConnector implements IMvcConnector {
  private _isConnected: boolean
  private wallet: MetaIDWalletForMvc
  public metaid: string | undefined
  public user: UserInfo

  private constructor(wallet?: MetaIDWalletForMvc) {
    if (wallet) {
      this._isConnected = true
      this.wallet = wallet as MetaIDWalletForMvc
    }
  }

  get address() {
    return this.wallet?.address || ''
  }

  get xpub() {
    return this.wallet?.xpub || ''
  }

  public static async create({ wallet, network }: { wallet?: MetaIDWalletForMvc; network: BtcNetwork }) {
    const connector = new MvcConnector(wallet)

    if (wallet) {
      connector.metaid = sha256(Buffer.from(wallet.address)).toString('hex')

      // ask api for user (to do : switch api to mvc)
      const metaidInfo = await getInfoByAddress({ address: wallet.address, network: network ?? wallet.network })
      if (!isNil(metaidInfo)) {
        connector.user = metaidInfo
      }
    }

    return connector
  }

  // metaid related
  hasUser() {
    return !!this.user
  }

  // isMetaidValid() {
  //   return this.hasUser() && !!this.user.metaid && !!this.user.protocolTxid && !!this.user.infoTxid && !!this.user.name
  // }

  async getUser(currentAddress?: string) {
    if (!!currentAddress) {
      return await getInfoByAddress({ address: currentAddress, network: 'testnet' })
    } else {
      return await getInfoByAddress({ address: this.address, network: 'testnet' })
    }
  }

  async updateUserInfo(body?: { name?: string; bio?: string; avatar?: string; feeRate?: number }): Promise<boolean> {
    return true
  }

  async createPin(
    metaidData: MetaidData,
    options: {
      signMessage?: string
      serialAction?: 'combo' | 'finish'
      transactions?: Transaction[]
      network: BtcNetwork
    }
  ) {
    console.log('metaidData', metaidData)

    if (!this.isConnected) {
      throw new Error(errors.NOT_CONNECTED)
    }
    const transactions: Transaction[] = options?.transactions ?? []

    // if (!(await checkBalance(this.wallet.address))) {
    //   throw new Error(errors.NOT_ENOUGH_BALANCE)
    // }

    const pinTxComposer = new TxComposer()

    console.log('wallet address', this.wallet.address)
    pinTxComposer.appendP2PKHOutput({
      address: new mvc.Address(this.wallet.address, options.network),
      satoshis: 546,
    })

    const metaidOpreturn = buildOpReturnV2(metaidData)

    pinTxComposer.appendOpReturnOutput(metaidOpreturn)

    transactions.push({
      txComposer: pinTxComposer,
      message: 'Create Pin',
    })
    if (options?.serialAction === 'combo') {
      return { transactions }
    }

    ///// apply pay
    const payRes = await this.pay({
      transactions,
    })
    // for (const txComposer of payRes) {
    //   await this.connector.broadcast(txComposer)
    // }
    await this.batchBroadcast({ txComposer: payRes, network: options.network })

    for (const p of payRes) {
      const txid = p.getTxId()
      console.log('mvc pin txid: ' + txid)
      const isValid = !!(await fetchTxid({ txid, network: options.network }))
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

  // metaid
  hasMetaid() {
    return !!this.metaid
  }

  getMetaid() {
    return this.metaid
  }

  use(entitySymbol: string) {
    return useMvc(entitySymbol, { connector: this })
  }

  load(entitySchema: EntitySchema) {
    return loadMvc(entitySchema, { connector: this })
  }

  isConnected() {
    return this._isConnected
  }

  disconnect() {
    this._isConnected = false
    this.wallet = undefined
  }

  /**
   * wallet delegation
   * signInput / send / broadcast / getPublicKey / getAddress / signMessage / pay
   */
  signInput({ txComposer, inputIndex }: { txComposer: TxComposer; inputIndex: number }) {
    return this.wallet.signInput({ txComposer, inputIndex })
  }

  pay({ transactions }: { transactions: Transaction[] }) {
    return this.wallet.pay({ transactions })
  }

  send(toAddress: string, amount: number) {
    return this.wallet.send(toAddress, amount)
  }

  broadcast({ txComposer, network }: { txComposer: TxComposer; network: BtcNetwork }) {
    return this.wallet.broadcast({ txComposer, network })
  }

  batchBroadcast({ txComposer, network }: { txComposer: TxComposer[]; network: BtcNetwork }) {
    return this.wallet.batchBroadcast({ txComposer, network })
  }

  getPublicKey(path?: string) {
    return this.wallet.getPublicKey(path)
  }

  getAddress(path?: string) {
    return this.wallet.getAddress({ path })
  }

  signMessage(message: string, encoding: 'utf-8' | 'base64' | 'hex' | 'utf8' = 'hex') {
    return this.wallet.signMessage(message, encoding)
  }
}
