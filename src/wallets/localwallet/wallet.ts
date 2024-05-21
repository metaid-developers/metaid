import type { Blockchain } from '@/types/index.js'
import { API_TARGET, TxComposer } from 'meta-contract'

export interface WalletStatic {
  create:
    | ((mnemonic: string, derivePath?: string) => Promise<MetaIDConnectWallet>)
    | (() => Promise<MetaIDConnectWallet>)
}

export type Transaction = {
  txComposer: TxComposer
  message: string
}

export interface MetaIDConnectWallet {
  address: string
  xpub: string
  blockchain: Blockchain
  // network: Network
  hasAddress(): boolean

  getAddress({ blockchain, path }: { blockchain: Blockchain; path?: string }): Promise<string>
  getPublicKey(path?: string): Promise<string>
  getBalance(): Promise<{ address: string; confirmed: number; unconfirmed: number }>

  signInput({ txComposer, inputIndex }: { txComposer: TxComposer; inputIndex: number }): Promise<TxComposer>

  pay({ transactions }: { transactions: Transaction[] }): Promise<TxComposer[]>

  send(
    toAddress: string,
    amount: number
  ): Promise<{
    txid: string
  }>

  broadcast(txComposer: TxComposer | TxComposer[]): Promise<{ txid: string } | { txid: string }[]>
  batchBroadcast(txComposer: TxComposer[]): Promise<{ txid: string }[]>

  // encrypt(message: string, publicKey: string): Promise<string>;

  signMessage(message: string, encoding?: 'utf-8' | 'base64' | 'hex' | 'utf8'): Promise<string>
}
