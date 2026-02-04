import { useState, useEffect, useMemo } from 'react'

import { AnimatedBackground } from '../components/AnimatedBackground.tsx'
import { WithdrawTab } from '../components/WithdrawTab.tsx'
import { DepositTab } from '../components/DepositTab.tsx'
import { SidebarMenu } from '../components/SidebarMenu.tsx'

import { useUser, useWallets, OpenfortButton } from "@openfort/react";
import { useAccount, useSwitchChain } from "wagmi";
import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";
import { DEFAULT_VAULT, type VaultConfig } from '../contracts/addresses.ts'
import { useNetworkConfig } from '../hooks/useNetworkConfig.ts'
import { useNetworkMode } from '../contexts/NetworkModeContext.tsx'


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
    const [selectedVault, setSelectedVault] = useState<VaultConfig>(DEFAULT_VAULT)
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
            switchChainAsync({ chainId: networkConfig.chainId }).catch(() => {})
        }
    }, [isConnected, chainId, networkConfig.chainId, switchChainAsync])

    return (
        <div className="relative min-h-screen bg-zinc-950">
            <AnimatedBackground />

            {/* Top bar — full width, pinned to screen edges */}
            <div className="relative z-10 w-full px-6 pt-5 pb-4 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                >
                    Privacy Vault
                </button>

                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        isMainnet
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isMainnet ? 'bg-green-400' : 'bg-amber-400'} animate-pulse`} />
                        {isMainnet ? 'Mainnet' : 'Testnet'} mode
                    </span>
                    <OpenfortButton label={isAuthenticated ? undefined : 'Sign In'} />
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-zinc-400 hover:text-white transition-colors"
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
                <div className="relative z-10 max-w-lg mx-auto px-4 pb-4">
                    <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                        <p className="text-sm text-zinc-300">Setting up your wallet...</p>
                    </div>
                </div>
            )}


            {/* Main card */}
            <div className="relative z-10 max-w-lg mx-auto px-4 pb-8">
                <div className="glass-card rounded-2xl shadow-xl shadow-violet-500/5">
                    {/* Tabs */}
                    <div className="flex overflow-hidden rounded-t-2xl">
                        {(['deposit', 'withdraw'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-4 text-sm font-semibold transition-all relative ${tab === t
                                    ? 'text-white'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                {tab === t && (
                                    <span className="absolute bottom-0 inset-x-4 h-0.5 bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {tab === 'deposit'
                            ? <DepositTab publicClient={publicClient} isConnected={isConnected} address={address} selectedVault={selectedVault} onVaultChange={setSelectedVault} networkConfig={networkConfig} />
                            : <WithdrawTab selectedVault={selectedVault} networkConfig={networkConfig} />
                        }
                    </div>
                </div>
            </div>

            {/* Sidebar menu */}
            <SidebarMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
    )
}
