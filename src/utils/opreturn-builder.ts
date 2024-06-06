import { BrfcRootName, ProtocolName } from '@/data/protocols.js'
import { Encryption, MetaidData, Operation } from '@/types'
import { isNil } from 'ramda'
type OpReturnV2 = [
  'testid', // testid for Testnet, metaid for Mainnet
  Operation,
  string | undefined, // path example: /protocols/simplebuzz
  Encryption | undefined,
  string | undefined, // version
  string | undefined, // contentType,
  string | Buffer | undefined,
]

export function buildOpReturnV2(metaidData: Omit<MetaidData, 'revealAddr'>): OpReturnV2 {
  const res1 = ['testid', metaidData.operation]
  let res2 = []
  if (metaidData.operation !== 'init') {
    res2.push(metaidData.path!)
    res2.push(metaidData?.encryption ?? '0')
    res2.push(metaidData?.version ?? '1.0.0')
    res2.push(metaidData?.contentType ?? 'utf-8')

    const body = isNil(metaidData.body)
      ? undefined
      : Buffer.isBuffer(metaidData.body)
        ? metaidData.body
        : JSON.stringify(metaidData.body)

    res2.push(body)
    // const maxChunkSize = 520
    // const bodySize = (body as Buffer).length
    // for (let i = 0; i < bodySize; i += maxChunkSize) {
    //   let end = i + maxChunkSize
    //   if (end > bodySize) {
    //     end = bodySize
    //   }
    //   res.push((body as Buffer).slice(i, end))
    // }
  }
  return [...res1, ...res2] as OpReturnV2
}

type MetaidOpreturn = [
  'mvc', // chain flag
  string, // public key of node
  string, // `${parentChainFlag(optional)}:${parentTxid}`
  'metaid',
  string, // protocol name
  string | Buffer, // stringify json body
  '0' | '1', // isEncrypted
  string, // version
  string, // content type
  string, // charset
]

type RootOpreturn = [
  'mvc', // chain flag
  string, // public key of node
  string, // `${parentChainFlag(optional)}:${parentTxid}`
  'metaid',
  string, // protocol name
  string, //brfcid
  string, // stringify json body
  '0' | '1', // isEncrypted
  string, // version
  string, // content type
  string, // charset
]

type UserOpreturn = [
  'mvc', // chain flag
  string, // public key of node
  string, // `${parentChainFlag(optional)}:${parentTxid}`
  'metaid',
  string, // protocol name
  string, // stringify json body
  '0' | '1', // isEncrypted
  string, // version
  string, // content type
  string, // charset
]

export function buildRootOpreturn({ publicKey, parentTxid, schema, body }) {
  const opreturn: RootOpreturn = [
    'mvc',
    publicKey,
    'mvc:' + parentTxid,
    'metaid',
    schema.nodeName,
    schema.versions[0].id,
    body,
    '0',
    String(schema.versions[0].version),
    'text/plain',
    'UTF-8',
  ]
  console.log({ opreturn })

  return opreturn
}

export function buildOpreturn({
  publicKey,
  parentTxid,
  protocolName,
  body,
  invisible,
  dataType = 'application/json',
  encoding = 'UTF-8',
}: {
  publicKey: string
  parentTxid: string
  protocolName: string
  body: any
  invisible?: boolean
  dataType?: string
  encoding?: string
}) {
  const opreturn: MetaidOpreturn = [
    'mvc',
    publicKey,
    'mvc:' + parentTxid,
    'metaid',
    protocolName + '-' + publicKey.slice(0, 11),
    body == 'NULL' ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
    !!invisible ? '1' : '0', //
    '1.0.0',
    dataType,
    encoding,
  ]

  return opreturn
}

export function buildUserOpreturn({
  publicKey,
  parentTxid,
  protocolName,
  body,
}: {
  publicKey: string
  parentTxid: string
  protocolName: string
  body: any
}) {
  const opreturn: UserOpreturn = [
    'mvc',
    publicKey,
    parentTxid ? 'mvc:' + parentTxid : 'mvc:' + 'NULL',
    'metaid',
    protocolName,
    body === 'NULL' ? 'NULL' : body,
    '0',
    protocolName === 'Root' ? '1.0.1' : 'NULL',
    protocolName === 'Root' ? 'NULL' : 'text/plain',
    protocolName === 'Root' ? 'NULL' : 'UTF- 8',
  ]

  return opreturn
}
