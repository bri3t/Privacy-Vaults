import {
  AccountTypeEnum,
  AuthProvider,
  getDefaultConfig,
  OpenfortProvider,
  RecoveryMethod,
} from '@openfort/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { baseSepolia, base, mainnet } from 'viem/chains'
import { createConfig, WagmiProvider, http } from 'wagmi'

const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Privacy Vaults',
    chains: [baseSepolia, base, mainnet],
    transports: {
      [baseSepolia.id]: http(),
      [base.id]: http(),
      [mainnet.id]: http(import.meta.env.VITE_MAINNET_RPC_URL),
    },
    ssr: true,
    walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID,
  }),
)

export function OpenfortProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OpenfortProvider
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
              allowedMethods: [
                RecoveryMethod.PASSWORD, 
                RecoveryMethod.AUTOMATIC, 
                RecoveryMethod.PASSKEY],
            },
          }}
        >
          {children}
        </OpenfortProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
