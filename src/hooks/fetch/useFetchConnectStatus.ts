import { useMutation } from '@tanstack/react-query'

const useCheck = () => {
  return useMutation({
    mutationFn: () => window.metaidwallet.isConnected(),
  })
}

export default useCheck
