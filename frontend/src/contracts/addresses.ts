import type { Address } from 'viem'
import type { NetworkMode } from '../contexts/NetworkModeContext.tsx'

export interface VaultConfig {
  address: Address
  denomination: bigint
  label: string
  displayAmount: number
  enabled: boolean
}

export interface YieldPoolIds {
  aave: string
  morpho: string
}

export interface NetworkConfig {
  chainId: number
  usdcAddress: Address
  deployBlock: bigint
  vaults: VaultConfig[]
  explorerBaseUrl: string
  yieldPools?: YieldPoolIds
  usdcDomain: {
    name: string
    version: string
    chainId: number
    verifyingContract: Address
  }
}

// ── Testnet (Base Sepolia) ──────────────────────────────────────────
const TESTNET_VAULTS: VaultConfig[] = [
  {
    address: '0xf90D2f820a327d4F3cc2DE36dBBfd98C124720a9',
    denomination: 1_000_000n,
    label: '1 USDC',
    displayAmount: 1,
    enabled: true,
  },
  {
    address: '0x376dFe15CE2e1e276a35e55F02Dd101Fe1a66e73',
    denomination: 10_000_000n,
    label: '10 USDC',
    displayAmount: 10,
    enabled: true,
  },
  {
    address: '0x6185aAEaf0c65Fb050DBfb07666D447195d8681b',
    denomination: 20_000_000n,
    label: '20 USDC',
    displayAmount: 20,
    enabled: true,
  },
  {
    address: '0x3CAffD2107d323Ed78f3BeA9337088FBDE6eB00C',
    denomination: 50_000_000n,
    label: '50 USDC',
    displayAmount: 50,
    enabled: true,
  },
]

const TESTNET_CONFIG: NetworkConfig = {
  chainId: 84532,
  usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  deployBlock: 37317095n,
  vaults: TESTNET_VAULTS,
  explorerBaseUrl: 'https://sepolia.basescan.org',
  usdcDomain: {
    name: 'USDC',
    version: '2',
    chainId: 84532,
    verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
}

// ── Mainnet (Base) ──────────────────────────────────────────────────

const MAINNET_VAULTS: VaultConfig[] = [
  {
    address: '0x0000000000000000000000000000000000000001',
    denomination: 1_000_000n,
    label: '1 USDC',
    displayAmount: 1,
    enabled: false,
  },
  {
    address: '0x0000000000000000000000000000000000000002',
    denomination: 10_000_000n,
    label: '10 USDC',
    displayAmount: 10,
    enabled: false,
  },
  {
    address: '0x0000000000000000000000000000000000000003',
    denomination: 20_000_000n,
    label: '20 USDC',
    displayAmount: 20,
    enabled: false,
  },
  {
    address: '0x0000000000000000000000000000000000000004',
    denomination: 50_000_000n,
    label: '50 USDC',
    displayAmount: 50,
    enabled: false,
  },
]

const MAINNET_CONFIG: NetworkConfig = {
  chainId: 8453,
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  deployBlock: 0n,
  vaults: MAINNET_VAULTS,
  explorerBaseUrl: 'https://basescan.org',
  yieldPools: {
    aave: '7e0661bf-8cf3-45e6-9424-31916d4c7b84',   // Aave V3 USDC on Base
    morpho: '7820bd3c-461a-4811-9f0b-1d39c1503c3f',  // Morpho STEAKUSDC on Base
  },
  usdcDomain: {
    name: 'USDC',
    version: '2',
    chainId: 8453,
    verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
}

// ── Dual-mode config map ────────────────────────────────────────────

export const NETWORK_CONFIGS: Record<NetworkMode, NetworkConfig> = {
  testnet: TESTNET_CONFIG,
  mainnet: MAINNET_CONFIG,
}

// ── Backward-compat flat exports (point at testnet) ─────────────────

export const USDC_ADDRESS = TESTNET_CONFIG.usdcAddress
export const CHAIN_ID = TESTNET_CONFIG.chainId
export const DEPLOY_BLOCK = TESTNET_CONFIG.deployBlock
export const VAULTS = TESTNET_CONFIG.vaults
export const DEFAULT_VAULT = VAULTS.find((v) => v.enabled) ?? VAULTS[0]
export const VAULT_ADDRESS = VAULTS[0].address
export const DENOMINATION = VAULTS[0].denomination
