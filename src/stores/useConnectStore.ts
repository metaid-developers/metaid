import { create } from 'zustand'
import { Chain } from '../types'
import useChain from '../hooks/useChain'
import useNetwork from '../hooks/useNetwork'
import useFetchAddress from '@/hooks/fetch/useFetchAddress'
import useFetchPublicKey from '@/hooks/fetch/useFetchPublicKey'
import useFetchConnectStatus from '@/hooks/fetch/useFetchConnectStatus'

interface ConnectState {
  useInfo: {
    metaId: string
    pubKey: string
    address: string
  }
  isConnected: boolean
  checkConnection: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => void
}

const useConnectStore = create<ConnectState>((set) => ({
  useInfo: {
    metaId: '',
    pubKey: '',
    address: '',
  },
  isConnected: false,
  checkConnection: async (chain: Chain = Chain.MVC) => {
    const { mutateAsync: queryConnectStatus } = useFetchConnectStatus()
    const { mutateAsync: queryAddress } = useFetchAddress()
    const { mutateAsync: queryPublicKey } = useFetchPublicKey()
    try {
      const isConnected = await queryConnectStatus()
      set({ isConnected })
      if (isConnected) {
        const network = await window.metaidwallet.getNetwork()
        useNetwork.getState().switchNetwork(network.network, chain)
        useChain.getState().switchChain(chain)
        const pubKey = await queryPublicKey(false)
        const address = await queryAddress(false)
        set({ useInfo: { pubKey, address, metaId: '' } })
        // const { address, metaid, pubKey } = await window.metaidwallet.connect()
        // set({ address, metaid, pubKey })
      }
    } catch (error) {
      set({ isConnected: false, useInfo: { address: '', metaId: '', pubKey: '' } })
      throw error
    }
  },
  connect: async () => {
    const { currentChain } = useChain.getState()
    const { currentNetwork } = useNetwork.getState()

    if (!currentNetwork) {
      throw new Error('Network not initialized')
    }

    try {
      const { address } = await window.metaidwallet.connect()
      set({
        isConnected: true,
        useInfo: {
          address,
          metaId: '',
          pubKey: '',
        },
      })
    } catch (error) {
      set({
        isConnected: false,
        useInfo: {
          metaId: '',
          pubKey: '',
          address: '',
        },
      })
      throw error
    }
  },
  disconnect: () => {
    set({
      isConnected: false,
      useInfo: {
        metaId: '',
        pubKey: '',
        address: '',
      },
    })
  },
}))

export default useConnectStore
