import { BtcNetwork } from '@/service/btc'
import { mvcConnect, btcConnect } from '@/factories/connect.js'
import { MetaletWalletForBtc, MetaletWalletForMvc } from '@metaid/metaid'
import { MvcConnector } from '@/core/connector/mvc';
import { BtcConnector } from '@/core/connector/btc';

class Connect {
  private mvcConnection: MvcConnector;
  private btcConnection: BtcConnector;

  constructor(private network: BtcNetwork) {
    this.initializeConnections();
  }

  private async initializeConnections() {
    this.mvcConnection = await mvcConnect({ wallet: await MetaletWalletForMvc.create(), network: this.network });
    this.btcConnection = await btcConnect({ wallet: await MetaletWalletForBtc.create(), network: this.network });
  }

  async use(chain: 'mvc' | 'btc', entitySymbol: string) {
    if (chain === 'mvc') {
      return this.mvcConnection.use(entitySymbol);
    } else if (chain === 'btc') {
      return this.btcConnection.use(entitySymbol);
    } else {
      throw new Error(`Unsupported chain: ${chain}`);
    }
  }
}

export default Connect;