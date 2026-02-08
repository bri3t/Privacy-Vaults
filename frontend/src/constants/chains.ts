export interface ChainConfig {
  chainId: number
  name: string
  shortName: string
  nativeCurrency: string
  explorerUrl: string
  lifiChainId: number
  logoUrl: string
}

export interface TokenConfig {
  symbol: string
  name: string
  address: string
  decimals: number
  logoUrl: string
}

const LOGO = {
  USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  DAI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
  WBTC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
  ETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  POL: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
  AVAX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
  BNB: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png',
} as const

// Supported destination chains for cross-chain withdrawals
export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chainId: 8453,
    name: 'Base',
    shortName: 'Base',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://basescan.org',
    lifiChainId: 8453,
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
  },
  {
    chainId: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    lifiChainId: 1,
    logoUrl: LOGO.ETH,
  },
  {
    chainId: 42161,
    name: 'Arbitrum',
    shortName: 'ARB',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    lifiChainId: 42161,
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
  },
  {
    chainId: 10,
    name: 'Optimism',
    shortName: 'OP',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io',
    lifiChainId: 10,
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
  },
  {
    chainId: 137,
    name: 'Polygon',
    shortName: 'POL',
    nativeCurrency: 'POL',
    explorerUrl: 'https://polygonscan.com',
    lifiChainId: 137,
    logoUrl: LOGO.POL,
  },
  {
    chainId: 43114,
    name: 'Avalanche',
    shortName: 'AVAX',
    nativeCurrency: 'AVAX',
    explorerUrl: 'https://snowtrace.io',
    lifiChainId: 43114,
    logoUrl: LOGO.AVAX,
  },
  {
    chainId: 56,
    name: 'BNB Chain',
    shortName: 'BNB',
    nativeCurrency: 'BNB',
    explorerUrl: 'https://bscscan.com',
    lifiChainId: 56,
    logoUrl: LOGO.BNB,
  },
  {
    chainId: 534352,
    name: 'Scroll',
    shortName: 'Scroll',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://scrollscan.com',
    lifiChainId: 534352,
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/scroll/info/logo.png',
  },
  {
    chainId: 59144,
    name: 'Linea',
    shortName: 'Linea',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://lineascan.build',
    lifiChainId: 59144,
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/linea/info/logo.png',
  },
  {
    chainId: 324,
    name: 'zkSync Era',
    shortName: 'zkSync',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://explorer.zksync.io',
    lifiChainId: 324,
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zksync/info/logo.png',
  },
]

// Common tokens available on most chains
export const COMMON_TOKENS: Record<number, TokenConfig[]> = {
  // Base
  8453: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, logoUrl: LOGO.USDC },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.ETH },
    { symbol: 'USDT', name: 'Tether', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6, logoUrl: LOGO.USDT },
    { symbol: 'DAI', name: 'Dai', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, logoUrl: LOGO.DAI },
  ],
  // Ethereum
  1: [
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, logoUrl: LOGO.USDC },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.ETH },
    { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, logoUrl: LOGO.USDT },
    { symbol: 'DAI', name: 'Dai', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, logoUrl: LOGO.DAI },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, logoUrl: LOGO.WBTC },
  ],
  // Arbitrum
  42161: [
    { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, logoUrl: LOGO.USDC },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.ETH },
    { symbol: 'USDT', name: 'Tether', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, logoUrl: LOGO.USDT },
    { symbol: 'DAI', name: 'Dai', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, logoUrl: LOGO.DAI },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, logoUrl: LOGO.WBTC },
  ],
  // Optimism
  10: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, logoUrl: LOGO.USDC },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.ETH },
    { symbol: 'USDT', name: 'Tether', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6, logoUrl: LOGO.USDT },
    { symbol: 'DAI', name: 'Dai', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, logoUrl: LOGO.DAI },
  ],
  // Polygon
  137: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, logoUrl: LOGO.USDC },
    { symbol: 'POL', name: 'Polygon', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.POL },
    { symbol: 'USDT', name: 'Tether', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, logoUrl: LOGO.USDT },
    { symbol: 'DAI', name: 'Dai', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18, logoUrl: LOGO.DAI },
  ],
  // Avalanche
  43114: [
    { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6, logoUrl: LOGO.USDC },
    { symbol: 'AVAX', name: 'Avalanche', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.AVAX },
    { symbol: 'USDT', name: 'Tether', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6, logoUrl: LOGO.USDT },
    { symbol: 'DAI.e', name: 'Dai', address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', decimals: 18, logoUrl: LOGO.DAI },
  ],
  // BNB Chain
  56: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, logoUrl: LOGO.USDC },
    { symbol: 'BNB', name: 'BNB', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.BNB },
    { symbol: 'USDT', name: 'Tether', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, logoUrl: LOGO.USDT },
    { symbol: 'DAI', name: 'Dai', address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', decimals: 18, logoUrl: LOGO.DAI },
  ],
  // Scroll
  534352: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4', decimals: 6, logoUrl: LOGO.USDC },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.ETH },
    { symbol: 'USDT', name: 'Tether', address: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df', decimals: 6, logoUrl: LOGO.USDT },
  ],
  // Linea
  59144: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', decimals: 6, logoUrl: LOGO.USDC },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.ETH },
    { symbol: 'USDT', name: 'Tether', address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93', decimals: 6, logoUrl: LOGO.USDT },
    { symbol: 'DAI', name: 'Dai', address: '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5', decimals: 18, logoUrl: LOGO.DAI },
  ],
  // zkSync Era
  324: [
    { symbol: 'USDC', name: 'USD Coin', address: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4', decimals: 6, logoUrl: LOGO.USDC },
    { symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18, logoUrl: LOGO.ETH },
    { symbol: 'USDT', name: 'Tether', address: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C', decimals: 6, logoUrl: LOGO.USDT },
  ],
}

// Base USDC is the source token (what gets withdrawn from the vault)
export const BASE_CHAIN_ID = 8453
export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
