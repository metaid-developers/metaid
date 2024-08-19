/* eslint-disable @typescript-eslint/no-unused-vars */
import * as bitcoin from './bitcoinjs-lib'
import { Psbt } from './bitcoinjs-lib/psbt'

import { base, signUtil } from '@okxweb3/crypto-lib'
import * as taproot from './taproot'
import * as bcrypto from './bitcoinjs-lib/crypto'
import { vectorSize } from './bitcoinjs-lib/transaction'
import { getAddressType, sign } from './txBuild'
import { type BIP32Interface } from 'bip32'
import { transactionBytes } from './txEstimate'
import type { PsbtInput, TapLeafScript } from './bitcoinjs-lib/bip174/interfaces'
import { buildRevelFinalizer } from './btcUtils'
import { InscriptionRequest, MetaidData } from '@/types'

const schnorr = signUtil.schnorr.secp256k1.schnorr

export type Operation = 'init' | 'create' | 'modify' | 'revoke'
export type Encryption = '0' | '1' | '2'

export type PrevOutput = {
  txId: string
  vOut: number
  amount: number
  address: string
  pub: string
}

// export type InscriptionRequest = {
//   // commitTxPrevOutputList: PrevOutput[]
//   feeRate: number
//   metaidDataList: MetaidData[]
//   revealOutValue: number
//   changeAddress: string
//   minChangeValue?: number
// }

export type InscribePsbts = {
  commitPsbt: string
  revealPsbts: string[]
  commitTxFee: number
  revealTxFees: number[]
  commitAddrs: string[]
  hash: Buffer | null
  witness: Buffer[] | null
  revealFn: (
    inputIndex: number,
    _input: PsbtInput,
    _tapLeafHashToFinalize?: Buffer
  ) => {
    finalScriptWitness: Buffer
  }
}

export type TxOut = {
  pkScript: Buffer
  value: number
}

type InscriptionTxCtxData = {
  publicKey: string
  inscriptionScript: Buffer
  commitTxAddress: string
  commitTxAddressPkScript: Buffer
  witness: Buffer[]
  hash: Buffer
  revealTxPrevOutput: TxOut
  revealPkScript: Buffer
}

const defaultTxVersion = 2
const defaultSequenceNum = 0xfffffffd
const defaultRevealOutValue = 546
const defaultMinChangeValue = 546

const maxStandardTxWeight = 4000000 / 10

export class InscriptionTool {
  network: bitcoin.Network = bitcoin.networks.bitcoin
  inscriptionTxCtxDataList: InscriptionTxCtxData[] = []
  revealPsbts: Psbt[] = []
  commitPsbt: Psbt = new Psbt()
  commitPsbtPrevOutputFetcher: number[] = []
  revealPsbtPrevOutputFetcher: number[] = []
  mustCommitPsbtFee: number = 0
  mustRevealPsbtFees: number[] = []
  commitAddrs: string[] = []
  revealFn: (
    inputIndex: number,
    _input: PsbtInput,
    _tapLeafHashToFinalize?: Buffer
  ) => {
    finalScriptWitness: Buffer
  }
  static newInscriptionTool(network: bitcoin.Network, request: any) {
    const tool = new InscriptionTool()
    tool.network = network

    const revealOutValue = request.revealOutValue || defaultRevealOutValue
    const minChangeValue = request.minChangeValue || defaultMinChangeValue

    // TODO: use commitPsbt first input privateKey
    request.metaidDataList.forEach((metaidData) => {
      tool.inscriptionTxCtxDataList.push(
        createInscriptionTxCtxData(network, metaidData, request.commitTxPrevOutputList[0].pub)
      )
    })

    const totalRevealPrevOutputValue = tool.buildEmptyRevealTx(network, revealOutValue, request.revealFeeRate)
    const insufficient = tool.buildCommitTx(
      network,
      request.commitTxPrevOutputList,
      request.changeAddress,
      totalRevealPrevOutputValue,
      request.commitFeeRate,
      minChangeValue
    )
    if (insufficient) {
      return tool
    }
    // tool.signCommitTx(request.commitTxPrevOutputList);
    tool.completeRevealTx()

    return tool
  }

  buildEmptyRevealTx(network: bitcoin.Network, revealOutValue: number, revealFeeRate: number) {
    let totalPrevOutputValue = 0
    const revealPsbts: Psbt[] = []
    const mustRevealTxFees: number[] = []
    const commitAddrs: string[] = []
    this.inscriptionTxCtxDataList.forEach((inscriptionTxCtxData, i) => {
      const psbt = new Psbt()

      psbt.version = defaultTxVersion

      psbt.addInput({
        hash: Buffer.alloc(32),
        index: i,
        sequence: defaultSequenceNum,
      })

      psbt.addOutput({
        script: inscriptionTxCtxData.revealPkScript,
        value: revealOutValue,
      })

      const emptySignature = Buffer.alloc(64)
      const emptyControlBlockWitness = Buffer.alloc(33)
      const txWitness: Buffer[] = []
      txWitness.push(emptySignature)
      txWitness.push(inscriptionTxCtxData.inscriptionScript)
      txWitness.push(emptyControlBlockWitness)

      const psbtClone = psbt.clone()

      const fee = transactionBytes(psbtClone.data.inputs, psbt.txOutputs) * revealFeeRate

      const prevOutputValue = revealOutValue + fee
      inscriptionTxCtxData.revealTxPrevOutput = {
        pkScript: inscriptionTxCtxData.commitTxAddressPkScript,
        value: prevOutputValue,
      }

      totalPrevOutputValue += prevOutputValue
      revealPsbts.push(psbt)
      mustRevealTxFees.push(fee)
      commitAddrs.push(inscriptionTxCtxData.commitTxAddress)
    })

    this.revealPsbts = revealPsbts
    this.mustRevealPsbtFees = mustRevealTxFees
    this.commitAddrs = commitAddrs

    return totalPrevOutputValue
  }

  buildCommitTx(
    network: bitcoin.Network,
    commitTxPrevOutputList: PrevOutput[],
    changeAddress: string,
    totalRevealPrevOutputValue: number,
    commitFeeRate: number,
    minChangeValue: number
  ): boolean {
    let totalSenderAmount = 0

    const psbt = new Psbt()

    psbt.version = defaultTxVersion

    commitTxPrevOutputList.forEach((commitTxPrevOutput) => {
      const hash = base.reverseBuffer(base.fromHex(commitTxPrevOutput.txId))

      psbt.addInput({
        hash: commitTxPrevOutput.txId,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(commitTxPrevOutput.address, network),
          value: commitTxPrevOutput.amount,
        },
        index: commitTxPrevOutput.vOut,
        sighashType: 1,
      })

      this.commitPsbtPrevOutputFetcher.push(commitTxPrevOutput.amount)
      totalSenderAmount += commitTxPrevOutput.amount
    })

    this.inscriptionTxCtxDataList.forEach((inscriptionTxCtxData) => {
      psbt.addOutput({
        script: inscriptionTxCtxData.revealTxPrevOutput.pkScript,
        value: inscriptionTxCtxData.revealTxPrevOutput.value,
      })
    })

    const changePkScript = bitcoin.address.toOutputScript(changeAddress, network)
    const psbt_clone = psbt.clone()
    psbt_clone.addOutput({
      script: changePkScript,
      value: 0,
    })

    const txEstimateSize = transactionBytes(psbt_clone.data.inputs, psbt_clone.txOutputs)

    const fee = Math.floor(txEstimateSize * commitFeeRate)
    const changeAmount = totalSenderAmount - totalRevealPrevOutputValue - fee
    if (changeAmount >= minChangeValue) {
      psbt.addOutput({
        script: changePkScript,
        value: changeAmount,
      })
    } else {
      const new_txEstimateSize = transactionBytes(psbt.data.inputs, psbt.txOutputs)

      const feeWithoutChange = Math.floor(new_txEstimateSize * commitFeeRate)
      if (totalSenderAmount - totalRevealPrevOutputValue - feeWithoutChange < 0) {
        this.mustCommitPsbtFee = fee
        return true
      }
    }

    this.commitPsbt = psbt
    return false
  }

  // signCommitTx(commitTxPrevOutputList: PrevOutput[]) {
  // 	signTx(this.commitPsbt, commitTxPrevOutputList, this.network);
  // }

  completeRevealTx() {
    const finalRevealTxs = []
    this.inscriptionTxCtxDataList.forEach((inscriptionTxCtxData, i) => {
      const psbt = new Psbt()

      psbt.version = defaultTxVersion

      const commitTx = (this.commitPsbt.data.globalMap.unsignedTx as any).tx
      const commitTxHash: string = (commitTx as any).getId()

      const redeem = {
        output: inscriptionTxCtxData.inscriptionScript,
        redeemVersion: 0xc0,
      }

      const tapLeafScript: TapLeafScript = {
        leafVersion: redeem.redeemVersion,
        script: redeem.output,
        controlBlock: inscriptionTxCtxData.witness![inscriptionTxCtxData.witness!.length - 1],
      }
      const customRevealFn = buildRevelFinalizer(tapLeafScript)
      this.revealFn = customRevealFn

      psbt.addInput({
        hash: commitTxHash,
        index: i,
        witnessUtxo: {
          script: inscriptionTxCtxData.revealTxPrevOutput.pkScript,
          value: inscriptionTxCtxData.revealTxPrevOutput.value,
        },
        sighashType: 1,
        tapMerkleRoot: inscriptionTxCtxData.hash,
        tapInternalKey: Buffer.from(inscriptionTxCtxData.publicKey, 'hex').slice(1),
        tapLeafScript: [tapLeafScript],
      })

      // psbt.updateInput(i, { tapLeafScript: [tapLeafScript] })

      psbt.addOutput({
        script: inscriptionTxCtxData.revealPkScript,
        value: this.revealPsbts[i].txOutputs[0].value,
      })
      finalRevealTxs.push(psbt)
    })

    this.revealPsbts = finalRevealTxs
  }

  calculateFee() {
    let commitTxFee = 0
    this.commitPsbt.txInputs.forEach((_, i) => {
      commitTxFee += this.commitPsbtPrevOutputFetcher[i]
    })
    this.commitPsbt.txOutputs.forEach((out) => {
      commitTxFee -= out.value
    })
    const revealTxFees: number[] = []
    this.revealPsbts.forEach((revealPsbt, i) => {
      let revealTxFee = 0
      revealTxFee += this.revealPsbtPrevOutputFetcher[i]
      revealTxFee -= revealPsbt.txOutputs[0].value
      revealTxFees.push(revealTxFee)
    })

    return {
      commitTxFee,
      revealTxFees,
    }
  }
}

// function signTx(
// 	tx: bitcoin.Transaction,
// 	commitTxPrevOutputList: PrevOutput[],
// 	network: bitcoin.Network
// ) {
// 	tx.ins.forEach((input, i) => {
// 		const addressType = getAddressType(commitTxPrevOutputList[i].address, network);
// 		const privateKey = commitTxPrevOutputList[i].keyPairs.privateKey;
// 		const privateKeyHex = base.toHex(privateKey!);
// 		const publicKey = commitTxPrevOutputList[i].keyPairs.publicKey;

// 		if (addressType === "segwit_taproot") {
// 			const prevOutScripts = commitTxPrevOutputList.map((o) =>
// 				bitcoin.address.toOutputScript(o.address, network)
// 			);
// 			const values = commitTxPrevOutputList.map((o) => o.amount);
// 			const hash = tx.hashForWitnessV1(
// 				i,
// 				prevOutScripts,
// 				values,
// 				bitcoin.Transaction.SIGHASH_DEFAULT
// 			);
// 			const tweakedPrivKey = taproot.taprootTweakPrivKey(privateKey!);
// 			const signature = Buffer.from(schnorr.sign(hash, tweakedPrivKey, base.randomBytes(32)));

// 			input.witness = [Buffer.from(signature)];
// 		} else if (addressType === "legacy") {
// 			const prevScript = bitcoin.address.toOutputScript(
// 				commitTxPrevOutputList[i].address,
// 				network
// 			);
// 			const hash = tx.hashForSignature(i, prevScript, bitcoin.Transaction.SIGHASH_ALL)!;
// 			const signature = sign(hash, privateKeyHex);
// 			const payment = bitcoin.payments.p2pkh({
// 				signature: bitcoin.script.signature.encode(
// 					signature,
// 					bitcoin.Transaction.SIGHASH_ALL
// 				),
// 				pubkey: publicKey,
// 			});

// 			input.script = payment.input!;
// 		} else {
// 			const pubKeyHash = bcrypto.hash160(publicKey);
// 			const prevOutScript = Buffer.of(0x19, 0x76, 0xa9, 0x14, ...pubKeyHash, 0x88, 0xac);
// 			const value = commitTxPrevOutputList[i].amount;
// 			const hash = tx.hashForWitness(
// 				i,
// 				prevOutScript,
// 				value,
// 				bitcoin.Transaction.SIGHASH_ALL
// 			);
// 			const signature = sign(hash, privateKeyHex);

// 			input.witness = [
// 				bitcoin.script.signature.encode(signature, bitcoin.Transaction.SIGHASH_ALL),
// 				publicKey,
// 			];

// 			const redeemScript = Buffer.of(0x16, 0, 20, ...pubKeyHash);
// 			if (addressType === "segwit_nested") {
// 				input.script = redeemScript;
// 			}
// 		}
// 	});
// }

function createInscriptionTxCtxData(
  network: bitcoin.Network,
  metaidData: MetaidData,
  pub: string
): InscriptionTxCtxData {
  const internalPubKey = Buffer.from(pub, 'hex').slice(1)
  const ops = bitcoin.script.OPS

  const inscriptionBuilder: bitcoin.payments.StackElement[] = []
  inscriptionBuilder.push(internalPubKey)
  inscriptionBuilder.push(ops.OP_CHECKSIG)
  inscriptionBuilder.push(ops.OP_FALSE)
  inscriptionBuilder.push(ops.OP_IF)
  inscriptionBuilder.push(Buffer.from('metaid'))
  inscriptionBuilder.push(Buffer.from(metaidData.operation))

  if (metaidData.operation !== 'init') {
    inscriptionBuilder.push(Buffer.from(metaidData.path!))
    inscriptionBuilder.push(Buffer.from(metaidData?.encryption ?? '0'))
    inscriptionBuilder.push(Buffer.from(metaidData?.version ?? '1.0.0'))
    inscriptionBuilder.push(Buffer.from(metaidData?.contentType ?? 'utf-8'))

    const body = Buffer.from(metaidData.body!)
    const maxChunkSize = 520
    const bodySize = (body as Buffer).length
    for (let i = 0; i < bodySize; i += maxChunkSize) {
      let end = i + maxChunkSize
      if (end > bodySize) {
        end = bodySize
      }
      inscriptionBuilder.push((body as Buffer).slice(i, end))
    }
  }
  inscriptionBuilder.push(ops.OP_ENDIF)

  const inscriptionScript = bitcoin.script.compile(inscriptionBuilder)

  const scriptTree = {
    output: inscriptionScript,
  }
  const redeem = {
    output: inscriptionScript,
    redeemVersion: 0xc0,
  }

  const { output, witness, hash, address } = bitcoin.payments.p2tr({
    internalPubkey: internalPubKey,
    scriptTree,
    redeem,
    network,
  })

  return {
    publicKey: pub,
    inscriptionScript,
    commitTxAddress: address!,
    commitTxAddressPkScript: output!,
    witness: witness!,
    hash: hash!,
    revealTxPrevOutput: {
      pkScript: Buffer.alloc(0),
      value: 0,
    },
    revealPkScript: bitcoin.address.toOutputScript(metaidData.revealAddr, network),
  }
}

export function inscribePsbt(network: bitcoin.Network, request: InscriptionRequest) {
  const tool = InscriptionTool.newInscriptionTool(network, request)
  if (tool.mustCommitPsbtFee > 0) {
    return {
      commitPsbt: '',
      revealPsbts: [],
      commitTxFee: tool.mustCommitPsbtFee,
      revealTxFees: tool.mustRevealPsbtFees,
      commitAddrs: tool.commitAddrs,
      hash: null,
      revealFn: null,
      witness: null,
    }
  }

  return {
    commitPsbt: tool.commitPsbt.toHex(),
    revealPsbts: tool.revealPsbts.map((revealPsbt) => revealPsbt.toHex()),
    ...tool.calculateFee(),
    commitAddrs: tool.commitAddrs,
    hash: tool.inscriptionTxCtxDataList[0].hash,
    witness: tool.inscriptionTxCtxDataList[0].witness,
    revealFn: tool.revealFn,
  }
}
