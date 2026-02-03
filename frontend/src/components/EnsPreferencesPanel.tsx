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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">ENS Withdrawal Preferences</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">&times;</button>
        </div>

        <p className="text-xs text-zinc-400">
          Set your preferred withdrawal chain and token on <span className="text-violet-400">{ensName}</span>.
          Senders who withdraw to your ENS name will see these preferences auto-populated.
        </p>

        {/* Chain */}
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Preferred chain</label>
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
                    ? 'bg-violet-500/20 border-violet-500/50 text-white'
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {chain.shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Token */}
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Preferred token</label>
          <div className="flex gap-2">
            {tokens.map((token) => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(token)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all border ${
                  selectedToken.symbol === token.symbol
                    ? 'bg-violet-500/20 border-violet-500/50 text-white'
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-zinc-600">
          This will write two text records to your ENS name on Ethereum mainnet. Requires a mainnet transaction.
        </p>

        {isSuccess ? (
          <div className="text-xs text-green-400 text-center py-2">
            Preferences saved to ENS!
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={isPending || isConfirming || !isConnected}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending || isConfirming ? 'Confirming...' : 'Save to ENS'}
          </button>
        )}
      </div>
    </div>
  )
}
