import { Chain } from '../../types'
import useChain from '../useChain'
import { useMutation } from '@tanstack/react-query'
import useFetchConnectStatus from './useFetchConnectStatus'

const useQueryPublicKey = () => {
  const { currentChain } = useChain()
  const { mutateAsync } = useFetchConnectStatus()

  return useMutation<string, Error, boolean>({
    mutationFn: async (checkConnection = false) => {
      if (checkConnection) {
        const isConnected = await mutateAsync()
        if (!isConnected) {
          throw new Error('Wallet not connected')
        }
      }

      try {
        if (currentChain === Chain.BTC) {
          return await window.metaidwallet.btc.getPublicKey()
        } else if (currentChain === Chain.MVC) {
          return await window.metaidwallet.getPublicKey()
        } else {
          throw new Error('Unsupported chain')
        }
      } catch (error) {
        console.error('Failed to query public key:', error)
        throw error
      }
    },
  })
}

export default useQueryPublicKey 