// import { LocalWallet } from '@/wallets/localwallet/local.js'
// import { mvcConnect } from './connect.js'
// import { mvc } from 'meta-contract'
// import { RUN_CREATE_TESTS } from '@/data/constants.js'
// import { errors } from '@/data/errors.js'

// async function connectToLocalWallet(mnemonic?: string) {
//   if (!mnemonic) {
//     mnemonic = import.meta.env.VITE_TEST_MNEMONIC
//   }
//   const wallet = await LocalWallet.create(mnemonic)

//   return await mvcConnect(wallet)
// }

// describe('factories.connect', () => {
//   test('can connect to a local wallet', async () => {
//     const connector = await connectToLocalWallet()
//     expect(connector).toBeTypeOf('object')

//     const Buzz = await connector.use('buzz')
//     expect(Buzz.name).toBe('buzz')
//   })

//   test('can connect to no wallet', async () => {
//     const connector = await mvcConnect()
//     expect(connector).toBeTypeOf('object')

//     const Buzz = await connector.use('buzz')
//     expect(Buzz.name).toBe('buzz')
//   })

//   test('is connected', async () => {
//     const connector = await connectToLocalWallet()

//     expect(connector.isConnected()).toBe(true)
//   })

//   test('the entity created by the connector has itself', async () => {
//     const connector = await connectToLocalWallet()

//     const Buzz = await connector.use('buzz')

//     expect(Buzz.connector).toBe(connector)
//   })

//   test('the global connector is the same as the connector created by the factory', async () => {
//     const connector = await connectToLocalWallet()

//     const Buzz = await connector.use('buzz')
//     const GM = await connector.use('group-message')

//     expect(connector.isConnected()).toBe(true)
//     expect(Buzz.isConnected()).toBe(true)
//     expect(GM.isConnected()).toBe(true)

//     // disconnect
//     connector.disconnect()
//     expect(connector.isConnected()).toBe(false)
//     expect(Buzz.isConnected()).toBe(false)
//     expect(GM.isConnected()).toBe(false)
//   })

//   test('has address', async () => {
//     const connector = await connectToLocalWallet()

//     expect(connector.address).toBeTypeOf('string')
//   })

//   test('has metaid', async () => {
//     const connector = await connectToLocalWallet()

//     expect(connector.metaid).toBeTypeOf('string')
//   })

//   test('can get user', async () => {
//     const connector = await connectToLocalWallet()

//     const user = connector.getUser()

//     expect(user).toBeTypeOf('object')
//     expect(user.metaid).toBeTypeOf('string')
//   })

//   test('cannot get user if it is not created yet', async () => {
//     const newMnemonic = mvc.Mnemonic.fromRandom().toString()
//     const connector = await connectToLocalWallet(newMnemonic)

//     expect(connector.hasUser()).toBe(false)
//     expect(connector.getUser()).toBe(undefined)
//   })

//   test.runIf(false)('can create user if it is not created yet', async () => {
//     const newMnemonic = mvc.Mnemonic.fromRandom().toString()
//     const connector = await connectToLocalWallet(newMnemonic)

//     expect(connector.isMetaidValid()).toBe(false)

//     await connector.createMetaid()

//     expect(connector.hasUser()).toBe(true)
//   })

//   test('cannot create user if address has not enough balance', async () => {
//     const newMnemonic = mvc.Mnemonic.fromRandom().toString()
//     const connector = await connectToLocalWallet(newMnemonic)

//     expect(connector.isMetaidValid()).toBe(false)

//     expect(() => connector.createMetaid()).rejects.toThrow(errors.NOT_ENOUGH_BALANCE_TO_CREATE_METAID)
//   })
// })
