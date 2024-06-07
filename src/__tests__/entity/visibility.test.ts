// import { errors } from '@/data/errors.js'
// import { connect } from '@/factories/connect.js'
// import { LocalWallet } from '@/wallets/localwallet/local.js'

// describe('entity.visibility', () => {
//   beforeEach(async (ctx) => {
//     console.log('memonic')
//     const mnemonic1 = import.meta.env.VITE_TEST_MNEMONIC
//     const wallet1 = LocalWallet.create(mnemonic1)
//     ctx.Buzz = await (await connect(wallet1)).use('buzz')

//     const mnemonic2 = import.meta.env.VITE_TEST_MNEMONIC2
//     const wallet2 = LocalWallet.create(mnemonic2)
//     ctx.Buzz2 = await (await connect(wallet2)).use('buzz')
//   })

//   test('create a encrypt buzzzz', async ({ Buzz, Buzz2 }) => {
//     expect(
//       await Buzz.create({
//         content: '2 step create',
//       })
//     ).toBeTypeOf('object')
//     // await Buzz.create({
//     //   content: 'secret',
//     //   options: {
//     //     invisible: true,
//     //   },
//     // })

//     // const { items: buzzes1 } = await Buzz.list(1)
//     // expect(buzzes1.map((d) => d.body.content)).toContain('secret')
//     // console.log(buzzes1.map((d) => d.body.content))
//     // const { items: buzzes2 } = await Buzz2.list(1)
//     // expect(buzzes2.map((d) => d.body.content)).not.toContain('secret')
//   })
// })
