import type { Address } from 'viem'

/**
 * Vault configuration with hardcoded addresses and denominations per network
 * Format: { chainId: { vaultAddress, usdcAddress, denomination } }
 */
export const VAULT_CONFIG: Record<
    number,
    {
        vaultAddress: Address
        usdcAddress: Address
        denomination: bigint
        deployBlock: bigint
    }
> = {
    // Base (Chain ID 8453)
    8453: {
        vaultAddress: '0x0000000000000000000000000000000000000000', // TODO: Update with actual vault address
        usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        denomination: BigInt('100000000'), // 100 USDC (6 decimals)
        deployBlock: 0n,
    },

    // Base Sepolia (Chain ID 84532)
    84532: {
        vaultAddress: '0xF2Cb083928B4dD761FC9f5a2233b21DB85504934', // PrivacyVault deployed with real Groth16Verifier + MiMC Hasher
        usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
        denomination: BigInt('1000000'), // 1 USDC (6 decimals)
        deployBlock: 22920000n,
    },
}

/**
 * Get vault configuration for a specific chain
 */
export function getVaultConfig(chainId: number): (typeof VAULT_CONFIG)[number] {
    const config = VAULT_CONFIG[chainId]
    if (!config) {
        throw new Error(`Vault not configured for chain ${chainId}`)
    }
    return config
}
