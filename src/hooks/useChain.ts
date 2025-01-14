import { create } from 'zustand'
import { Chain } from '../types'
import useNetwork from './useNetwork'

interface ChainState {
  currentChain: Chain
  switchChain: (chain: Chain) => void
  init: (initialChain?: Chain) => void
}

const useChain = create<ChainState>((set) => ({
  currentChain: Chain.MVC,
  switchChain: (chain: Chain) => {
    try {
      const { currentNetworkType, switchNetwork } = useNetwork.getState()
      switchNetwork(currentNetworkType, chain)
      set({ currentChain: chain })
    } catch (error) {
      throw new Error(`Failed to switch chain: ${error.message}`)
    }
  },
  init: (initialChain = Chain.MVC) => set({ currentChain: initialChain }),
}))

export default useChain
