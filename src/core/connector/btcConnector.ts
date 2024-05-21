import { NBD } from './btc'
import { BtcEntity, InscribeOptions } from '../entity/btc'
import { EntitySchema } from '@/metaid-entities/entity'
import { MetaIDWalletForBtc } from '@/wallets/metalet/btcWallet'
import { UserInfo } from '@/types'
import { BtcNetwork } from '@/service/btc'

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
  inscribe<T extends keyof NBD>(inscribeOptions: InscribeOptions[], noBroadcast: T, feeRate?: number): Promise<NBD[T]>
  updateUserInfo(body?: { name?: string; bio?: string; avatar?: string; feeRate?: number }): Promise<boolean>
  createUserInfo(body: { name: string; bio?: string; avatar?: string; feeRate?: number }): Promise<boolean>
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
}
