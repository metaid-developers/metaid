import { type PsbtTxOutput, type Psbt } from './bitcoinjs-lib/psbt'

import { isTaprootInput } from 'bitcoinjs-lib/src/psbt/bip371'

const TX_EMPTY_SIZE = 4 + 1 + 1 + 4
const TX_INPUT_BASE = 32 + 4 + 1 + 4 // 41
const TX_INPUT_PUBKEYHASH = 107
const TX_INPUT_SEGWIT = 27
const TX_INPUT_TAPROOT = 17 // round up 16.5 bytes
const TX_OUTPUT_BASE = 8 + 1
const TX_OUTPUT_PUBKEYHASH = 25
const TX_OUTPUT_SCRIPTHASH = 23
const TX_OUTPUT_SEGWIT = 22
const TX_OUTPUT_SEGWIT_SCRIPTHASH = 34

type PsbtInput = (typeof Psbt.prototype.data.inputs)[0]

function inputBytes(input: PsbtInput) {
  // todo: script length
  if (isTaprootInput(input)) {
    return TX_INPUT_BASE + TX_INPUT_TAPROOT
  }

  if (input.witnessUtxo) return TX_INPUT_BASE + TX_INPUT_SEGWIT

  return TX_INPUT_BASE + TX_INPUT_PUBKEYHASH

  // return (
  //   TX_INPUT_BASE +
  //   (input.script
  //     ? input.script.length
  //     : input.isTaproot
  //     ? TX_INPUT_TAPROOT
  //     : input.witnessUtxo
  //     ? TX_INPUT_SEGWIT
  //     : TX_INPUT_PUBKEYHASH)
  // )
}

function outputBytes(output: PsbtTxOutput) {
  return (
    TX_OUTPUT_BASE +
    (output.script
      ? output.script.length
      : output.address?.startsWith('bc1') || output.address?.startsWith('tb1')
        ? output.address?.length === 42
          ? TX_OUTPUT_SEGWIT
          : TX_OUTPUT_SEGWIT_SCRIPTHASH
        : output.address?.startsWith('3') || output.address?.startsWith('2')
          ? TX_OUTPUT_SCRIPTHASH
          : TX_OUTPUT_PUBKEYHASH)
  )
}

export function transactionBytes(inputs: PsbtInput[], outputs: PsbtTxOutput[]) {
  const inputsSize = inputs.reduce(function (a, x) {
    return a + inputBytes(x)
  }, 0)
  const outputsSize = outputs.reduce(function (a, x) {
    return a + outputBytes(x)
  }, 0)

  console.log({
    inputsSize,
    outputsSize,
    TX_EMPTY_SIZE,
  })
  return TX_EMPTY_SIZE + inputsSize + outputsSize
}
