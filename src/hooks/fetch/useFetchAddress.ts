import { Chain } from '../../types'
import useChain from '../useChain'
import { useMutation } from '@tanstack/react-query'
import useFetchConnectStatus from './useFetchConnectStatus'

const useQueryAddress = () => {
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
          return await window.metaidwallet.btc.getAddress()
        } else if (currentChain === Chain.MVC) {
          return await window.metaidwallet.getAddress()
        } else {
          throw new Error('Unsupported chain')
        }
      } catch (error) {
        console.error('Failed to query address:', error)
        throw error
      }
    },
  })
}

export default useQueryAddress
