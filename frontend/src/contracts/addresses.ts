import type { Address } from 'viem'
import type { NetworkMode } from '../contexts/NetworkModeContext.tsx'

export interface VaultConfig {
  address: Address
  denomination: bigint
  label: string
  displayAmount: number
  enabled: boolean
}

export interface NetworkConfig {
  chainId: number
  usdcAddress: Address
  deployBlock: bigint
  vaults: VaultConfig[]
  explorerBaseUrl: string
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
    address: '0x041686e2598084f78CBd08d21e47aD9df33f70C8',
    denomination: 1_000_000n,
    label: '1 USDC',
    displayAmount: 1,
    enabled: true,
  },
  {
    address: '0x4b21Be82AdA7e7E24dA20E6c160d8774306fDB6C',
    denomination: 10_000_000n,
    label: '10 USDC',
    displayAmount: 10,
    enabled: true,
  },
  {
    address: '0xFF8212fd3D34a392accB52803630BA072D0e5604',
    denomination: 20_000_000n,
    label: '20 USDC',
    displayAmount: 20,
    enabled: true,
  },
  {
    address: '0x21f022755d3264BAAa6c081B12e6BE7ed18B8897',
    denomination: 50_000_000n,
    label: '50 USDC',
    displayAmount: 50,
    enabled: true,
  },
]

const TESTNET_CONFIG: NetworkConfig = {
  chainId: 84532,
  usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  deployBlock: 37139811n,
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
