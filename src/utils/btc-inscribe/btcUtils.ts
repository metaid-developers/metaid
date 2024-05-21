import { PsbtInput, TapKeySig, TapLeafScript, TapScriptSig } from './bitcoinjs-lib/bip174/interfaces'
import { checkForInput } from './bitcoinjs-lib/bip174/utils'
import { Psbt as IPsbt, Psbt, Signer } from './bitcoinjs-lib/psbt'
import { serializeTaprootSignature, tapScriptFinalizer, toXOnly } from './bitcoinjs-lib/psbt/bip371'
import { witnessStackToScriptWitness } from './bitcoinjs-lib/psbt/psbtutils'

export function buildRevelFinalizer(tapLeafScript: TapLeafScript): (
  index: number,
  _input: PsbtInput,
  _tapLeafHashToFinalize?: Buffer
) => {
  finalScriptWitness: Buffer | undefined
} {
  return (
    index: number,
    _input: PsbtInput,
    _tapLeafHashToFinalize?: Buffer
  ): {
    finalScriptWitness: Buffer | undefined
  } => {
    try {
      console.log('_input.tapScriptSig', _input.tapScriptSig)
      const scriptSolution = [_input.tapScriptSig[0].signature]
      const witness = scriptSolution.concat(tapLeafScript.script).concat(tapLeafScript.controlBlock)
      console.log('internal witness', witness)
      return { finalScriptWitness: witnessStackToScriptWitness(witness) }
    } catch (err) {
      throw new Error(`Can not finalize taproot input #${index}: ${err}`)
    }
  }
}

export function taprootSignInput(
  psbt: IPsbt,
  index: number,
  keyPair: Signer,
  tapLeafHashToSign?: Buffer,
  sighashTypes?: number[]
) {
  if (!keyPair || !keyPair.publicKey) throw new Error('Need Signer to sign input')
  const input = checkForInput(psbt.data.inputs, index)

  const hashesForSig = psbt.checkTaprootHashesForSig(index, input, keyPair, tapLeafHashToSign, sighashTypes)

  const tapKeySig: TapKeySig = hashesForSig
    .filter((h) => !h.leafHash)
    .map((h) => serializeTaprootSignature(keyPair.signSchnorr!(h.hash), input.sighashType))[0]

  const tapScriptSig: TapScriptSig[] = hashesForSig
    .filter((h) => !!h.leafHash)
    .map(
      (h) =>
        ({
          pubkey: toXOnly(keyPair.publicKey),
          signature: serializeTaprootSignature(keyPair.signSchnorr!(h.hash), input.sighashType),
          leafHash: h.leafHash,
        }) as TapScriptSig
    )
  console.log('hashForSig', hashesForSig)
  console.log('tapScriptSig', tapScriptSig)
  if (tapKeySig) {
    psbt.data.updateInput(index, { tapKeySig })
  }

  if (tapScriptSig.length) {
    psbt.data.updateInput(index, { tapScriptSig })
  }

  return psbt
}

export function taprootFinalInput(psbt: IPsbt, index: number, finalScriptsFunc = tapScriptFinalizer) {
  const { finalScriptWitness } = finalScriptsFunc(index, psbt.data.inputs[index])
  psbt.data.updateInput(index, { finalScriptWitness })

  psbt.data.clearFinalizedInput(index)
  return psbt
}
