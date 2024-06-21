import { useBtc } from '@/factories/use.js'
import { DEFAULT_USERNAME, LEAST_AMOUNT_TO_CREATE_METAID } from '@/data/constants.js'
import { sleep, staticImplements } from '@/utils/index.js'
import type { EntitySchema } from '@/metaid-entities/entity.js'
import { loadBtc } from '@/factories/load.js'
import { errors } from '@/data/errors.js'
import type { MetaIDWalletForBtc } from '@/wallets/metalet/btcWallet.js'
import {
  broadcast,
  fetchUtxos,
  getInfoByAddress,
  getRootPinByAddress,
  getPinListByAddress,
  fetchAllPin,
  fetchAllPinByPath,
} from '@/service/btc'
import * as bitcoin from '../../utils/btc-inscribe/bitcoinjs-lib'
import { Operation, PrevOutput } from '../../utils/btc-inscribe/inscribePsbt'
import { InscribeData } from '../entity/btc'
import { isNil, isEmpty } from 'ramda'
import { BtcConnectorStatic, IBtcConnector } from './btcConnector'
import { InscriptionRequest, MetaidData, UserInfo } from '@/types'
import { BtcNetwork } from '@/service/btc.js'
import { sha256 } from 'bitcoinjs-lib/src/crypto'

export interface InscribeResultForYesBroadcast {
  commitTxId: string
  revealTxIds: string[]
  commitCost: string
  revealCost: string
  status?: string
}
export interface InscribeResultForNoBroadcast {
  commitTxHex: string
  revealTxsHex: string[]
  commitCost: string
  revealCost: string
  status?: string
}

export interface InscribeResultForIfBroadcasting {
  no: InscribeResultForYesBroadcast
  yes: InscribeResultForNoBroadcast
}

//todo: add getXpub and connecotor restore methods

@staticImplements<BtcConnectorStatic>()
export class BtcConnector implements IBtcConnector {
  private _isConnected: boolean
  private wallet: MetaIDWalletForBtc
  public metaid: string | undefined
  public user: UserInfo
  private constructor(wallet?: MetaIDWalletForBtc) {
    this._isConnected = true

    if (wallet) {
      this.wallet = wallet as MetaIDWalletForBtc
    }
  }

  get address() {
    return this?.wallet?.address || ''
  }

  get network() {
    return this?.wallet?.network || 'testnet'
  }

  public static async create({ wallet, network }: { wallet?: MetaIDWalletForBtc; network: BtcNetwork }) {
    const connector = new BtcConnector(wallet)

    if (wallet) {
      connector.metaid = sha256(Buffer.from(wallet.address)).toString('hex')

      // ask api for  user
      const metaidInfo = await getInfoByAddress({ address: wallet.address, network: network ?? wallet.network })
      if (!isNil(metaidInfo)) {
        // connector.metaid = metaidInfo.rootTxId + 'i0'
        connector.user = { ...metaidInfo, metaid: connector.metaid }
      }
    }

    return connector
  }

  // metaid related
  hasUser() {
    return !!this.user
  }

  async getUser({ network, currentAddress }: { network: BtcNetwork; currentAddress?: string }) {
    if (!isNil(currentAddress)) {
      return await getInfoByAddress({ address: currentAddress, network: network ?? this.network })
    } else {
      return await getInfoByAddress({ address: this.address, network: network ?? this.network })
    }
  }

  public async inscribe<T extends keyof InscribeResultForIfBroadcasting>({
    inscribeDataArray,
    options,
  }: {
    inscribeDataArray: InscribeData[]
    options: {
      noBroadcast: T
      feeRate?: number
      service?: {
        address: string
        satoshis: string
      }
    }
  }): Promise<InscribeResultForIfBroadcasting[T]> {
    // const faucetUtxos = await fetchUtxos({
    //   address: address,
    //   network: 'testnet',
    // })
    // const toUseUtxo = faucetUtxos[0] // presume toUseUtxo.value >= 11546
    // console.log('to use utxo have satoshi', toUseUtxo.satoshi)

    // const pub = await this.getPublicKey(`m/86'/0'/0'/0/0`)
    // const commitTxPrevOutputList: PrevOutput[] = [
    //   {
    //     txId: toUseUtxo.txId,
    //     vOut: toUseUtxo.vout,
    //     amount: toUseUtxo.satoshi,
    //     address: address,
    //     pub,
    //   },
    // ]

    const metaidDataList: MetaidData[] = inscribeDataArray.map((inp) => {
      const contentType = inp?.contentType ?? 'text/plain'
      const encoding = inp?.encoding ?? 'utf-8'
      return {
        operation: inp.operation,
        revealAddr: this.address,
        body: inp?.body,
        path: inp?.path,
        contentType: contentType,
        encryption: inp?.encryption,
        flag: inp?.flag,
        version: '1.0.0', //this._schema.versions[0].version.toString(),
        encoding,
      }
    })

    const request: InscriptionRequest = {
      // commitTxPrevOutputList,
      feeRate: options?.feeRate ?? 1,
      revealOutValue: 546,
      metaidDataList,
      changeAddress: this.address,
      service: options?.service,
    }
    console.log('request', request)
    const res = await this.wallet.inscribe({
      data: request,
      options: {
        noBroadcast: options?.noBroadcast === 'no' ? false : true,
      },
    })
    console.log('inscrible res', res)
    return res
  }

  async updateUserInfo({
    userData,
    options,
  }: {
    userData?: {
      name?: string
      bio?: string
      avatar?: string
    }
    options?: {
      network?: BtcNetwork
      feeRate?: number
      service?: {
        address: string
        satoshis: string
      }
    }
  }): Promise<{
    nameRes: InscribeResultForYesBroadcast | undefined
    bioRes: InscribeResultForYesBroadcast | undefined
    avatarRes: InscribeResultForYesBroadcast | undefined
  }> {
    let nameRes: InscribeResultForYesBroadcast | undefined
    let bioRes: InscribeResultForYesBroadcast | undefined
    let avatarRes: InscribeResultForYesBroadcast | undefined

    // path 传@pinId
    if (userData?.name !== this.user?.name && !isNil(userData?.name) && !isEmpty(userData?.name)) {
      if (this.user?.nameId === '') {
        nameRes = await this.inscribe({
          inscribeDataArray: [
            {
              operation: 'create',
              body: userData?.name,
              path: `/info/name`,
              flag: options?.network === 'mainnet' ? 'metaid' : 'testid',
            },
          ],
          options: { noBroadcast: 'no', feeRate: options?.feeRate ?? 1, service: options?.service },
        })
      } else {
        nameRes = await this.inscribe({
          inscribeDataArray: [
            {
              operation: 'modify',
              body: userData?.name,
              path: `@${this?.user?.nameId ?? ''}`,
              flag: options?.network === 'mainnet' ? 'metaid' : 'testid',
            },
          ],
          options: { noBroadcast: 'no', feeRate: options?.feeRate ?? 1, service: options?.service },
        })
      }
    }
    if (userData?.bio !== this.user?.bio && !isNil(userData?.bio) && !isEmpty(userData?.bio)) {
      console.log('run in bio')

      if (this.user?.bioId === '') {
        bioRes = await this.inscribe({
          inscribeDataArray: [
            {
              operation: 'create',
              body: userData?.bio,
              path: `/info/bio`,
              flag: options?.network === 'mainnet' ? 'metaid' : 'testid',
            },
          ],
          options: { noBroadcast: 'no', feeRate: options?.feeRate ?? 1, service: options?.service },
        })
      } else {
        bioRes = await this.inscribe({
          inscribeDataArray: [
            {
              operation: 'modify',
              body: userData?.bio,
              path: `@${this?.user?.bioId ?? ''}`,
              flag: options?.network === 'mainnet' ? 'metaid' : 'testid',
            },
          ],
          options: { noBroadcast: 'no', feeRate: options?.feeRate ?? 1, service: options?.service },
        })
      }
    }
    if (userData?.avatar !== this.user?.avatar && !isNil(userData?.avatar) && !isEmpty(userData?.avatar)) {
      if (this.user?.avatarId === '') {
        avatarRes = await this.inscribe({
          inscribeDataArray: [
            {
              operation: 'create',
              body: userData?.avatar,
              path: `/info/avatar`,
              encoding: 'base64',
              contentType: 'image/jpeg;binary',
              flag: options?.network === 'mainnet' ? 'metaid' : 'testid',
            },
          ],
          options: { noBroadcast: 'no', feeRate: options?.feeRate ?? 1, service: options?.service },
        })
      } else {
        avatarRes = await this.inscribe({
          inscribeDataArray: [
            {
              operation: 'modify',
              body: userData?.avatar,
              path: `@${this?.user?.avatarId ?? ''}`,
              encoding: 'base64',
              contentType: 'image/jpeg;binary',
              flag: options?.network === 'mainnet' ? 'metaid' : 'testid',
            },
          ],
          options: { noBroadcast: 'no', feeRate: options?.feeRate ?? 1, service: options?.service },
        })
      }
    }

    return { nameRes, bioRes, avatarRes }
  }

  async createUserInfo({
    userData,
    options,
  }: {
    userData: {
      name: string
      bio?: string
      avatar?: string
    }
    options: {
      network?: BtcNetwork
      feeRate?: number
      service?: {
        address: string
        satoshis: string
      }
    }
  }): Promise<{
    nameRes: InscribeResultForYesBroadcast
    bioRes: InscribeResultForYesBroadcast | undefined
    avatarRes: InscribeResultForYesBroadcast | undefined
  }> {
    let bioRes: InscribeResultForYesBroadcast | undefined
    let avatarRes: InscribeResultForYesBroadcast | undefined
    const nameRes = await this.inscribe({
      inscribeDataArray: [
        {
          operation: 'create',
          body: userData?.name,
          path: '/info/name',
          flag: options?.network === 'mainnet' ? 'metaid' : 'testid',
        },
      ],

      options: { noBroadcast: 'no', feeRate: options?.feeRate ?? 1, service: options?.service },
    })
    console.log('inscribe nameRes', nameRes)
    if (!!userData?.bio) {
      bioRes = await this.inscribe({
        inscribeDataArray: [
          {
            operation: 'create',
            body: userData?.bio,
            path: '/info/bio',
            flag: options?.network === 'mainnet' ? 'metaid' : 'testid',
          },
        ],
        options: {
          noBroadcast: 'no',
          feeRate: options?.feeRate ?? 1,
          service: options?.service,
        },
      })
    }
    if (!!userData?.avatar) {
      avatarRes = await this.inscribe({
        inscribeDataArray: [
          {
            operation: 'create',
            body: userData?.avatar,
            path: '/info/avatar',
            encoding: 'base64',
            contentType: 'image/jpeg;binary',
            flag: options?.network === 'mainnet' ? 'metaid' : 'testid',
          },
        ],

        options: { noBroadcast: 'no', feeRate: options?.feeRate ?? 1, service: options?.service },
      })
      console.log('inscribe avatarRes', avatarRes)
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
    return useBtc(entitySymbol, { connector: this })
  }

  load(entitySchema: EntitySchema) {
    return loadBtc(entitySchema, { connector: this })
  }

  isConnected() {
    return this._isConnected
  }

  disconnect() {
    this._isConnected = false
    this.wallet = undefined
  }

  async getAllpin({
    page,
    limit,
    network,
    path,
  }: {
    page: number
    limit: number
    network?: BtcNetwork
    path?: string[]
  }) {
    if (isNil(path)) {
      return (await fetchAllPin({ page, size: limit, network: network ?? 'testnet' })).currentPage
    }
    return (await fetchAllPinByPath({ path: path.join(','), page, limit, network: network ?? 'testnet' })).currentPage
  }

  async totalPin({ network, path }: { network?: BtcNetwork; path?: string[] }) {
    if (isNil(path)) {
      return (await fetchAllPin({ page: 1, size: 1, network: network ?? 'testnet' })).total
    }
    return (await fetchAllPinByPath({ path: path.join(','), page: 1, limit: 1, network: network ?? 'testnet' })).total
  }

  /**
   * wallet delegation
   * signInput / send / broadcast / getPublicKey / getAddress / signMessage / pay
   */
  // async signPsbt(psbtHex: string, options?: any) {
  //   if (options) {
  //     return await this.wallet.signPsbt(psbtHex, options)
  //   }
  //   return await this.wallet.signPsbt(psbtHex)
  // }

  // async broadcast(txHex: string, network: Network, publicKey: string, message: string | undefined = '') {
  //   return await broadcast({
  //     rawTx: txHex,
  //     network,
  //     publicKey,
  //     message,
  //   })
  // }

  // getPublicKey(path?: string) {
  //   return this.wallet.getPublicKey(path)
  // }

  // getAddress(path?: string) {
  //   return this.wallet.getAddress({ path })
  // }

  // signMessage(message: string, encoding: 'utf-8' | 'base64' | 'hex' | 'utf8' = 'hex') {
  //   return this.wallet.signMessage(message, encoding)
  // }
}
