import { InscribeResultForIfBroadcasting, InscribeResultForYesBroadcast } from './btc'
import { BtcEntity, InscribeData } from '../entity/btc'
import { EntitySchema } from '@/metaid-entities/entity'
import { MetaIDWalletForBtc } from '@/wallets/metalet/btcWallet'
import { UserInfo } from '@/types'
import { BtcNetwork, Pin } from '@/service/btc'

export interface BtcConnectorStatic {
  create: ({ wallet, network }: { wallet?: MetaIDWalletForBtc; network: BtcNetwork }) => Promise<IBtcConnector>
}

export type IBtcConnector = {
  metaid: string | undefined
  address: string
  network: BtcNetwork
  user: UserInfo
  hasUser(): boolean
  getUser({ network, currentAddress }: { network: BtcNetwork; currentAddress?: string }): Promise<UserInfo>
  inscribe<T extends keyof InscribeResultForIfBroadcasting>({
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
  }): Promise<InscribeResultForIfBroadcasting[T]>
  updateUserInfo({
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
  }>
  createUserInfo({
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
  }>
  // createMetaid(body?: { name?: string; bio?: string; avatar?: string; feeRate?: number }): Promise<{
  //   metaid: string
  //   cost: number
  // }>
  hasMetaid(): boolean
  getMetaid(): string
  use(entitySymbol: string): Promise<BtcEntity>
  load(entitySchema: EntitySchema): Promise<BtcEntity>
  isConnected(): boolean
  disconnect(): void
  getAllpin({
    page,
    limit,
    network,
    path,
  }: {
    page: number
    limit: number
    network?: BtcNetwork
    path?: string[]
  }): Promise<Pin[]>
  totalPin({ network, path }: { network?: BtcNetwork; path?: string[] }): Promise<number>
}
