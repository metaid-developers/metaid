import { errors } from '@/data/errors.js'
import { MetaletWallet } from './mvc.js'

describe('wallets.metalet', () => {
  test('cannot create metalet wallet when not in browser', async () => {
    expect(() => MetaletWallet.create()).rejects.toThrow(errors.NOT_IN_BROWSER)
  })
})
