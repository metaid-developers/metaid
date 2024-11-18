import { Network, InscriptionRequest } from './types'

// export type Tx = {
//   address: string
//   value: number
// }
// export type TxDetail = {
//   fee: string
//   txId: string
//   rawTx: string
//   txInputs: Tx[]
//   txOutputs: Tx[]
//   psbtHex: string
// }

// export type InscribeResult = { commitTx: TxDetail; revealTxs: TxDetail[] }

// add wallet btc get network
declare global {
  interface Window {
    removeEventListener: any
    metaidwallet: {
      on: any
      removeListener: any
      getXPublicKey: () => Promise<string>
      connect: () => Promise<{ address: string; status?: string }>
      disconnect: () => Promise<void>
      getNetwork: () => Promise<{ network: Network; status?: string }>
      switchNetwork: (network: Network) => Promise<void>
      common: {
        omniConnect: () => Promise<{
          btc: {
            address: string
            pubKey: string
          }
          mvc: {
            address: string
            pubKey: string
          }
        }>
      }
      btc: {
        signPsbt: ({ psbtHex: string, options: any }) => Promise<string>
        signMessage: (msg: string) => Promise<string>
        connect: () => Promise<{
          address: string
          pubKey: string
          status?: string
        }>
        getPublicKey: () => Promise<string>
        getAddress: () => Promise<string>
        getBalance: () => Promise<{
          address: string
          total: number
          confirmed: number
          unconfirmed: number
        }>
        inscribe: ({ data, options }: { data: InscriptionRequest; options?: { noBroadcast: boolean } }) => Promise<any>
        // process: ({ data, options }: { data: InscriptionRequest; options?: { noBroadcast: boolean } }) => Promise<any>
      }
    }
  }
}
