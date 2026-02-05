import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { normalize, namehash } from 'viem/ens'
import { SUPPORTED_CHAINS, COMMON_TOKENS, type ChainConfig, type TokenConfig } from '../constants/chains.ts'

// ENS Public Resolver on mainnet
const ENS_PUBLIC_RESOLVER = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63' as const

const RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

interface EnsPreferencesPanelProps {
  ensName: string
  onClose: () => void
}

export function EnsPreferencesPanel({ ensName, onClose }: EnsPreferencesPanelProps) {
  const { isConnected } = useAccount()
  const [selectedChain, setSelectedChain] = useState<ChainConfig>(SUPPORTED_CHAINS[0])
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(COMMON_TOKENS[SUPPORTED_CHAINS[0].chainId]?.[0])

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const tokens = COMMON_TOKENS[selectedChain.chainId] || []

  const handleSave = () => {
    if (!ensName || !isConnected) return

    const node = namehash(normalize(ensName))

    // Set chain preference
    writeContract({
      address: ENS_PUBLIC_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: 'setText',
      args: [node, 'privacy-vault.chain', selectedChain.chainId.toString()],
      chainId: 1, // mainnet
    })

    // Note: token preference would be a second transaction
    // For simplicity, we set both in one if the user confirms
    setTimeout(() => {
      writeContract({
        address: ENS_PUBLIC_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: 'setText',
        args: [node, 'privacy-vault.token', selectedToken.symbol],
        chainId: 1,
      })
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)] backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-[var(--text-primary)] font-semibold">ENS Withdrawal Preferences</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">&times;</button>
        </div>

        <p className="text-xs text-[var(--text-tertiary)]">
          Set your preferred withdrawal chain and token on <span className="text-[var(--text-primary)] font-medium">{ensName}</span>.
          Senders who withdraw to your ENS name will see these preferences auto-populated.
        </p>

        {/* Chain */}
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">Preferred chain</label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_CHAINS.map((chain) => (
              <button
                key={chain.chainId}
                onClick={() => {
                  setSelectedChain(chain)
                  const chainTokens = COMMON_TOKENS[chain.chainId] || []
                  setSelectedToken(chainTokens[0])
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all border ${
                  selectedChain.chainId === chain.chainId
                    ? 'bg-white/10 border-white/25 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-surface)] border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--text-muted)]'
                }`}
              >
                {chain.shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Token */}
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">Preferred token</label>
          <div className="flex gap-2">
            {tokens.map((token) => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(token)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all border ${
                  selectedToken.symbol === token.symbol
                    ? 'bg-white/10 border-white/25 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-surface)] border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--text-muted)]'
                }`}
              >
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-[var(--text-muted)]">
          This will write two text records to your ENS name on Ethereum mainnet. Requires a mainnet transaction.
        </p>

        {isSuccess ? (
          <div className="text-xs text-cyan-400 text-center py-2">
            Preferences saved to ENS!
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={isPending || isConfirming || !isConnected}
            className="w-full py-3 rounded-xl bg-[var(--accent)] text-[var(--bg-deep)] font-semibold text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending || isConfirming ? 'Confirming...' : 'Save to ENS'}
          </button>
        )}
      </div>
    </div>
  )
}
