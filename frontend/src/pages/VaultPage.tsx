import { useState, useEffect } from 'react'
import { useCallback, useMemo } from "react";

import { AnimatedBackground } from '../components/AnimatedBackground.tsx'
import { WithdrawTab } from '../components/WithdrawTab.tsx'
import { DepositTab } from '../components/DepositTab.tsx'

import { useUser, useWallets, type UserWallet, OpenfortButton } from "@openfort/react";
import { useAccount, useSwitchChain } from "wagmi";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";


type Tab = 'deposit' | 'withdraw'

export function VaultPage({ onBack }: { onBack: () => void }) {
    const { address, isConnected, chainId } = useAccount();
    const { switchChainAsync } = useSwitchChain();
    const { isAuthenticated } = useUser();
    const { wallets, isLoadingWallets, setActiveWallet, isConnecting } = useWallets();

    const [tab, setTab] = useState<Tab>('deposit')

    const publicClient = useMemo(
        () =>
            createPublicClient({
                chain: baseSepolia,
                transport: http(),
            }),
        [],
    );


    // Auto-select wallet when there's exactly one and wagmi isn't connected yet
    useEffect(() => {
        if (isAuthenticated && !isConnected && !isConnecting && !isLoadingWallets && wallets.length === 1) {
            setActiveWallet(wallets[0].id)
        }
    }, [isAuthenticated, isConnected, isConnecting, isLoadingWallets, wallets, setActiveWallet])

    // Auto-switch to Base Sepolia when connected on wrong chain
    useEffect(() => {
        if (isConnected && chainId !== baseSepolia.id) {
            switchChainAsync({ chainId: baseSepolia.id }).catch(() => {})
        }
    }, [isConnected, chainId, switchChainAsync])

    const showWalletSelector =
        isAuthenticated && !isLoadingWallets && !isConnected && !isConnecting && wallets.length > 1

    return (
        <div className="relative min-h-screen bg-zinc-950">
            <AnimatedBackground />

            {/* Top bar */}
            <div className="relative z-10 max-w-lg mx-auto px-4 pt-6 pb-4 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                >
                    Privacy Vault
                </button>

                <OpenfortButton label={isAuthenticated ? undefined : 'Sign In'} />
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
                <div className="glass-card rounded-2xl overflow-hidden shadow-xl shadow-violet-500/5">
                    {/* Tabs */}
                    <div className="flex">
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
                        {tab === 'deposit' ? <DepositTab publicClient={publicClient} isConnected={isConnected} address={address} /> : <WithdrawTab />}
                    </div>
                </div>
            </div>
        </div>
    )
}