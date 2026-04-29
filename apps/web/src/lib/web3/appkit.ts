import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { sepolia } from '@reown/appkit/networks'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

const metadata = {
  name: 'Rita Protocol',
  description: 'Decentralized inheritance authority',
  url: 'http://localhost:5173',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
}

const networks = [sepolia]

export const wagmiAdapter = new WagmiAdapter({
  projectId: projectId || 'MISSING_PROJECT_ID',
  networks,
  ssr: false,
})

if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks,
    metadata,
    features: {
      analytics: true,
    },
  })
} else {
  console.warn('VITE_WALLETCONNECT_PROJECT_ID is missing. AppKit modal is disabled until you set it.')
}
