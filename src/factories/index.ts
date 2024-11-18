import { BtcNetwork } from '@/service/btc'
import { mvcConnect, btcConnect } from '@/factories/connect.js'
import { MetaletWalletForBtc, MetaletWalletForMvc } from '@metaid/metaid'
import { MvcConnector } from '@/core/connector/mvc'
import { BtcConnector } from '@/core/connector/btc'
import { MetaletWalletForBtc as BtcWallet } from '@/wallets/metalet/btc'
import { MetaletWalletForMvc as MvcWallet } from '@/wallets/metalet/mvc'

class Connect {
  private mvcConnection: MvcConnector
  private btcConnection: BtcConnector

  constructor(private network: BtcNetwork) {
    this.initializeConnections()
  }

  private async initializeConnections() {
    const {
      btc: { address: btcAddress, pubKey: btcPubKey },
      mvc: { address: mvcAddress, pubKey: mvcPubKey },
    } = await window.metaidwallet.common.omniConnect()
    const mvcWallet = await MetaletWalletForMvc.restore({ address: mvcAddress, xpub: mvcPubKey })
    const btcWallet = await MetaletWalletForBtc.restore({
      address: btcAddress,
      pub: btcPubKey,
      internal: window.metaidwallet,
    })
    this.mvcConnection = await mvcConnect({ wallet: mvcWallet, network: this.network })
    this.btcConnection = await btcConnect({ wallet: btcWallet, network: this.network })
  }

  async use(chain: 'mvc' | 'btc', entitySymbol: string) {
    if (chain === 'mvc') {
      return this.mvcConnection.use(entitySymbol)
    } else if (chain === 'btc') {
      return this.btcConnection.use(entitySymbol)
    } else {
      throw new Error(`Unsupported chain: ${chain}`)
    }
  }

  static async restore({
    mvcAddress,
    mvcPub,
    btcAddress,
    btcPub,
    internal,
  }: {
    mvcAddress: string
    mvcPub: string
    btcAddress: string
    btcPub: string
    internal: Window['metaidwallet']
  }) {
    const mvcWallet = await MetaletWalletForMvc.restore({ address: mvcAddress, xpub: mvcPub })
    const btcWallet = await MetaletWalletForBtc.restore({ address: btcAddress, pub: btcPub, internal })

    return {
      mvcWallet,
      btcWallet,
    }
  }
}

export default Connect
