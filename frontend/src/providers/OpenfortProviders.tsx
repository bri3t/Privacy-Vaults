import {
  AccountTypeEnum,
  AuthProvider,
  getDefaultConfig,
  OpenfortProvider,
  RecoveryMethod,
} from '@openfort/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { baseSepolia, mainnet } from 'viem/chains'
import { createConfig, WagmiProvider } from 'wagmi'

const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Privacy Vault',
    chains: [baseSepolia, mainnet],
    walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
  }),
)

export function OpenfortProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OpenfortProvider
          debugMode
          publishableKey={import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY!}
          walletConfig={{
            shieldPublishableKey: import.meta.env.VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY!,
            ethereumProviderPolicyId: import.meta.env.VITE_OPENFORT_POLICY_ID,
            createEncryptedSessionEndpoint: import.meta.env.VITE_CREATE_ENCRYPTED_SESSION_ENDPOINT,
            accountType: AccountTypeEnum.EOA,
          }}
          uiConfig={{
            authProviders: [
              AuthProvider.EMAIL_OTP,
              AuthProvider.GUEST,
              AuthProvider.GOOGLE,
              AuthProvider.WALLET,
            ],
            walletRecovery: {
              defaultMethod: RecoveryMethod.PASSKEY,
            },
          }}
        >
          {children}
        </OpenfortProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
