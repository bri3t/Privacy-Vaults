import { useState, useEffect, useMemo } from 'react'

import { AnimatedBackground } from '../components/AnimatedBackground.tsx'
import { DecryptedText } from '../components/DecryptedText.tsx'
import { WithdrawTab } from '../components/WithdrawTab.tsx'
import { DepositTab } from '../components/DepositTab.tsx'
import { SidebarMenu } from '../components/SidebarMenu.tsx'
import { StatsPanel } from '../components/StatsPanel.tsx'

import { useUser, useWallets, OpenfortButton } from "@openfort/react";
import { useAccount, useSwitchChain } from "wagmi";
import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";
import { NETWORK_CONFIGS, type VaultConfig } from '../contracts/addresses.ts'
import { useNetworkConfig } from '../hooks/useNetworkConfig.ts'
import { useNetworkMode, type NetworkMode } from '../contexts/NetworkModeContext.tsx'

// Get initial vault based on stored network mode
function getInitialVault(): VaultConfig {
  let mode: NetworkMode = 'testnet'
  try {
    const stored = localStorage.getItem('privacy-vault-network-mode')
    if (stored === 'mainnet' || stored === 'testnet') mode = stored
  } catch {}
  const config = NETWORK_CONFIGS[mode]
  return config.vaults.find((v) => v.enabled) ?? config.vaults[0]
}


type Tab = 'deposit' | 'withdraw'

const CHAIN_MAP: Record<number, typeof baseSepolia | typeof base> = {
    [baseSepolia.id]: baseSepolia,
    [base.id]: base,
}

export function VaultPage({ onBack }: { onBack: () => void }) {
    const { address, isConnected, chainId } = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const { isAuthenticated } = useUser();
    const { wallets, isLoadingWallets, setActiveWallet, isConnecting } = useWallets();
    const networkConfig = useNetworkConfig()
    const { mode, isMainnet } = useNetworkMode()

    const [tab, setTab] = useState<Tab>('deposit')
    const [selectedVault, setSelectedVault] = useState<VaultConfig>(getInitialVault)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const viemChain = CHAIN_MAP[networkConfig.chainId] ?? baseSepolia

    const publicClient = useMemo(
        () =>
            createPublicClient({
                chain: viemChain,
                transport: http(),
            }),
        [viemChain],
    );

    // Reset selected vault when network config changes
    useEffect(() => {
        const defaultVault = networkConfig.vaults.find((v) => v.enabled) ?? networkConfig.vaults[0]
        setSelectedVault(defaultVault)
    }, [networkConfig])

    // Auto-select wallet when there's exactly one and wagmi isn't connected yet
    useEffect(() => {
        if (isAuthenticated && !isConnected && !isConnecting && !isLoadingWallets && wallets.length === 1) {
            setActiveWallet(wallets[0].id)
        }
    }, [isAuthenticated, isConnected, isConnecting, isLoadingWallets, wallets, setActiveWallet])

    // Auto-switch to correct chain when connected on wrong chain
    useEffect(() => {
        if (isConnected && chainId !== networkConfig.chainId) {
            switchChainAsync({ chainId: networkConfig.chainId }).catch(() => { })
        }
    }, [isConnected, chainId, networkConfig.chainId, switchChainAsync])

    return (
        <div className="relative min-h-screen bg-[var(--bg-page)]">
            <AnimatedBackground />

            {/* Top bar — constrained to content width */}
            <div className="relative z-10 max-w-5xl mx-auto px-4 pt-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="text-lg font-bold text-[var(--text-primary)] hover:opacity-80 transition-opacity"
                    >
                        <DecryptedText
                            text="Privacy Vaults"
                            animateOn="view"
                            sequential
                            speed={40}
                            className="text-[var(--text-primary)]"
                            encryptedClassName="text-[var(--accent)]"
                        />
                    </button>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${isMainnet
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-zinc-400/10 text-zinc-400 border border-zinc-400/20'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isMainnet ? 'bg-green-400' : 'bg-zinc-400'} animate-pulse`} />
                        {isMainnet ? 'Mainnet' : 'Testnet'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <OpenfortButton label={isAuthenticated ? undefined : 'Sign In'} />
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                        aria-label="Open settings"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Loading wallet state */}
            {isAuthenticated && (isLoadingWallets || isConnecting) && (
                <div className="relative z-10 max-w-5xl mx-auto px-4 pb-4">
                    <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                        <p className="text-sm text-[var(--text-secondary)]">Setting up your wallet...</p>
                    </div>
                </div>
            )}

            {/* Main content — two-card layout */}
            <div className="relative z-10 max-w-5xl mx-auto px-4 pb-8 flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-1/2 min-h-[344px]">
                    <div className="glass-card rounded-2xl shadow-xl shadow-black/10 h-full flex flex-col">
                        {/* Tabs */}
                        <div className="flex overflow-hidden rounded-t-2xl">
                            {(['deposit', 'withdraw'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`flex-1 py-4 text-sm font-semibold transition-all relative ${tab === t
                                        ? 'text-[var(--text-primary)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                        }`}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                    {tab === t && (
                                        <span className="absolute bottom-0 inset-x-4 h-0.5 bg-[var(--text-primary)] rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col">
                            {tab === 'deposit'
                                ? <DepositTab publicClient={publicClient} isConnected={isConnected} address={address} selectedVault={selectedVault} onVaultChange={setSelectedVault} networkConfig={networkConfig} />
                                : <WithdrawTab selectedVault={selectedVault} networkConfig={networkConfig} />
                            }
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-1/2 min-h-[344px]">
                    <StatsPanel selectedVault={selectedVault} networkConfig={networkConfig} />
                </div>
            </div>

            {/* GitHub link — bottom right */}
            <a
                href="https://github.com/0xbri3t"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-4 right-4 z-10 p-2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                aria-label="GitHub"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
            </a>

            {/* Sidebar menu */}
            <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
    )
}
