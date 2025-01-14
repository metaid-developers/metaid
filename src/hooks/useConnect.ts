import { useMutation } from '@tanstack/react-query'
import useConnectStore from '@/stores/useConnectStore'

const useConnect = () => {
  const { isConnected, useInfo, checkConnection, connect, disconnect } = useConnectStore()

  const mutation = useMutation({
    mutationFn: connect,
    onError: (error) => {
      console.error('Failed to connect:', error)
      disconnect()
    },
  })

  return {
    useInfo,
    isConnected,
    checkConnection,
    connect: mutation.mutate,
    disconnect,
    isLoading: mutation.isPending,
    error: mutation.error,
  }
}

export default useConnect
