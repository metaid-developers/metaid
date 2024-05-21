// import { UserInfo } from '@/service/btc'
import { EntitySchema } from '@/metaid-entities/entity'
import { MvcEntity } from '../entity/mvc'
import { UserInfo } from '@/types'
import { MetaIDWalletForMvc } from '@/wallets/metalet/mvcWallet'

export interface MvcConnectorStatic {
  create: (wallet?: MetaIDWalletForMvc) => Promise<IMvcConnector>
}

export type IMvcConnector = {
  metaid: string | undefined
  address: string
  user: UserInfo
  hasUser(): boolean
  getUser(currentAddress?: string): Promise<UserInfo>
  updateUserInfo(body?: { name?: string; bio?: string; avatar?: string; feeRate?: number }): Promise<boolean>
  createMetaid(body?: { name?: string; bio?: string; avatar?: string; feeRate?: number }): Promise<{
    metaid: string
  }>
  hasMetaid(): boolean
  getMetaid(): string
  use(entitySymbol: string): Promise<MvcEntity>
  load(entitySchema: EntitySchema): Promise<MvcEntity>
  isConnected(): boolean
  disconnect(): void
}
