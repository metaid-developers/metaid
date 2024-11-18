import { BtcNetwork } from '@/service/btc'
import { mvcConnect, btcConnect } from '@/factories/connect.js'
import { MetaIDWalletForBtc } from '@/wallets/metalet/btcWallet'
import { MetaIDWalletForMvc } from '@/wallets/metalet/mvcWallet'

interface ChainWalletMap {
  btc: MetaIDWalletForBtc
  mvc: MetaIDWalletForMvc
}

export async function Connect<T extends keyof ChainWalletMap>({
  chain,
  wallet,
  network,
}: {
  chain: T
  wallet: ChainWalletMap[T]
  network: BtcNetwork
}) {
  switch (chain) {
    case 'mvc':
      return await mvcConnect({ wallet: wallet as ChainWalletMap['mvc'], network })
    case 'btc':
      return await btcConnect({ wallet: wallet as ChainWalletMap['btc'], network })
    default:
      throw new Error(`Unsupported chain: ${chain}`)
  }
}
