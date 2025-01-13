import { useMvc, useBtc } from '@/factories/use.js'
import { type MetaIDWalletForMvc, type Transaction } from '@/wallets/metalet/mvcWallet.js'
import { TxComposer, mvc } from 'meta-contract'
import { type User, fetchUser, fetchMetaid, fetchUtxos, notify } from '@/service/mvc.js'
import { DEFAULT_USERNAME, LEAST_AMOUNT_TO_CREATE_METAID } from '@/data/constants.js'
import { checkBalance, sleep, staticImplements } from '@/utils/index.js'
import type { EntitySchema } from '@/metaid-entities/entity.js'
import { loadBtc, loadMvc } from '@/factories/load.js'
import { errors } from '@/data/errors.js'
import type { Blockchain, MetaidData, UserInfo } from '@/types/index.js'
import { IMvcConnector, MvcConnectorStatic } from './mvcConnector'
import { BtcNetwork, getInfoByAddress } from '@/service/btc'
import { isNil, isEmpty } from 'ramda'
import { InscribeData } from '../entity/btc'
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
      service?: {
        address: string
        satoshis: string
      }
    }
  ): Promise<CreatePinResult> {
    if (!this.isConnected) {
      throw new Error(errors.NOT_CONNECTED)
    }
    const transactions: Transaction[] = options?.transactions ?? []

    // if (!(await checkBalance({ address: this.wallet.address, network: options?.network ?? 'testnet' }))) {
    //   throw new Error(errors.NOT_ENOUGH_BALANCE)
    // }

    const pinTxComposer = new TxComposer()

    pinTxComposer.appendP2PKHOutput({
      address: new mvc.Address(this.wallet.address, options.network),
      satoshis: 1,
    })

    const metaidOpreturn = buildOpReturnV2(metaidData, { network: options?.network ?? 'testnet' })

    pinTxComposer.appendOpReturnOutput(metaidOpreturn)
    
    if (options?.service && options?.service.address && options?.service.satoshis) {
      pinTxComposer.appendP2PKHOutput({
        address: new mvc.Address(options.service.address, options.network),
        satoshis: Number(options.service.satoshis),
      })
    }

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
    const txIDs = await this.batchBroadcast({ txComposer: payRes, network: options.network })

    for (const [index, p] of payRes.entries()) {
      const txid = p.getTxId()

      const isValid = txIDs[index].txid === txid
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

  async updateUserInfo({
    userData,
    options,
  }: {
    userData?: {
      name?: string
      bio?: string
      avatar?: string
      background?: string
    }
    options: { feeRate?: number; network?: BtcNetwork }
  }): Promise<{
    nameRes: CreatePinResult | undefined
    bioRes: CreatePinResult | undefined
    avatarRes: CreatePinResult | undefined
    backgroundRes: CreatePinResult | undefined
  }> {
    const createOrModifyPin = async (
      field: string,
      value: string,
      id: string,
      encoding?: BufferEncoding,
      contentType?: string
    ) => {
      const operation = id === '' ? 'create' : 'modify'
      const path = id === '' ? `/info/${field}` : `@${id}`
      return await this.createPin(
        {
          operation,
          body: value,
          path,
          encoding,
          contentType,
          flag: 'metaid',
        },
        { network: options?.network ?? 'testnet' }
      )
    }

    const nameRes =
      userData?.name !== this.user?.name && !isNil(userData?.name) && !isEmpty(userData?.name)
        ? await createOrModifyPin('name', userData.name, this.user?.nameId ?? '')
        : undefined

    const bioRes =
      userData?.bio !== this.user?.bio && !isNil(userData?.bio) && !isEmpty(userData?.bio)
        ? await createOrModifyPin('bio', userData.bio, this.user?.bioId ?? '')
        : undefined

    const avatarRes =
      userData?.avatar !== this.user?.avatar && !isNil(userData?.avatar) && !isEmpty(userData?.avatar)
        ? await createOrModifyPin('avatar', userData.avatar, this.user?.avatarId ?? '', 'base64', 'image/jpeg;binary')
        : undefined

    const backgroundRes =
      userData?.background !== this.user?.background && !isNil(userData?.background) && !isEmpty(userData?.background)
        ? await createOrModifyPin(
            'background',
            userData.background,
            this.user?.backgroundId ?? '',
            'base64',
            'image/jpeg;binary'
          )
        : undefined

    return { nameRes, bioRes, avatarRes, backgroundRes }
  }

  async createUserInfo({
    userData,
    options,
  }: {
    userData: {
      name: string
      bio?: string
      avatar?: string
      background?: string
    }
    options: { feeRate?: number; network?: BtcNetwork }
  }): Promise<{
    nameRes: CreatePinResult
    bioRes: CreatePinResult | undefined
    avatarRes: CreatePinResult | undefined
    backgroundRes: CreatePinResult | undefined
  }> {
    const createPin = async (body: string, path: string, encoding?: BufferEncoding, contentType?: string) => {
      return await this.createPin(
        {
          operation: 'create',
          body,
          path,
          encoding,
          contentType,
          flag: 'metaid',
        },
        { network: options?.network ?? 'testnet' }
      )
    }

    const nameRes = await createPin(userData.name, '/info/name')

    const bioRes = !isEmpty(userData?.bio ?? '') ? await createPin(userData.bio, '/info/bio') : undefined
    const avatarRes = !isEmpty(userData?.avatar ?? '')
      ? await createPin(userData.avatar, '/info/avatar', 'base64', 'image/jpeg;binary')
      : undefined
    const backgroundRes = !isEmpty(userData?.background ?? '')
      ? await createPin(userData.background, '/info/background', 'base64', 'image/jpeg;binary')
      : undefined

    return { nameRes, bioRes, avatarRes, backgroundRes }
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
