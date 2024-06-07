// import { errors } from '@/data/errors.js'
// import { connect } from '@/factories/connect.js'
// import { LocalWallet } from '@/wallets/localwallet/local.js'

// describe('entity.list', () => {
//   beforeEach(async (ctx) => {
//     const mnemonic = import.meta.env.VITE_TEST_MNEMONIC
//     const wallet = LocalWallet.create(mnemonic)

//     ctx.Buzz = await (await connect(wallet)).use('buzz')
//   })

//   test('can list buzzes', async ({ Buzz }) => {
//     const { items: buzzes } = await Buzz.list(1)

//     expect(buzzes).toBeTypeOf('object')
//     expect(buzzes[0]).toBeTypeOf('object')
//   })

//   test('can list buzzes even if it is not connected', async ({ Buzz }) => {
//     Buzz.disconnect()
//     const { items: buzzes } = await Buzz.list(1)

//     expect(buzzes).toBeTypeOf('object')
//     expect(buzzes[0]).toBeTypeOf('object')
//   })
//   test('can paginate', async ({ Buzz }) => {
//     const { limit } = await Buzz.list(1)

//     expect(limit).toBeTypeOf('number')
//   })
//   test('do not support entity other than buzz right now', async () => {
//     const mnemonic = import.meta.env.VITE_TEST_MNEMONIC
//     const wallet = LocalWallet.create(mnemonic)

//     const GM = await (await connect(wallet)).use('group-message')
//     await expect(() => GM.list(1)).rejects.toThrow(errors.NOT_SUPPORTED)
//   })
// })
