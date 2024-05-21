export type Operation = 'init' | 'create' | 'modify' | 'revoke'
export type Encryption = '0' | '1' | '2'
type MetaidDataOutput = [
  'metaid', // chain flag
  Operation, // operation type
  string, // path to operate, exp: /root/protocols/SimpleBuzz
  Encryption, // content的加密类型，0为不加密；1为ECIES加密，2为ECDH协商密钥加密
  string, // version
  string, // optional，content-type，default: application/jason
  string, // optional, encoding, default: utf8
  string, // payload : stringify json body
]

export function buildDataOutput({
  operation,
  path,
  encryption,
  body,
  dataType = 'application/json',
  encoding = 'UTF-8',
}: {
  operation: Operation
  path: string
  encryption: '0' | '1' | '2'
  body: unknown
  dataType?: string
  encoding?: string
}) {
  const dataOutput: MetaidDataOutput = [
    'metaid', // chain flag
    operation, // operation type
    path, // path to operate, exp:  /protocols/SimpleBuzz
    encryption, // content的加密类型，0为不加密；1为ECIES加密，2为ECDH协商密钥加密
    '1.0.0', // version
    dataType, // optional，content-type，default: application/jason
    encoding, // optional, encoding, default: utf8
    JSON.stringify(body), // payload : stringify json body]
  ]
  return dataOutput
}
