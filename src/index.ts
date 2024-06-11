import { define } from '@/factories/define.js'
import { useMvc, useBtc } from '@/factories/use.js'
import { mvcConnect, btcConnect } from '@/factories/connect.js'
// import { LocalWallet } from '@/wallets/localwallet/local.js'
import { MetaletWalletForMvc } from '@/wallets/metalet/mvc.js'
import { MetaletWalletForBtc } from './wallets/metalet/btc.js'

// import { Psbt } from '@/utils/btc-inscribe/bitcoinjs-lib/psbt.js'
// import { Transaction } from './utils/btc-inscribe/bitcoinjs-lib/transaction.js'

import type { EntitySchema } from '@/metaid-entities/entity.js'
import { BtcEntity as IBtcEntity } from './core/entity/btc/index.js'
import type { MetaIDWalletForBtc as IMetaletWalletForBtc } from '@/wallets/metalet/btcWallet.js'
import { type Transaction as MvcTransaction } from '@/wallets/metalet/mvcWallet.js'

import type { IBtcConnector } from '@/core/connector/btcConnector.js'
import type { SubMetaidData, InscriptionRequest } from '@/types/index.js'

export {
  // Psbt,
  // Transaction,
  define,
  useMvc,
  useBtc,
  mvcConnect,
  btcConnect,
  //LocalWallet,
  MetaletWalletForMvc,
  MetaletWalletForBtc,
  MvcTransaction,
}
export type { EntitySchema, SubMetaidData as CreateOptions, IMetaletWalletForBtc, IBtcConnector, InscriptionRequest }
export { IBtcEntity }
