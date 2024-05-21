import { errors } from '@/data/errors.js'
import { connect } from '@/factories/connect.js'
import { LocalWallet } from '@/wallets/localwallet/local.js'

describe('entity.getRoot', () => {
  beforeEach(async (ctx) => {
    const mnemonic = import.meta.env.VITE_TEST_MNEMONIC
    console.log('mnemonic', mnemonic)
    const wallet = LocalWallet.create(mnemonic)
    console.log('wallet', wallet)
    //metaID-Root
    ctx.Buzz = await (await connect(wallet)).use('buzz')
  })

  test('can get root of the entity', async ({ Buzz }) => {
    //Metaid
    //await Metaid.disconnect();
    // const root = await Buzz.getRoot();
    // console.log("root", root);
    // expect(root).toBeTypeOf("object");
  })

  // test("can not get entity root if it is not logined", ({ Buzz }) => {
  //   Buzz.disconnect();
  //   expect(() => Buzz.getRoot()).toThrow(errors.NOT_CONNECTED);
  // });
})
