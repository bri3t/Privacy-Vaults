import { useUser, useWallets, type UserWallet, OpenfortButton } from "@openfort/react";
import { useDeposit } from '../hooks/useDeposit.ts'
import { useUsdcBalance } from '../hooks/useUsdcBalance.ts'
import { StatusIndicator } from './StatusIndicator.tsx'
import { NoteModal } from './NoteModal.tsx'
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { erc20Abi, createPublicClient, http } from "viem";
import { useCallback, useMemo } from "react";



const DEPOSIT_STEPS = [
  { key: 'generating', label: 'Generating commitment' },
  { key: 'signing', label: 'Signing EIP-3009 authorization' },
  { key: 'submitting', label: 'Submitting transaction' },
]

interface DepositTabProps {
  publicClient: any;
  isConnected: boolean;
  address: `0x${string}` | undefined;
}

export function DepositTab({ publicClient, isConnected, address }: DepositTabProps) {
  
  const { step, note, txHash, error, deposit, reset } = useDeposit({ address, isConnected })
  const isActive = step !== 'idle' && step !== 'done' && step !== 'error'


  const { formattedBalance , isRefreshingBalance, refreshBalance } = useUsdcBalance(publicClient, address as `0x${string}`)


  return (
    <div className="space-y-5">
      <p className="text-zinc-400 text-sm leading-relaxed">
        Deposit 1 USDC into the Privacy Vault. You will receive a secret note
        that can be used to withdraw later.
      </p>

      {/* Token info */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
            $
          </div>
          <div>
            <p className="text-sm font-medium text-white">USDC</p>
            <p className="text-xs text-zinc-500">1.00 USDC</p>
          </div>
        </div>
        {isConnected && formattedBalance !== null && (
          <p className="text-xs text-zinc-500">
            Balance: <span className="text-zinc-300">{formattedBalance}</span>
          </p>
        )}
      </div>

      {/* Action button */}
      {isConnected ? (
        <button
          onClick={deposit}
          disabled={isActive}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isActive ? 'Processing...' : 'Deposit 1 USDC'}
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
    </div>
  )
}
