import { useState } from 'react'
import { OpenfortButton } from "@openfort/react";
import { useDeposit } from '../hooks/useDeposit.ts'
import { useUsdcBalance } from '../hooks/useUsdcBalance.ts'
import { StatusIndicator } from './StatusIndicator.tsx'
import { NoteModal } from './NoteModal.tsx'
import { InsufficientBalanceModal } from './InsufficientBalanceModal.tsx'
import { VAULTS, type VaultConfig } from '../contracts/addresses.ts'

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
}

export function DepositTab({ publicClient, isConnected, address, selectedVault, onVaultChange }: DepositTabProps) {
  const [showInsufficientModal, setShowInsufficientModal] = useState(false)

  const { step, note, txHash, error, deposit, reset } = useDeposit({
    address,
    isConnected,
    vaultAddress: selectedVault.address,
    denomination: selectedVault.denomination,
  })
  const isActive = step !== 'idle' && step !== 'done' && step !== 'error'

  const { formattedBalance } = useUsdcBalance(publicClient, address as `0x${string}`)

  const handleDeposit = () => {
    const balance = parseFloat(formattedBalance || '0')
    if (balance < selectedVault.displayAmount) {
      setShowInsufficientModal(true)
      return
    }
    deposit()
  }

  return (
    <div className="space-y-5">
      <p className="text-zinc-400 text-sm leading-relaxed">
        Deposit <span className="text-white font-medium">{selectedVault.label}</span> into the Privacy Vault.
        You will receive a secret note that can be used to withdraw later.
      </p>

      {/* Denomination selector */}
      <div className="flex gap-2">
        {VAULTS.map((vault) => {
          const isSelected = vault.denomination === selectedVault.denomination
          const isDisabled = !vault.enabled
          return (
            <button
              key={vault.label}
              onClick={() => !isDisabled && onVaultChange(vault)}
              disabled={isDisabled || isActive}
              className={`
                flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border
                ${isSelected
                  ? 'bg-gradient-to-r from-violet-500/20 to-cyan-400/20 border-violet-500/50 text-white shadow-sm shadow-violet-500/10'
                  : isDisabled
                    ? 'bg-zinc-800/30 border-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                }
              `}
            >
              {vault.displayAmount}
              {isDisabled && <span className="block text-[10px] font-normal text-zinc-600">Soon</span>}
            </button>
          )
        })}
      </div>

      {/* Token info */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
            $
          </div>
          <div>
            <p className="text-sm font-medium text-white">USDC</p>
            <p className="text-xs text-zinc-500">{selectedVault.label}</p>
          </div>
        </div>
        {isConnected && formattedBalance !== null && (
          <p className="text-xs text-zinc-500">
            Balance: <span className="text-zinc-300">{formattedBalance}</span>
          </p>
        )}
      </div>

      {/* Yield info */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-xs text-emerald-400 font-medium">
          Earning yield via Aave V3 while deposited
        </p>
      </div>

      {/* Action button */}
      {isConnected ? (
        <button
          onClick={handleDeposit}
          disabled={isActive}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isActive ? 'Processing...' : `Deposit ${selectedVault.label}`}
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
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium border border-zinc-700 transition-colors"
        >
          Try again
        </button>
      )}

      {/* Tx link */}
      {txHash && (
        <div className="text-xs text-zinc-500">
          Tx:{' '}
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:underline"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}

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
