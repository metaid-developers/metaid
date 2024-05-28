// import { RUN_CREATE_TESTS } from '@/data/constants.js'
// import { errors } from '@/data/errors.js'
// import { connect } from '@/factories/connect.js'
// import { LocalWallet } from '@/wallets/localwallet/local.js'

// describe('entity.create', () => {
//   beforeEach(async (ctx) => {
//     const mnemonic = import.meta.env.VITE_TEST_MNEMONIC
//     const wallet = LocalWallet.create(mnemonic)

//     ctx.Buzz = await (await connect(wallet)).use('buzz')
//   })

//   test('cannot create a new buzz if it is not connected', async ({ Buzz }) => {
//     Buzz.disconnect()

//     expect(() =>
//       Buzz.create({
//         content: 'Hello World',
//       })
//     ).toThrow(errors.NOT_CONNECTED)
//   })

//   test.runIf(RUN_CREATE_TESTS)('can create a new buzz', async ({ Buzz }) => {
//     expect(
//       await Buzz.create({
//         content: '2 step create',
//       })
//     ).toBeTypeOf('object')
//   })

//   // relation entity test (use buzz & like)

//   test.runIf(RUN_CREATE_TESTS)('can like a buzz', async ({ Buzz }) => {
//     console.log('import.meta.env.VITE_TEST_CREATE', import.meta.env.VITE_TEST_CREATE)
//     const connector = Buzz.connector
//     const Like = await connector.use('like')

//     const buzzes = await Buzz.list()
//     const buzz = buzzes.items[2]

//     // create like
//     const like = await Like.create({
//       likeTo: buzz.txid,
//       isLike: '1',
//     })

//     expect(like).toBeTypeOf('object')
//   })

//   test.todo('cannot create a new buzz if the root is not found')
// })
