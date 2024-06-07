import type { MetaIDWalletForMvc } from '@/wallets/metalet/mvcWallet.js'
import type { MetaIDWalletForBtc } from '@/wallets/metalet/btcWallet.js'

import { MvcConnector as _MvcConnector } from '@/core/connector/mvc.js'
import { BtcConnector as _BtcConnector } from '@/core/connector/btc.js'

import type { MvcConnector } from '@/core/connector/mvc.js'
import type { BtcConnector } from '@/core/connector/btc.js'
import { BtcNetwork } from '@/service/btc'

export async function mvcConnect({
  wallet,
  network,
}: {
  wallet?: MetaIDWalletForMvc
  network: BtcNetwork
}): Promise<MvcConnector> {
  return await _MvcConnector.create({ wallet, network })
}

export async function btcConnect({
  wallet,
  network,
}: {
  wallet?: MetaIDWalletForBtc
  network: BtcNetwork
}): Promise<BtcConnector> {
  return await _BtcConnector.create({ wallet, network })
}
