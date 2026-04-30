import { sepolia } from 'viem/chains'

/**
 * Privy Configuration
 * 
 * Privy provides native EIP-7702 support and handles account abstraction
 * automatically, allowing seamless smart account upgrades without browser
 * wallet limitations.
 */

export const privyConfig = {
  appId: import.meta.env.VITE_PRIVY_APP_ID || 'MISSING_APP_ID',
  config: {
    appearance: {
      theme: 'light' as const,
    },
    // Enable embedded wallet with EIP-7702 support
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const,
    },
    // Support Sepolia
    defaultChain: sepolia,
    supportedChains: [sepolia],
    externalWallets: {
      coinbaseWallet: {
        enabled: true,
        connectionOptions: 'all' as const,
      },
      metamask: {
        enabled: true,
      },
    },
  },
}

export const supportedChains = {
  sepolia: 11155111,
}
