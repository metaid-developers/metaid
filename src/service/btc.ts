import { UserInfo } from '@/types'
import axios from 'axios'

export type Utxo = {
  confirmed: boolean
  inscriptions: string | null
  satoshi: number
  txId: string
  vout: number
}

export type Pin = {
  id: string
  number: number
  rootTxId: string
  address: string
  createAddress: string
  output: string
  outputValue: number
  timestamp: number
  genesisFee: number
  genesisHeight: number
  genesisTransaction: string
  txInIndex: number
  txInOffset: number
  operation: string
  path: string
  parentPath: string
  encryption: string
  version: string
  contentType: string
  contentBody: string
  contentLength: number
  contentSummary: string
  status: number
  originalId: string
  isTransfered: boolean
  preview: string
  content: string
  pop: string
  metaid: string
}

// export type UserInfo = {
//   number: number
//   rootTxId: string
//   name: string
//   nameId: string
//   address: string
//   avatar: string | null
//   avatarId: string
//   bio: string
//   bioId: string
//   soulbondToken: string
//   unconfirmed: string
//   isInit: boolean
// }
export type BtcNetwork = 'mainnet' | 'testnet' | 'regtest'

const BASE_METALET_TEST_URL = `https://www.metalet.space/wallet-api/v3`

const BASE_METAID_URL_TESTNET = `https://man-test.metaid.io`
const BASE_METAID_URL_REGEST = `https://man.somecode.link`
const BASE_METAID_URL_MAINNET = `https://man.metaid.io`

const MAN_BASE_URL_MAPPING = {
  testnet: BASE_METAID_URL_TESTNET,
  regtest: BASE_METAID_URL_REGEST,
  mainnet: BASE_METAID_URL_MAINNET,
}

export async function fetchUtxos({
  address,
  network = 'testnet',
}: {
  address: string
  network: BtcNetwork
}): Promise<Utxo[]> {
  const url = `${BASE_METALET_TEST_URL}/address/btc-utxo?net=${network}&address=${address}
  `
  try {
    const data = await axios.get(url).then((res) => res.data)

    return data.data
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function broadcast({
  rawTx,
  publicKey,
  network,
  message,
}: {
  rawTx: string
  publicKey: string
  network: BtcNetwork
  message: string
}): Promise<{ data: any; code: number; message: string }> {
  const url = `${BASE_METALET_TEST_URL}/tx/broadcast`
  const signature = await window.metaidwallet.btc.signMessage(message)

  try {
    const data = await axios.post(
      url,
      {
        chain: 'btc',
        net: network,
        rawTx: rawTx,
      },
      {
        headers: {
          'X-Signature': signature,
          'X-Public-Key': publicKey,
        },
      }
    )
    return data.data
  } catch (error) {
    console.log(error)
  }
}

export async function getPinDetailByPid({
  pid,
  network = 'testnet',
}: {
  pid: string
  network: BtcNetwork
}): Promise<Pin | null> {
  const url = `${MAN_BASE_URL_MAPPING[network]}/api/pin/${pid}`

  try {
    const data = await axios.get(url).then((res) => res.data)

    return data.data
  } catch (error) {
    console.error(error)
    return null
  }
}
export async function getRootPinByAddress({
  address,
  network,
}: {
  address: string
  network: BtcNetwork
}): Promise<Pin | null> {
  const url = `${MAN_BASE_URL_MAPPING[network]}/api/address/pin/root/${address}`

  try {
    const data = await axios.get(url).then((res) => res.data)

    return data.data
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getAllPinByPath({
  page,
  limit,
  path,
  network,
}: {
  page: number
  limit: number
  path: string
  network: BtcNetwork
}): Promise<{ total: number; currentPage: Pin[] } | null> {
  const url = `${MAN_BASE_URL_MAPPING[network]}/api/getAllPinByPath?page=${page}&limit=${limit}&path=${path}`
  console.log('all pin by path', url)
  try {
    const data = await axios.get(url).then((res) => res.data)
    return { total: data.data.total, currentPage: data.data.list }
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getPinListByAddress({
  address,
  network,
  cursor,
  size,
  path,
  cnt = true,
  addressType = 'owner',
}: {
  address: string
  network: BtcNetwork
  cursor: string
  size: string
  path: string
  addressType?: string
  cnt?: boolean
}): Promise<{ list: Pin[] | null; total: number }> {
  const url = `${MAN_BASE_URL_MAPPING[network]}/api/address/pin/list/${addressType}/${address}`

  try {
    const data = await axios.get(url, { params: { cnt, cursor, size, path } }).then((res) => res.data)
    return data.data
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function getInfoByAddress({
  address,
  network = 'testnet',
}: {
  address: string
  network: BtcNetwork
}): Promise<UserInfo | null> {
  const url = `${MAN_BASE_URL_MAPPING[network]}/api/info/address/${address}`

  try {
    const data = await axios.get(url).then((res) => res.data)

    return data.data
  } catch (error) {
    console.error(error)
    return null
  }
}
