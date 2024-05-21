export const errors = {
  NOT_CONNECTED: 'You need to connect to a wallet first.',
  NOT_SUPPORTED: 'This feature is not supported yet.',
  NOT_IN_BROWSER: 'This feature is only available in browser.',
  CANNOT_DERIVE_PATH: 'Cannot derive the path from the given address.',
  NO_OUTPUT: 'No output provided.',
  NO_ROOT_DETECTED: 'Cannot detect root address.',
  FAILED_TO_CREATE_ROOT: 'Failed to create root.',
  METAID_NOT_FOUND: 'MetaID not found.',
  NOT_ENOUGH_BALANCE: 'Not enough balance.',
  NOT_ENOUGH_BALANCE_TO_CREATE_METAID:
    'Not enough balance to create metaid. Please send some Space to this address first.',
} as const
