# MetaID SDK

## What is this?

The MetaID SDK provides a set of standard specifications and method tools for generating and processing underlying blockchain data that follows the MetaID protocol (specifically referring to chains that comply with the UTXO standard, currently supporting the BTC chain).

## Core Concepts

The MetaID SDK has two core concepts: **connector** and **entity**.<br/>
Connectors are used for the authentication and management of identity information, serving as the foundation for users to publish data on the blockchain.<br/>
"Entity" is a term used in the application layer. It is used to manage resources of a specific data type. From a programming perspective, when you create a new entity instance, you can access its properties and use a series of executable methods provided for data storage and modification on the chain. You can understand each type of Entity as corresponding to the PATH part in the MetaID Specification.

## Installation

Currently, we only recommend installing the SDK using yarn.

`yarn add @metaid/metaid`

## Quick Example(Send a buzz)

> Warning:The API examples listed below are still under development. Use with caution.

### Step 1 - Connect to wallet

```typescript
import { btcConnect } from '@metaid/metaid'
const _wallet = await MetaletWalletForBtc.create()
const _network = (await window.metaidwallet.getNetwork()).network
const _btcConnector = await btcConnect({
  network,
  wallet: _wallet,
})
```

> Note: you can connect an empty object. At this point, you can only use entity to retrieve data from blockchain but cannot store data.

### Step 2 - Use entity to interact with blockchain

```typescript
// create a buzz enity with connector's use method
const buzzEntity = await _btcConnector.use('buzz')
```

### Step 3 - Use entity's create method to inscribe buzz data

```typescript
// create
const finalBody = { content: 'Hello World' }
const createRes: createRes = await buzzEntity.create({
      data: [{ body: JSON.stringify(finalBody) }],
      options: { noBroadcast: 'no', feeRate: selectFeeRate?.number },
    })

// type of CreateRes
type CreateRes: {
    commitTxId: string;
    revealTxIds: string[];
    commitCost: string;
    revealCost: string;
    status?: string | undefined;
}
```

## Some more complex use cases

### Example A(1) - Create a buzz with attachments(BTC VERSION)

#### Step 1 - define a new file entity schema(BTC VERSION)

```ts
const fileSchema = {
  name: 'file',
  nodeName: 'metafile',
  encoding: 'binary',
  versions: [
    {
      version: '1.0.1',
      body: '',
    },
  ],
}
```

#### Step 2 - We can generate PINID based on this schema. It is worth noting that you need to transform binary image data to hex format with Buffer.from method(BTC VERSION)

```ts
type FileData = {
  body?: string | Buffer | undefined
  contentType?: string | undefined
  encryption?: '0' | '1' | '2' | undefined
  version?: string | undefined
  encoding?: BufferEncoding | undefined
}
const finalBody = { content: 'Hello World' }
if (!isEmpty(buzz.images)) {
  const fileOptions: FileData[] = []

  const fileEntity = await btcConnector!.use('file')

  for (const image of buzz.images) {
    fileOptions.push({
      body: Buffer.from(image.data, 'hex').toString('base64'),
      contentType: 'image/jpeg;binary',
      encoding: 'base64',
    })
  }
  const imageRes = await fileEntity.create({
    dataArray: fileOptions,
    options: { noBroadcast: 'no', feeRate: selectFeeRate?.number },
  })

  console.log('imageRes', imageRes)
  finalBody.attachments = imageRes.revealTxIds.map((rid) => 'metafile://' + rid + 'i0')
}
await sleep(5000)

console.log('finalBody', finalBody)
```

#### Step 3 - We can create a buzz with three image attachments(BTC VERSION)

```ts
const createRes = await buzzEntity.create({
  dataArray: [{ body: JSON.stringify(finalBody) }],
  options: { noBroadcast: 'no', feeRate: selectFeeRate?.number },
})
```

### Example A(2) - Create a buzz with attachments(MVC VERSION)

#### Step 1 - import methods and define mvcConnector、buzzEntity、fileEntity

```ts
import {
  MvcTransaction
  MetaletWalletForMvc,
  mvcConnect,
} from '@metaid/metaid'

const _wallet = await MetaletWalletForMvc.create()
const mvcConnector = await mvcConnect({ wallet: _wallet, network: 'testnet' })
const buzzEntity = mvcConnector.use('buzz')
const fileEntity = mvcConnector.use('file')
```

#### Step 2 - create file transction(MVC VERSION)

```ts
let body = { content }
let fileTransactions: MvcTransaction[] = []
if (!isNil(attachments) && !isEmpty(attachments)) {
  const attachMetafileUri = []
  // console.log("file", "start");
  for (const image of attachments) {
    const { transactions: txs } = await fileEntity.create({
      data: {
        body: Buffer.from(image.data, 'base64') // Please note that this is different from the BTC version
        contentType: `${image.fileType};binary`,
        encoding: 'base64',
        flag: 'metaid',
      },
      options: {
        network: 'testnet',
        signMessage: 'upload image file',
        serialAction: 'combo',
        transactions: fileTransactions,
      },
    })
    attachMetafileUri.push('metafile://' + txs[txs.length - 1].txComposer.getTxId() + 'i0')
    fileTransactions = txs
    console.log('fileTransactions: ', fileTransactions)
  }
  body.attachments = attachMetafileUri
}
```

#### Step 3 - We can create a buzz with three image attachments(MVC VERSION)

```ts
const { txid } = await buzzEntity.create({
  data: { body: JSON.stringify(body), contentType: 'application/json;utf-8', flag: 'metaid' },
  options: {
    signMessage: 'create buzz',
    serialAction: 'finish',
    transactions: fileTransactions,
    network: 'testnet',
  },
})
```

### Example B -Give a like to a buzz(BTC version)

#### Step 1 - We need a new Like entity, base on its metaprocol definition, we have the following like entity schema definition

```ts
const likeSchema = {
  name: 'like',
  nodeName: 'PayLike',
  versions: [
    {
      version: 1,
      body: [
        {
          name: 'likeTo',
          type: 'string',
        },
        {
          name: 'isLike',
          type: 'string',
        },
      ],
    },
  ],
}
```

#### Step2 - Based on a logged-in MetaID account, you can like any buzz by calling this likeHandler.create method.The corresponding code is quite simple

```js
const likeEntity = await btcConnector.use('like')

const likeRes = await likeEntity.create({
  dataArray: [
    {
      body: JSON.stringify({ isLike: '1', likeTo: pinId }),
    },
  ],
  options: {
    noBroadcast: 'no',
    feeRate: Number(globalFeeRate),
  },
})
```

### Example C - Load User-defined Schema(mvc version for example)

#### Step 1 - You need to create a new file named **follow.entity.ts**, and place the following code in this file

```ts
import { EntitySchema } from '@metaid/metaid'
const followSchema: EntitySchema = {
  name: 'follow',
  nodeName: 'follow',
  path: '/follow',
  versions: [
    {
      version: 1,
      body: [
        {
          name: 'followTo',
          type: 'string',
        },
      ],
    },
  ],
}
```

#### Step2 - Based on a logged-in MvcConnector, you can follow any metaid-user by calling this followEntity.create method.The corresponding code is quite simple

```js
import { loadMvc } from '@metaid/metaid' // loadBtc form btc chain
import followSchema from '@/metaid-entities/follow.entity.js' // assume @/metaid-entities/follow.entity.js is the location where your place follow.entity.ts file, you need to impport .js type

const followEntity = await loadMvc(followSchema,  { connector: MvcConnector}) // You can pass MvcConnector as optional parameter

const followrRes = await followEntity.create({
  data:
    {
      body: "follow-to-metaid",
      contentType: 'text/plain;utf-8',
    },
  options:
    {
      network: 'testnet'
      signMessage: 'follow user'
    }
})
```

# API Rference

## Wallet

Can have multiple wallet implementations as long as it implements the `Wallet` interface.<br>

First, we need to build a wallet object based on the current logged-in wallet account.Then we can access the public properties of the wallet object and a series of methods provided by the wallet object (assuming the wallet is connected, otherwise return `{status: 'not-connected'}`)

### Create a new wallet object

```ts
import { MetaletWalletForBtc } from '@metaid/metaid'
// use static method `create` to create a wallet instance
const _wallet = await MetaletWalletForBtc.create()
```

### get address(public property)

```ts
const address = _wallet.address
```

### get public key(public property)

```ts
const pubicKey = _wallet.pub
```

### get wallet balance(method)

```ts
await _wallet.getBalance()
```

> **params**: none<br> **return**: {total: number, confirmed: number, unconfirmed: number}

### send sign message(method)

```ts
await _wallet.signMessage(message)
```

### Sign the input psbtHex(method)

```ts
await _wallet.signPsbt({
  psbtHex,
  options,
}: {
  psbtHex: string
  options?: { toSignInputs?: ToSignInput[]; autoFinalized: boolean }
})

```

### inscribe(method)

```ts
export type Operation =  'create' | 'modify' | 'revoke'
export type Encryption = '0' | '1' | '2'
export type MetaidData = {
  operation: Operation
  body?: string | Buffer
  path?: string
  contentType?: string
  encryption?: '0' | '1' | '2'
  version?: string
  encoding?: BufferEncoding
  revealAddr: string
}

export type InscriptionRequest = {
    feeRate: number;
    metaidDataList: MetaidData[];
    revealOutValue: number;
    changeAddress: string;
    minChangeValue?: number;
}
await _wallet.insrcibe({data, options} : \
  { data: InscriptionRequest, options: {noBroadcast : boolean })
```

##### Description of return type

The insrcibe method returns different transaction data formats based on whether the parameters are broadcast or not, specifically:

When noBrobroadcast is set to no, the return format is

```typescript
{
   commitTxHex: string;
   revealTxsHex: string[];
   commitCost: string;
   revealCost: string;
  }
```

When noBrobroadcast is set to yes, i.e. not broadcasting transactions, the return format is:

```typescript
{
  commitTxId: string;
  revealTxIds: string[];
  commitCost: string;
  revealCost: string;
 }

```

In case of non-broadcast transactions, the transaction result is returned in the form of txHex; otherwise, the transaction result is returned in the form of txid. The sum of commitCost and revealCost is the estimated fee required for the current transaction to be engraved.

> **Warining**: This is the underlying engraving API method. It is not recommended to call it directly unless you have very customized engraving requirements.

## Connector

A connector is the bridge between your wallet and the entity.

### Create a new connector based on the wallet object

```typescript
type BtcNetwork = "testnet" | "regtest" | "livenet"
import { IMetaletWalletForBtc, IBtcConnector, btcConnect } from "@metaid/metaid";
const _btcConnector:IMetaletWalletForBtc = await btcConnect({ wallet, network }: { wallet?: IMetaletWalletForBtc; network: BtcNetwork });
```

### get MetaID(public property)

```ts
const metaid = _btcConnector.metaid
```

### get UserInfo(public property)

```ts
export type UserInfo = {
  number: number
  rootTxId: string
  name: string
  nameId: string
  address: string
  avatar: string | null
  avatarId: string
  bio: string
  bioId: string
  soulbondToken: string
  unconfirmed: string
  isInit: boolean
  metaid: string
}
const user: UserInfo = _btcConnecto.user
```

### connector inscrble method

```typescript
type Operation = 'create' | 'modify' | 'revoke'
type InscribeData = {
    operation: Operation;
    body?: string | Buffer;
    path?: string;
    contentType?: string;
    encryption?: "0" | "1" | "2";
    version?: string;
    encoding?: BufferEncoding;
    flag?: "metaid" ;
}
await _btcConnector.inscribe({
    inscribeDataArray,
    options,
  }: {
    inscribeDataArray: InscribeData[]
    options: {
      noBroadcast: T
      feeRate?: number
      service?: {
        address: string
        satoshis: string
      }
    }
  })
```

> The return type of this method is the same as the return type of the wallet's inscribe method.

### Create userinfo, the parameter avatar is a native File type in JavaScript, which is processed in chunks as a Buffer and then converted to a base64 string

```typescript
export interface InscribeResultForYesBroadcast {
  commitTxId: string
  revealTxIds: string[]
  commitCost: string
  revealCost: string
  status?: string
}
 createUserInfo({
    userData,
    options,
  }: {
    userData: {
      name: string
      bio?: string
      avatar?: string
    }
    options: {
      network?: BtcNetwork
      feeRate?: number
      service?: {
        address: string
        satoshis: string
      }
    }
  }): Promise<{
    nameRes: InscribeResultForYesBroadcast
    bioRes:  InscribeResultForYesBroadcast | undefined
    avatarRes: InscribeResultForYesBroadcast | undefined
  }>

```

### Obtain user information associated with MetaID

```typescript
const user = await _btcConnector.getUser({ network, currentAddress }: { network: BtcNetwork; currentAddress?: string })
```

### Update MetaID associated user information

```typescript
export interface InscribeResultForYesBroadcast {
  commitTxId: string
  revealTxIds: string[]
  commitCost: string
  revealCost: string
  status?: string
}
updateUserInfo({
    userData,
    options,
  }: {
    userData?: {
      name?: string
      bio?: string
      avatar?: string
    }
    options?: {
      network?: BtcNetwork
      feeRate?: number
      service?: {
        address: string
        satoshis: string
      }
    }
  }): Promise<{
    nameRes: InscribeResultForYesBroadcast | undefined
    bioRes: InscribeResultForYesBroadcast | undefined
    avatarRes: InscribeResultForYesBroadcast | undefined
  }>
```

### Check the current connector status (whether the wallet is connected)

```typescript
const isConnected = await _btcConnector.isConnectoed()
```

### Disconnect current wallet connection

```typescript
await _btcConnector.disconnect()
```

### Create an Entity object, which serves as a bridge between the Connector layer and the Entity layer

```typescript
// example:create buzz Enitity
await _btcConnector.use(entitySymbol: string)
```

> Return the entity object, as detailed below.

## Entity

An entity is a controller class to operate on a specific resource.Once a class entity is created through a connector, you can access a series of properties and methods provided by that class entity.

> Currently, the MetaID SDK provides common basic entity calls based on the on-chain Weibo example application, including buzzEntity, fileEntity, likeEntity. If developers have their own customization requirements, they can create their own data protocol on the MetaProtocols official website, and the MetaID SDK will automatically create relevant entities for that protocol.

**In the following, we take creating buzzEntity as an example**

### Create buzzEntity entity through connector

```typescript
const buzzEntity = await _btcConnector.use('buzz')
```

### Get all buzz sent by the current connector connected account in paginated form

```typescript
const allBuzz = await buzzEntity.list({ page, limit, network }: { page: number; limit: number; network?: BtcNetwork })
```

### Get the details data of a Pin based on pinId

```typescript
const pid = 'XXXXXXXXX'
const pinDetail = await buzzEntity.one({ pid, network }: { pid: string; network: BtcNetwork })
```

### Count the total number of Pins already posted under the current entity (buzzEntity)

```typescript
const pinTotal = await buzzEntity.total({ network }: { network?: BtcNetwork })
```

### Create a buzz

```typescript

create<T extends keyof InscribeResultForIfBroadcasting>({ data, options, }: {
    dataArray: SubMetaidData[];
    options: {
        noBroadcast: T;
        feeRate?: number;
        service?: {
            address: string;
            satoshis: string;
        };
    };
}): Promise<InscribeResultForIfBroadcasting[T]>

type SubMetaidData = {
    body?: string | Buffer;
    contentType?: string;
    encryption?: "0" | "1" | "2";
    version?: string;
    encoding?: BufferEncoding;
    flag?: "metaid"  ;
}

 const createRes = await buzzEntity.create({
    dataArray,
    options,
  }: {
    dataArray: SubMetaidData[]
    options: {
        noBroadcast: T;
        feeRate?: number;
        service?: {
            address: string;
            satoshis: string;
        };
    };
  })
```

> The return type of this method is the same as the return type of the wallet's inscribe method

### Resource

A resource is a data object that represents a specific entity.

`entity.list()` returns an array of resources.

`entity.one()` returns a single resource.

```typescript
type Resource = {
  txid: string
  createdAt: timestamp
  body: Record<string, any>
  // We wrap the resource's owner info in a `user` object.
  user: {
    metaid: string
    name: string
    avatar: string
  }
}
```
