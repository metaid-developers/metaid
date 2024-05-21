import { Network, InscriptionRequest } from './types'

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
        process: ({ data, options }: { data: InscriptionRequest; options?: { noBroadcast: boolean } }) => Promise<any>
      }
    }
  }
}
