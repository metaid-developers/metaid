import { LocalWallet } from './local.js'

describe('wallets.local', () => {
  beforeEach(async (ctx) => {
    const mnemonic = import.meta.env.VITE_TEST_MNEMONIC
    ctx.wallet = LocalWallet.create(mnemonic)
  })
  test('has test mnemonic in env', async () => {
    expect(import.meta.env.VITE_TEST_MNEMONIC).toBeDefined()
  })

  test('has test derive path in env', async () => {
    expect(import.meta.env.VITE_TEST_DERIVE_PATH).toBeDefined()
  })

  test('can create a new wallet', async () => {
    const mnemonic = import.meta.env.VITE_TEST_MNEMONIC

    // mne => rootAddress => metaid
    const wallet = LocalWallet.create(mnemonic)

    expect(wallet).toBeInstanceOf(LocalWallet)
  })

  test('can get address', async ({ wallet }) => {
    expect(wallet.address).toBeTypeOf('string')
    expect(wallet.getAddress()).toBe(wallet.address)
  })

  test('can derive hd address', async ({ wallet }) => {
    expect(wallet.getAddress('/0/2')).toBeTypeOf('string')
  })

  test('can get public key', async ({ wallet }) => {
    expect(wallet.getPublicKey()).toBeTypeOf('string')
    expect(wallet.getPublicKey('/0/2')).toBeTypeOf('string')
    expect(wallet.getPublicKey('/0/2')).not.toBe(wallet.getPublicKey())
  })
})
