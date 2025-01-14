import { create } from 'zustand'
import { Chain, NetworkType } from '../types'

// Unified network type definition

// Network name mappings for different chains
const chainNetworkNames: Record<Chain, Partial<Record<NetworkType, string>>> = {
  [Chain.MVC]: {
    mainnet: 'mainnet',
    testnet: 'testnet',
  },
  [Chain.BTC]: {
    mainnet: 'livenet',
    testnet: 'testnet',
    regtest: 'regtest',
  },
}

// Extract all possible network name types
type NetworkValues<T> = T[keyof T]
type ChainNetworks = NetworkValues<{
  [C in Chain]: NetworkValues<(typeof chainNetworkNames)[C]>
}>
type Network = ChainNetworks | undefined

interface NetworkState {
  currentNetworkType: NetworkType
  currentNetwork: Network
  switchNetwork: (networkType: NetworkType, chain: Chain) => void
  init: (initialNetwork?: NetworkType) => void
}

// Get supported network types for the specified chain
const getSupportedNetworks = (chain: Chain): NetworkType[] => {
  const networks = chainNetworkNames[chain]
  return Object.keys(networks) as NetworkType[]
}

// Check if the network type is supported by the chain
const isNetworkSupported = (chain: Chain, networkType: NetworkType): boolean => {
  return getSupportedNetworks(chain).includes(networkType)
}

// Get network name for the specific chain
const getChainNetworkName = (chain: Chain, networkType: NetworkType): NonNullable<Network> => {
  const name = chainNetworkNames[chain][networkType]
  if (!name) {
    throw new Error(`Network type ${networkType} is not supported by chain ${chain}`)
  }
  return name
}

const useNetwork = create<NetworkState>((set, get) => ({
  currentNetworkType: 'mainnet',
  currentNetwork: undefined,
  switchNetwork: (networkType: NetworkType, chain: Chain) => {
    if (!isNetworkSupported(chain, networkType)) {
      const supported = getSupportedNetworks(chain)
        .map((type) => getChainNetworkName(chain, type))
        .join(', ')
      throw new Error(
        `Network type ${networkType} is not supported by chain ${chain}. Available networks: ${supported}`
      )
    }

    const displayNetwork = getChainNetworkName(chain, networkType)
    set({
      currentNetworkType: networkType,
      currentNetwork: displayNetwork,
    })
  },
  init: (initialNetwork: NetworkType = 'mainnet') => {
    const displayNetwork = getChainNetworkName(Chain.MVC, initialNetwork)
    set({
      currentNetworkType: initialNetwork,
      currentNetwork: displayNetwork,
    })
  },
}))

export default useNetwork
