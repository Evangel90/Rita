import { createConfig, http } from 'wagmi'
import { coinbaseWallet, injected } from 'wagmi/connectors'
import { liskSepolia, sepolia } from 'wagmi/chains'

export const wagmiConfig = createConfig({
  chains: [liskSepolia, sepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Rita Protocol' }),
  ],
  transports: {
    [liskSepolia.id]: http(),
    [sepolia.id]: http(),
  },
})
