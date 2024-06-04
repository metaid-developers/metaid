// import { errors } from '@/data/errors.js'
// import { connect } from '@/factories/connect.js'
// import { LocalWallet } from '@/wallets/localwallet/local.js'
// import { mvc } from 'meta-contract'

// async function connectToLocalWallet(mnemonic?: string) {
//   if (!mnemonic) {
//     mnemonic = import.meta.env.VITE_TEST_MNEMONIC
//   }
//   const wallet = LocalWallet.create(mnemonic)

//   return connect(wallet)
// }

// describe('entity.createRoot', () => {
//   test('can create root of the entity', async () => {
//     const newMnemonic = 'cigar fringe that else used arch side extra warrior trial royal modify'
//     const connector = await connectToLocalWallet(newMnemonic)

//     const File = await connector.use('file')

//     expect(connector.isMetaidValid()).toBe(true)

//     const root = await File.getRoot()
//     console.log({ root })
//   })
// })
