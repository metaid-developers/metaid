/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEST_METAID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

import { TestContext } from 'vitest'
import { Entity } from '@/core/entity/mvc'
import { MetaIDConnectWallet } from '@/wallets/metalet/mvcWallet.ts'
declare module 'vitest' {
  export interface TestContext {
    Buzz?: Entity
    Buzz2?: Entity
    GM?: Entity
    Metaid?: Entity
    wallet?: MetaIDConnectWallet
  }
}
