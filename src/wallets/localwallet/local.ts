import { TxComposer, mvc, Wallet as InternalWallet, API_NET, API_TARGET, Api } from 'meta-contract'

import type { Transaction, WalletStatic } from '../metalet/mvcWallet.js'
import { DERIVE_MAX_DEPTH, FEEB } from '@/data/constants.js'
import { staticImplements } from '@/utils/index.js'
import { errors } from '@/data/errors.js'
import { fetchUtxos } from '@/service/mvc.js'
import { parseLocalTransaction, pickUtxo } from '@/utils/crypto.js'
import type { Blockchain } from '@/types/index.js'
import { MetaIDConnectWallet } from './wallet.js'

// @staticImplements<WalletStatic>()
export class LocalWallet implements MetaIDConnectWallet {
  private mnemonic: string
  private derivePath: string
  private internal: InternalWallet | undefined
  public blockchain: Blockchain
  public address: string
  public xpub: string | undefined

  private get basePath() {
    return this.derivePath.split('/').slice(0, -2).join('/')
  }

  private constructor(mnemonic: string, derivePath: string = `m/44'/10001'/0'/0/0`) {
    this.mnemonic = mnemonic
    this.derivePath = derivePath
  }
  batchBroadcast(txComposer: TxComposer[]): Promise<{ txid: string }[]> {
    throw new Error('Method not implemented.')
  }

  public static async create(
    mnemonic: string,
    derivePath: string = `m/44'/10001'/0'/0/0`
  ): Promise<MetaIDConnectWallet> {
    // create a new wallet
    const wallet = new LocalWallet(mnemonic, derivePath)

    // derive address from mnemonic
    const privateKey = mvc.Mnemonic.fromString(mnemonic)
      .toHDPrivateKey(undefined, 'mainnet' as any)
      .deriveChild(derivePath).privateKey

    // derive xpub from mnemonic from base path
    wallet.xpub = mvc.Mnemonic.fromString(mnemonic)
      .toHDPrivateKey(undefined, 'mainnet' as any)
      .deriveChild(wallet.basePath)
      .xpubkey.toString()
    wallet.address = privateKey.publicKey.toAddress().toString()
    wallet.internal = new InternalWallet(privateKey.toWIF(), 'mainnet' as any, 1)

    return wallet
  }

  public async getAddress({ blockchain, path }: { blockchain: Blockchain; path?: string }) {
    if (!path) return this.address

    switch (blockchain) {
      case 'mvc':
        const fullPath = this.basePath + path
        let basePk = mvc.Mnemonic.fromString(this.mnemonic)
          .toHDPrivateKey(undefined, 'mainnet' as any)
          .deriveChild(fullPath)

        return basePk.publicKey.toAddress('mainnet' as any).toString()
      case 'btc':
        return 'aaa'

      default:
        break
    }
  }

  public async getPublicKey(path: string = '/0/0') {
    const fullPath = this.basePath + path
    const basePk = mvc.Mnemonic.fromString(this.mnemonic)
      .toHDPrivateKey(undefined, 'mainnet' as any)
      .deriveChild(fullPath)

    return basePk.publicKey.toString()
  }
  /**
   * getBalance
   */
  public async getBalance() {
    const api = new Api(API_NET.MAIN, API_TARGET.MVC)
    const res = await api.getBalance(this.address)
    return { address: this.address, confirmed: res.balance, unconfirmed: res.pendingBalance }
  }

  public hasAddress() {
    return !!this.address
  }

  private getPrivatekey() {
    return mvc.Mnemonic.fromString(this.mnemonic)
      .toHDPrivateKey(undefined, 'mainnet' as any)
      .deriveChild(this.derivePath).privateKey
  }

  public async signInput({ txComposer, inputIndex }: { txComposer: TxComposer; inputIndex: number }) {
    // look at the input's address and find out if it can be derived from the mnemonic
    const input = txComposer.tx.inputs[inputIndex]
    const toSignAddress = input.output.script.toAddress().toString()
    const basePk = mvc.Mnemonic.fromString(this.mnemonic)
      .toHDPrivateKey(undefined, 'mainnet' as any)
      .deriveChild(this.basePath)

    let deriver = 0
    let toUsePrivateKey: mvc.PrivateKey
    while (deriver < DERIVE_MAX_DEPTH) {
      const childPk = basePk.deriveChild(0).deriveChild(deriver)
      const childAddress = childPk.publicKey.toAddress('mainnet' as any).toString()

      if (childAddress === toSignAddress) {
        toUsePrivateKey = childPk.privateKey
        break
      }

      deriver++
    }
    if (!toUsePrivateKey) throw new Error(errors.CANNOT_DERIVE_PATH)
    // sign the input
    txComposer.unlockP2PKHInput(toUsePrivateKey, inputIndex)

    return txComposer
  }

  public async send(toAddress: string, amount: number): Promise<{ txid: string }> {
    const { txId: txid } = await this.internal.send(toAddress, amount)

    return { txid }
  }

  public async broadcast(txComposer: TxComposer): Promise<{ txid: string }> {
    const txid = await this.internal.api.broadcast(txComposer.getRawHex())

    return { txid }
  }

  public async signMessage(message: string, encoding: 'utf-8' | 'base64' | 'hex' | 'utf8' = 'hex'): Promise<string> {
    const messageHash = mvc.crypto.Hash.sha256(Buffer.from(message))

    let sigBuf = mvc.crypto.ECDSA.sign(messageHash, this.getPrivatekey()).toBuffer()

    let signature: string
    switch (encoding) {
      case 'utf-8':
      case 'utf8':
        signature = sigBuf.toString('utf-8')
        break
      case 'base64':
        signature = sigBuf.toString('base64')
        break
      case 'hex':
      default:
        signature = sigBuf.toString('hex')
        break
    }

    return signature
  }

  public async pay({ transactions }: { transactions: Transaction[] }) {
    const address = this.address
    let usableUtxos = (await fetchUtxos({ address, network: 'testnet' })).map((u) => {
      return {
        txId: u.txid,
        outputIndex: u.outIndex,
        satoshis: u.value,
        address,
        height: u.height,
      }
    })

    // find out if transactions other than the first one are dependent on previous ones
    // if so, we need to sign them in order, and sequentially update the prevTxId of the later ones
    // so that the signature of the previous one can be calculated correctly

    // first we gather all txids using a map for future mutations
    const txids = new Map<string, string>()
    transactions.forEach(({ txComposer }) => {
      const txid = txComposer.getTxId()
      txids.set(txid, txid)
    })

    // we finish the transaction by finding the appropriate utxo and calculating the change
    const payedTransactions = []
    for (let i = 0; i < transactions.length; i++) {
      const toPayTransaction = transactions[i]
      // record current txid
      const txComposer = toPayTransaction.txComposer
      const currentTxid = toPayTransaction.txComposer.getTxId()

      const tx = txComposer.tx

      // make sure that every input has an output
      const inputs = tx.inputs
      const existingInputsLength = tx.inputs.length
      for (let i = 0; i < inputs.length; i++) {
        if (!inputs[i].output) {
          throw new Error('The output of every input of the transaction must be provided')
        }
      }

      // update metaid metadata

      const { messages: metaIdMessages, outputIndex } = await parseLocalTransaction(tx)

      if (outputIndex !== null) {
        // find out if any of the messages contains the wrong txid
        // how to find out the wrong txid?
        // it's the keys of txids Map
        const prevTxids = Array.from(txids.keys())

        // we use a nested loops here to find out the wrong txid
        for (let i = 0; i < metaIdMessages.length; i++) {
          for (let j = 0; j < prevTxids.length; j++) {
            if (typeof metaIdMessages[i] !== 'string') continue

            if (metaIdMessages[i].includes(prevTxids[j])) {
              metaIdMessages[i] = (metaIdMessages[i] as string).replace(prevTxids[j], txids.get(prevTxids[j])!)
            }
          }
        }

        // update the OP_RETURN
        const opReturnOutput = new mvc.Transaction.Output({
          script: mvc.Script.buildSafeDataOut(metaIdMessages),
          satoshis: 0,
        })

        // update the OP_RETURN output in tx
        tx.outputs[outputIndex] = opReturnOutput
      }

      const addressObj = new mvc.Address(address, 'mainnet')
      console.log({ addressObj })
      // find out the total amount of the transaction (total output minus total input)
      const totalOutput = tx.outputs.reduce((acc, output) => acc + output.satoshis, 0)
      const totalInput = tx.inputs.reduce((acc, input) => acc + input.output!.satoshis, 0)
      const currentSize = tx.toBuffer().length

      const currentFee = FEEB * currentSize
      const difference = totalOutput - totalInput + currentFee

      const pickedUtxos = pickUtxo(usableUtxos, difference)

      // append inputs
      for (let i = 0; i < pickedUtxos.length; i++) {
        const utxo = pickedUtxos[i]
        txComposer.appendP2PKHInput({
          address: addressObj,
          txId: utxo.txId,
          outputIndex: utxo.outputIndex,
          satoshis: utxo.satoshis,
        })

        // remove it from usableUtxos
        usableUtxos = usableUtxos.filter((u) => {
          return u.txId !== utxo.txId || u.outputIndex !== utxo.outputIndex
        })
      }

      const changeIndex = txComposer.appendChangeOutput(addressObj, FEEB)
      const changeOutput = txComposer.getOutput(changeIndex)

      // sign
      const mneObj = mvc.Mnemonic.fromString(this.mnemonic)
      const hdpk = mneObj.toHDPrivateKey('', 'mainnet')

      const rootPath = this.derivePath
      const basePrivateKey = hdpk.deriveChild(rootPath)
      const rootPrivateKey = hdpk.deriveChild(`${rootPath}/0/0`).privateKey

      // we have to find out the private key of existing inputs
      const toUsePrivateKeys = new Map<number, mvc.PrivateKey>()
      for (let i = 0; i < existingInputsLength; i++) {
        const input = txComposer.getInput(i)
        // gotta change the prevTxId of the input to the correct one, if there's some kind of dependency to previous txs
        const prevTxId = input.prevTxId.toString('hex')
        if (txids.has(prevTxId)) {
          input.prevTxId = Buffer.from(txids.get(prevTxId)!, 'hex')
        }

        // find out the path corresponding to this input's prev output's address
        const inputAddress = mvc.Address.fromString(input.output!.script.toAddress().toString(), 'mainnet').toString()
        let deriver = 0
        let toUsePrivateKey: mvc.PrivateKey | undefined = undefined
        while (deriver < DERIVE_MAX_DEPTH) {
          const childPk = basePrivateKey.deriveChild(0).deriveChild(deriver)
          const childAddress = childPk.publicKey.toAddress('mainnet' as any).toString()

          if (childAddress === inputAddress.toString()) {
            toUsePrivateKey = childPk.privateKey
            break
          }

          deriver++
        }

        if (!toUsePrivateKey) {
          throw new Error(`Cannot find the private key of index #${i} input`)
        }

        // record the private key
        toUsePrivateKeys.set(i, toUsePrivateKey)
      }

      // sign the existing inputs
      toUsePrivateKeys.forEach((privateKey, index) => {
        txComposer.unlockP2PKHInput(privateKey, index)
      })

      // then we use root private key to sign the new inputs (those we just added to pay)
      pickedUtxos.forEach((v, index) => {
        txComposer.unlockP2PKHInput(rootPrivateKey, index + existingInputsLength)
      })

      // change txids map to reflect the new txid
      const txid = txComposer.getTxId()
      txids.set(currentTxid, txid)

      // return the payed transactions
      payedTransactions.push(txComposer.serialize())

      // add changeOutput to usableUtxos
      if (changeIndex >= 0) {
        usableUtxos.push({
          txId: txComposer.getTxId(),
          outputIndex: changeIndex,
          satoshis: changeOutput.satoshis,
          address,
          height: -1,
        })
      }
    }

    return payedTransactions
  }
}
