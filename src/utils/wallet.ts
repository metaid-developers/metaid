import { mvc } from 'meta-contract'
import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs'
import bitcoinjs from 'bitcoinjs-lib'
import BIP32Factory, { type BIP32Interface } from 'bip32'
import type { AddressType, Network } from '@/types/index.js'
import bip39 from '@scure/bip39'
import { raise } from './helper.js'
// function deriveMvcAddress(mnemonic: string, path: string, network: Network): string {
//   const privateKey = deriveMvcPrivateKey(mnemonic, path, network)

//   return privateKey.toAddress(network).toString()
// }

function deriveMvcPrivateKey(mnemonic: string, path: string, network: Network): mvc.PrivateKey {
  const mneObj = mvc.Mnemonic.fromString(mnemonic)
  const hdpk = mneObj.toHDPrivateKey('', network)

  return hdpk.deriveChild(path).privateKey
}

function deriveBtcPrivateKey(mnemonic: string, path: string, network: Network): BIP32Interface {
  const bip32 = BIP32Factory(ecc)
  const btcNetwork = network === 'mainnet' ? bitcoinjs.networks.bitcoin : bitcoinjs.networks.testnet
  const seed = bip39.mnemonicToSeedSync(mnemonic) as any
  const master = bip32.fromSeed(seed, btcNetwork)

  return master.derivePath(path)
}

function deriveBtcAddress(mnemonic: string, path: string, network: Network): string {
  bitcoinjs.initEccLib(ecc)
  const { networks, payments } = bitcoinjs

  const child = deriveBtcPrivateKey(mnemonic, path, network)
  const btcNetwork = network === 'mainnet' ? networks.bitcoin : networks.testnet
  const publicKey = child.publicKey

  // Infer address type based on path
  const addressType = inferAddressType(path)

  switch (addressType) {
    case 'P2PKH':
      return payments.p2pkh({ pubkey: publicKey, network: btcNetwork }).address ?? raise('Invalid address')
    case 'P2SH-P2WPKH':
      return payments.p2sh({ redeem: payments.p2wpkh({ pubkey: publicKey }) }).address ?? raise('Invalid address')
    case 'P2WPKH':
      return payments.p2wpkh({ pubkey: publicKey, network: btcNetwork }).address ?? raise('Invalid address')
    case 'P2TR':
      return (
        payments.p2tr({ internalPubkey: publicKey.subarray(1), network: btcNetwork }).address ??
        raise('Invalid address')
      )
  }
}

export function inferAddressType(path: string): AddressType {
  const pathProtocolNumber = parseInt(path.split('/')[1].replace("'", ''), 10)
  let addressType: 'P2PKH' | 'P2SH-P2WPKH' | 'P2WPKH' | 'P2TR'
  switch (pathProtocolNumber) {
    case 44:
      addressType = 'P2PKH'
      break
    case 49:
      addressType = 'P2SH-P2WPKH'
      break
    case 84:
      addressType = 'P2WPKH'
      break
    case 86:
      addressType = 'P2TR'
      break
    default:
      addressType = 'P2PKH'
  }

  return addressType
}
