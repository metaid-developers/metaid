import { useMvc, useBtc } from '@/factories/use.js'
import { type MetaIDWalletForMvc, type Transaction } from '@/wallets/metalet/mvcWallet.js'
import { TxComposer, mvc } from 'meta-contract'
import { type User, fetchUser, fetchMetaid, fetchUtxos, notify, fetchTxid } from '@/service/mvc.js'
import { DEFAULT_USERNAME, LEAST_AMOUNT_TO_CREATE_METAID } from '@/data/constants.js'
import { checkBalance, sleep, staticImplements } from '@/utils/index.js'
import type { EntitySchema } from '@/metaid-entities/entity.js'
import { loadBtc, loadMvc } from '@/factories/load.js'
import { errors } from '@/data/errors.js'
import type { Blockchain, MetaidData, UserInfo } from '@/types/index.js'
import { IMvcConnector, MvcConnectorStatic } from './mvcConnector'
import { getInfoByAddress } from '@/service/btc'
import { isNil, isEmpty } from 'ramda'
import { InscribeOptions } from '../entity/btc'
import { buildOpReturnV2 } from '@/utils/opreturn-builder'
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

  public static async create(wallet?: MetaIDWalletForMvc) {
    const connector = new MvcConnector(wallet)

    if (wallet) {
      // // ask api for metaid (to do : switch api to mvc)
      // const metaidInfo = await getInfoByAddress({ address: wallet.address })
      // if (!isNil(metaidInfo.rootTxId)) {
      //   connector.metaid = metaidInfo.rootTxId + 'i0'
      //   connector.user = metaidInfo
      // }
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

  async getUser(currentAddress?: string) {
    if (!!currentAddress) {
      return await getInfoByAddress({ address: currentAddress, network: 'testnet' })
    } else {
      return await getInfoByAddress({ address: this.address, network: 'testnet' })
    }
  }

  async updateUserInfo(body?: { name?: string; bio?: string; avatar?: string; feeRate?: number }): Promise<boolean> {
    return true
  }

  async createPin(
    metaidData: MetaidData,
    options?: { signMessage: string; serialAction?: 'combo' | 'finish'; transactions?: Transaction[] }
  ) {
    console.log('metaidData', metaidData)

    if (!this.isConnected) {
      throw new Error(errors.NOT_CONNECTED)
    }
    const transactions: Transaction[] = options?.transactions ?? []

    // if (!(await checkBalance(this.wallet.address))) {
    //   throw new Error(errors.NOT_ENOUGH_BALANCE)
    // }

    const pinTxComposer = new TxComposer()

    console.log('wallet address', this.wallet.address)
    pinTxComposer.appendP2PKHOutput({
      address: new mvc.Address(this.wallet.address, 'testnet' as any),
      satoshis: 546,
    })

    const metaidOpreturn = buildOpReturnV2(metaidData)

    pinTxComposer.appendOpReturnOutput(metaidOpreturn)

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
    await this.batchBroadcast(payRes)

    for (const p of payRes) {
      const txid = p.getTxId()
      const isValid = !!(await fetchTxid(txid))
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

  async createMetaid(body?: { name?: string; avatar?: string }): Promise<{ metaid: string }> {
    const res = await this.createPin({
      operation: 'init',
      body: JSON.stringify(body),
      revealAddr: this.wallet.address,
    })
    return { metaid: res?.txid + 'i0' }
    // let user: any = {}
    // if (this.metaid) {
    //   user = await fetchUser(this.metaid)
    //   if (user && user.metaid && user.protocolTxid && (user.infoTxid && user).name) {
    //     this.user = user

    //     return
    //   }
    // }

    // // check if has enough balance
    // const biggestUtxoAmount = await fetchUtxos({ address: this.address }).then((utxos) => {
    //   return utxos.length
    //     ? utxos.reduce((prev, curr) => {
    //         return prev.value > curr.value ? prev : curr
    //       }, utxos[0]).value
    //     : 0
    // })

    // if (biggestUtxoAmount < LEAST_AMOUNT_TO_CREATE_METAID) {
    //   throw new Error(errors.NOT_ENOUGH_BALANCE_TO_CREATE_METAID)
    // }

    // if (!this.isMetaidValid()) {
    //   let allTransactions: Transaction[] = []
    //   let tempUser = {
    //     metaid: '',
    //     protocolTxid: '',
    //     infoTxid: '',
    //     name: '',
    //   }
    //   if (!user?.metaid) {
    //     // console.log('run in userMetaid')
    //     const Metaid = await this.use('metaid-root')
    //     const publicKey = await this.getPublicKey('/0/0')
    //     const tx1 = await Metaid.createMetaidRoot(
    //       {
    //         publicKey,
    //       },
    //       Metaid.schema.nodeName
    //     )
    //     allTransactions = allTransactions.concat(tx1)

    //     // this.metaid = tx1[tx1.length - 1].txComposer.getTxId()
    //     tempUser.metaid = tx1[tx1.length - 1].txComposer.getTxId()
    //   }
    //   await sleep(1000)
    //   if (!user?.protocolTxid) {
    //     const Protocols = await this.use('metaid-protocol')
    //     const publicKey = await this.getPublicKey('/0/2')
    //     const tx2 = await Protocols.createMetaidRoot(
    //       {
    //         publicKey,
    //         txid: tempUser.metaid,
    //       },
    //       Protocols.schema.nodeName
    //     )
    //     allTransactions = allTransactions.concat(tx2)
    //     tempUser.protocolTxid = tx2[tx2.length - 1].txComposer.getTxId()
    //   }
    //   if (!user?.infoTxid) {
    //     const Info = await this.use('metaid-info')
    //     const publicKey = await this.getPublicKey('/0/1')
    //     const tx3 = await Info.createMetaidRoot(
    //       {
    //         publicKey,
    //         txid: tempUser.metaid,
    //       },
    //       Info.schema.nodeName
    //     )
    //     allTransactions = allTransactions.concat(tx3)
    //     tempUser.infoTxid = tx3[tx3.length - 1].txComposer.getTxId()
    //   }
    //   if (!user?.name) {
    //     const Name = await this.use('metaid-name')
    //     const address = await this.getAddress('/0/1')
    //     const publicKey = await this.getPublicKey('/0/1')
    //     const useName = body?.name ? body.name : DEFAULT_USERNAME
    //     const tx4 = await Name.createMetaidRoot(
    //       {
    //         address,
    //         publicKey,
    //         txid: tempUser.infoTxid,
    //         body: useName,
    //       },
    //       Name.schema.nodeName
    //     )

    //     allTransactions = allTransactions.concat(tx4)
    //     tempUser.name = useName
    //   }
    //   // this.user = user
    //   const payRes = await this.wallet.pay({
    //     transactions: allTransactions,
    //   })

    //   await this.wallet.batchBroadcast(payRes)

    //   sleep(1000)
    //   for (const p of payRes) {
    //     const txid = p.getTxId()
    //     const isValid = !!(await fetchTxid(txid))
    //     // console.log('bbbbb', isValid, await fetchTxid(txid))
    //     if (isValid) {
    //       await notify({ txHex: p.getRawHex() })
    //     } else {
    //       throw new Error('txid is not valid')
    //     }
    //   }

    //   if (user?.metaId) {
    //     this.metaid = user.metaid
    //   } else {
    //     this.metaid = payRes[0].getTxId()
    //   }
    // }
    // await sleep(1000)
    // const refetchUser = await fetchUser(this.metaid)
    // this.user = refetchUser
    // console.log({ refetchUser })
    // return refetchUser
    return { metaid: 'abc' }
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

  broadcast(txComposer: TxComposer) {
    return this.wallet.broadcast(txComposer)
  }

  batchBroadcast(txComposer: TxComposer[]) {
    return this.wallet.batchBroadcast(txComposer)
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
