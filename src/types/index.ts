export type Blockchain = 'mvc' | 'btc'
export type MvcNetwork = 'mainnet' | 'testnet' | 'regtest'
export type AddressType = 'P2WPKH' | 'P2SH-P2WPKH' | 'P2TR' | 'P2PKH'

export type UserInfo = {
  number: number
  rootTxId: string
  name: string
  nameId: string
  address: string
  avatar: string | null
  avatarId: string
  bio: string
  bioId: string
  background: string
  backgroundId: string
  soulbondToken: string
  unconfirmed: string
  isInit: boolean
  metaid: string
}

export type Operation = 'init' | 'create' | 'modify' | 'revoke'
export type Encryption = '0' | '1' | '2'

export type MetaidData = {
  operation?: Operation
  body?: string | Buffer
  path?: string
  contentType?: string
  encryption?: '0' | '1' | '2'
  version?: string
  encoding?: BufferEncoding
  revealAddr?: string
  flag?: 'metaid'
}

export type InscriptionRequest = {
  // commitTxPrevOutputList: PrevOutput[]
  feeRate: number
  metaidDataList: MetaidData[]
  revealOutValue: number
  changeAddress: string
  minChangeValue?: number
  service?: {
    address: string
    satoshis: string
  }
}

export type SubMetaidData = Omit<MetaidData, 'revealAddr'>
