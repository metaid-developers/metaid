import { FEEB, P2PKH_UNLOCK_SIZE } from '@/data/constants.js'
import type { mvc } from 'meta-contract'

type SA_utxo = {
  txId: string
  outputIndex: number
  satoshis: number
  address: string
  height: number
}

export function pickUtxo(utxos: SA_utxo[], amount: number) {
  // amount + 2 outputs + buffer
  let requiredAmount = amount + 34 * 2 * FEEB + 100

  if (requiredAmount <= 0) {
    return []
  }

  // if the sum of utxos is less than requiredAmount, throw error
  const sum = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0)
  if (sum < requiredAmount) {
    throw new Error('Not enough balance')
  }

  const candidateUtxos: SA_utxo[] = []
  // split utxo to confirmed and unconfirmed and shuffle them
  const confirmedUtxos = utxos
    .filter((utxo) => {
      return utxo.height > 0
    })
    .sort(() => Math.random() - 0.5)
  const unconfirmedUtxos = utxos
    .filter((utxo) => {
      return utxo.height < 0
    })
    .sort(() => Math.random() - 0.5)

  let current = 0
  // use confirmed first
  for (let utxo of confirmedUtxos) {
    current += utxo.satoshis
    // add input fee
    requiredAmount += FEEB * P2PKH_UNLOCK_SIZE
    candidateUtxos.push(utxo)
    if (current > requiredAmount) {
      return candidateUtxos
    }
  }
  for (let utxo of unconfirmedUtxos) {
    current += utxo.satoshis
    // add input fee
    requiredAmount += FEEB * P2PKH_UNLOCK_SIZE
    candidateUtxos.push(utxo)
    if (current > requiredAmount) {
      return candidateUtxos
    }
  }
  return candidateUtxos
}

export async function parseLocalTransaction(transaction: mvc.Transaction): Promise<{
  messages: (string | Buffer)[]
  outputIndex: number | null
}> {
  // loop through all outputs and find the one with OP_RETURN
  const outputs = transaction.outputs
  const outputIndex = outputs.findIndex((output) => output.script.toASM().includes('OP_RETURN'))

  if (outputIndex === -1)
    return {
      messages: [],
      outputIndex: null,
    }

  const outputAsm = outputs[outputIndex].script.toASM()
  const asmFractions = outputAsm.split('OP_RETURN')[1].trim().split(' ')
  let messages: any = asmFractions.map((fraction: string) => {
    return Buffer.from(fraction, 'hex').toString()
  })

  // if data type is binary, revert data to buffer
  const isBinary = messages[messages.length - 1] === 'binary'
  if (isBinary) {
    messages[5] = Buffer.from(asmFractions[5], 'hex')
  }

  return {
    messages,
    outputIndex,
  }
}
