export const vaultAbi = [
  {
    name: 'depositWithAuthorization',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_commitment', type: 'bytes32' },
      { name: '_receiveAuthorization', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_proof', type: 'bytes' },
      { name: '_root', type: 'bytes32' },
      { name: '_nullifierHash', type: 'bytes32' },
      { name: '_recipient', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'DENOMINATION',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'DepositWithAuthorization',
    type: 'event',
    inputs: [
      { name: 'commitment', type: 'bytes32', indexed: true },
      { name: 'leafIndex', type: 'uint32', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdrawal',
    type: 'event',
    inputs: [
      { name: 'to', type: 'address', indexed: false },
      { name: 'nullifierHash', type: 'bytes32', indexed: false },
    ],
  },
] as const

export const RECEIVE_WITH_AUTHORIZATION_TYPES = {
  ReceiveWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const

export const USDC_DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: 84532,
  verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
} as const
