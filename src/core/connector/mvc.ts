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

export type CreatePinResult =
  | {
      transactions: Transaction[]
      txid?: undefined
    }
  | {
      txid: string
      transactions?: undefined
    }

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

  async getUser({ network, currentAddress }: { network: BtcNetwork; currentAddress?: string }) {
    if (!!currentAddress) {
      return await getInfoByAddress({ address: currentAddress, network })
    } else {
      return await getInfoByAddress({ address: this.address, network })
    }
  }

  async createPin(
    metaidData: Omit<MetaidData, 'revealAddr'>,
    options: {
      signMessage?: string
      serialAction?: 'combo' | 'finish'
      transactions?: Transaction[]
      network: BtcNetwork
    }
  ): Promise<CreatePinResult> {
    console.log('metaidData', metaidData)

    if (!this.isConnected) {
      throw new Error(errors.NOT_CONNECTED)
    }
    const transactions: Transaction[] = options?.transactions ?? []

    // if (!(await checkBalance({ address: this.wallet.address, network: options?.network ?? 'testnet' }))) {
    //   throw new Error(errors.NOT_ENOUGH_BALANCE)
    // }

    const pinTxComposer = new TxComposer()

    console.log('wallet address', this.wallet.address)
    pinTxComposer.appendP2PKHOutput({
      address: new mvc.Address(this.wallet.address, options.network),
      satoshis: 546,
    })

    const metaidOpreturn = buildOpReturnV2(metaidData, { network: options?.network ?? 'testnet' })

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

  async updateUserInfo(body?: {
    name?: string
    bio?: string
    avatar?: string
    feeRate?: number
    network?: BtcNetwork
  }): Promise<{
    nameRes: CreatePinResult | undefined
    bioRes: CreatePinResult | undefined
    avatarRes: CreatePinResult | undefined
  }> {
    let nameRes: CreatePinResult | undefined
    let bioRes: CreatePinResult | undefined
    let avatarRes: CreatePinResult | undefined

    // {
    //   operation: 'create',
    //   body: body.name,
    //   path: '/info/name',
    //   flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
    // },
    // { network: body?.network ?? 'testnet' }

    // path 传@pinId
    if (body?.name !== this.user?.name && !isNil(body?.name) && !isEmpty(body?.name)) {
      if (this.user?.nameId === '') {
        nameRes = await this.createPin(
          {
            operation: 'create',
            body: body?.name,
            path: `/info/name`,
            flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
          },
          { network: body?.network ?? 'testnet' }
        )
      } else {
        nameRes = await this.createPin(
          {
            operation: 'modify',
            body: body?.name,
            path: `@${this?.user?.nameId ?? ''}`,
            flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
          },

          { network: body?.network ?? 'testnet' }
        )
      }
    }
    if (body?.bio !== this.user?.bio && !isNil(body?.bio) && !isEmpty(body?.bio)) {
      console.log('run in bio')

      if (this.user?.bioId === '') {
        bioRes = await this.createPin(
          {
            operation: 'create',
            body: body?.bio,
            path: `/info/bio`,
            flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
          },

          { network: body?.network ?? 'testnet' }
        )
      } else {
        bioRes = await this.createPin(
          {
            operation: 'modify',
            body: body?.bio,
            path: `@${this?.user?.bioId ?? ''}`,
            flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
          },
          { network: body?.network ?? 'testnet' }
        )
      }
    }
    if (body?.avatar !== this.user?.avatar && !isNil(body?.avatar) && !isEmpty(body?.avatar)) {
      if (this.user?.avatarId === '') {
        avatarRes = await this.createPin(
          {
            operation: 'create',
            body: body?.avatar,
            path: `/info/avatar`,
            encoding: 'base64',
            contentType: 'image/jpeg;binary',
            flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
          },
          { network: body?.network ?? 'testnet' }
        )
      } else {
        avatarRes = await this.createPin(
          {
            operation: 'modify',
            body: body?.avatar,
            path: `@${this?.user?.avatarId ?? ''}`,
            encoding: 'base64',
            contentType: 'image/jpeg;binary',
            flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
          },
          { network: body?.network ?? 'testnet' }
        )
      }
    }

    return { nameRes, bioRes, avatarRes }
  }
  async createUserInfo(body: {
    name: string
    bio?: string
    avatar?: string
    feeRate?: number
    network?: BtcNetwork
  }): Promise<{
    nameRes: CreatePinResult
    bioRes: CreatePinResult | undefined
    avatarRes: CreatePinResult | undefined
  }> {
    let bioRes: CreatePinResult | undefined
    let avatarRes: CreatePinResult | undefined
    const nameRes = await this.createPin(
      {
        operation: 'create',
        body: body.name,
        path: '/info/name',
        flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
      },
      { network: body?.network ?? 'testnet' }
    )
    if (!isEmpty(body?.bio ?? '')) {
      bioRes = await this.createPin(
        {
          operation: 'create',
          body: body.name,
          path: '/info/bio',
          flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
        },
        { network: body?.network ?? 'testnet' }
      )
    }
    if (!isEmpty(body?.avatar ?? '')) {
      avatarRes = await this.createPin(
        {
          operation: 'create',
          body: body?.avatar,
          path: '/info/avatar',
          encoding: 'base64',
          flag: body?.network === 'mainnet' ? 'metaid' : 'testid',
          contentType: 'image/jpeg;binary',
        },
        { network: body?.network ?? 'testnet' }
      )
    }
    return { nameRes, bioRes, avatarRes }
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
