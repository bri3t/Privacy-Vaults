import { useState } from 'react'
import { OpenfortButton } from "@openfort/react";
import { useDeposit } from '../hooks/useDeposit.ts'
import { useUsdcBalance } from '../hooks/useUsdcBalance.ts'
import { useYieldApy } from '../hooks/useYieldApy.ts'
import { StatusIndicator } from './StatusIndicator.tsx'
import { NoteModal } from './NoteModal.tsx'
import { InsufficientBalanceModal } from './InsufficientBalanceModal.tsx'
import type { VaultConfig, NetworkConfig } from '../contracts/addresses.ts'
import { useNetworkMode } from '../contexts/NetworkModeContext.tsx'

const DEPOSIT_STEPS = [
  { key: 'generating', label: 'Generating commitment' },
  { key: 'signing', label: 'Signing EIP-3009 authorization' },
  { key: 'submitting', label: 'Submitting transaction' },
]

interface DepositTabProps {
  publicClient: any
  isConnected: boolean
  address: `0x${string}` | undefined
  selectedVault: VaultConfig
  onVaultChange: (v: VaultConfig) => void
  networkConfig: NetworkConfig
}

export function DepositTab({ publicClient, isConnected, address, selectedVault, onVaultChange, networkConfig }: DepositTabProps) {
  const [showInsufficientModal, setShowInsufficientModal] = useState(false)

  const { step, note, txHash, error, deposit, reset } = useDeposit({
    address,
    isConnected,
    vaultAddress: selectedVault.address,
    denomination: selectedVault.denomination,
    networkConfig,
  })
  const isActive = step !== 'idle' && step !== 'done' && step !== 'error'

  const { isTestnet } = useNetworkMode()
  const { formattedBalance } = useUsdcBalance(publicClient, address as `0x${string}`, networkConfig.usdcAddress)
  const { blendedApy } = useYieldApy(networkConfig.yieldPools)

  const handleDeposit = () => {
    const balance = parseFloat(formattedBalance || '0')
    if (balance < selectedVault.displayAmount) {
      setShowInsufficientModal(true)
      return
    }
    deposit()
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Form fields */}
      <div className="space-y-5">
        <p className="text-[var(--text-tertiary)] text-sm leading-relaxed">
          Deposit <span className="text-[var(--text-primary)] font-medium">{selectedVault.label}</span> into the Privacy Vault.
          You will receive a secret note that can be used to withdraw later.
        </p>

        {/* Balance */}
        {isConnected && formattedBalance !== null && (
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <img src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" alt="USDC" className="w-4 h-4 rounded-full" />
              Balance: <span className="text-[var(--text-secondary)]">{formattedBalance} USDC</span>
            </div>
            {isTestnet && (
              <a
                href="https://faucet.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                Get testnet USDC
              </a>
            )}
          </div>
        )}

        {/* Denomination selector */}
        <div className="flex gap-2">
          {networkConfig.vaults.map((vault) => {
            const isSelected = vault.denomination === selectedVault.denomination
            const isDisabled = !vault.enabled
            return (
              <button
                key={vault.label}
                onClick={() => !isDisabled && onVaultChange(vault)}
                disabled={isDisabled && isActive}
                className={`
                  flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border
                  ${isSelected
                    ? 'bg-gradient-to-r from-violet-500/20 to-cyan-400/20 border-violet-500/50 text-[var(--text-primary)] shadow-sm shadow-violet-500/10'
                    : isDisabled
                      ? 'bg-[var(--bg-surface)] border-[var(--border-primary)] text-[var(--text-muted)] cursor-not-allowed'
                      : 'bg-[var(--bg-surface)] border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }
                `}
              >
                {vault.displayAmount}
                {isDisabled && <span className="block text-[10px] font-normal text-[var(--text-muted)]">Soon</span>}
              </button>
            )
          })}
        </div>

        {/* Yield info (mainnet only) */}
        {networkConfig.yieldPools && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-emerald-400 font-medium">
              Earning yield via Aave V3 + Morpho while deposited
              {blendedApy !== null && <span className="text-emerald-300"> · est. {blendedApy.toFixed(2)}% APY</span>}
            </p>
          </div>
        )}
      </div>

      {/* Action button — pushed to bottom */}
      <div className="mt-auto pt-5 space-y-5">
        {isConnected ? (
          <button
            onClick={handleDeposit}
            disabled={isActive}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Deposit {selectedVault.label}
          </button>
        ) : (
          <div className="space-y-2">
            <OpenfortButton label="Log In to Deposit" />
          </div>
        )}

        {/* Progress */}
        {step !== 'idle' && (
          <StatusIndicator
            steps={DEPOSIT_STEPS}
            currentStep={step}
            error={error}
          />
        )}

        {/* Error retry */}
        {step === 'error' && (
          <button
            onClick={reset}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-sm font-medium border border-[var(--border-primary)] transition-colors"
          >
            Try again
          </button>
        )}

        {/* Tx link */}
        {txHash && (
          <div className="text-xs text-[var(--text-muted)]">
            Tx:{' '}
            <a
              href={`${networkConfig.explorerBaseUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          </div>
        )}
      </div>

      {/* Note modal */}
      {step === 'done' && note && <NoteModal note={note} onClose={reset} />}

      {/* Insufficient balance modal */}
      {showInsufficientModal && (
        <InsufficientBalanceModal
          requiredAmount={selectedVault.label}
          currentBalance={formattedBalance || '0'}
          onClose={() => setShowInsufficientModal(false)}
        />
      )}
    </div>
  )
}
