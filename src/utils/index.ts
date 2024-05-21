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

export async function checkBalance(address: string, amount: number = 1000) {
  const balance = await fetchUtxos({ address }).then((utxos) => {
    return utxos.length ? utxos.reduce((acc, utxo) => acc + utxo.value, 0) : 0
  })

  return balance >= amount
}
