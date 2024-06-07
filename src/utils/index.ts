import { BtcNetwork } from '@/service/btc'
import { fetchUtxos } from '@/service/mvc.js'

/* class decorator */
export function staticImplements<T>() {
  return <U extends T>(constructor: U) => {
    constructor
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function checkBalance({
  address,
  network,
  amount = 1000,
}: {
  address: string
  network: BtcNetwork
  amount?: number
}) {
  const balance = await fetchUtxos({ address, network }).then((utxos) => {
    return utxos.length ? utxos.reduce((acc, utxo) => acc + utxo.value, 0) : 0
  })

  return balance >= amount
}
