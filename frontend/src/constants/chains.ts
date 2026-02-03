export interface ChainConfig {
  chainId: number
  name: string
  shortName: string
  nativeCurrency: string
  explorerUrl: string
  lifiChainId: number // LI.FI uses chain IDs directly
}

export interface TokenConfig {
  symbol: string
  name: string
  address: string // token contract address on that chain (or 0x0 for native)
  decimals: number
}

// Supported destination chains for cross-chain withdrawals
export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chainId: 8453,
    name: 'Base',
    shortName: 'Base',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://basescan.org',
    lifiChainId: 8453,
  },
  {
    chainId: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    lifiChainId: 1,
  },
  {
    chainId: 42161,
    name: 'Arbitrum',
    shortName: 'ARB',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    lifiChainId: 42161,
  },
  {
    chainId: 10,
    name: 'Optimism',
    shortName: 'OP',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io',
    lifiChainId: 10,
  },
  {
    chainId: 137,
    name: 'Polygon',
    shortName: 'POL',
    nativeCurrency: 'POL',
    explorerUrl: 'https://polygonscan.com',
    lifiChainId: 137,
  },
]

// Common tokens available on most chains
export const COMMON_TOKENS: Record<number, TokenConfig[]> = {
  // Base
  8453: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDT', name: 'Tether', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 },
  ],
  // Ethereum
  1: [
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  ],
  // Arbitrum
  42161: [
    { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDT', name: 'Tether', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
  ],
  // Optimism
  10: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDT', name: 'Tether', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
  ],
  // Polygon
  137: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
    { symbol: 'POL', name: 'Polygon', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
    { symbol: 'USDT', name: 'Tether', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
  ],
}

// Base USDC is the source token (what gets withdrawn from the vault)
export const BASE_CHAIN_ID = 8453
export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
