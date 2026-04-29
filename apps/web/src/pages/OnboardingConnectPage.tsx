import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAppKit } from '@reown/appkit/react'
import { useAccount } from 'wagmi'

export function OnboardingConnectPage() {
  const { open } = useAppKit()
  const { isConnected, connector, address } = useAccount()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isConnected) {
      return
    }

    void navigate({ to: '/onboarding/upgrade' })
  }, [isConnected, navigate])

  const openModal = async () => {
    await open({ view: 'Connect' })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-md rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-center text-2xl font-semibold">Connect your wallet to begin</h2>
        <p className="mb-6 text-center text-sm text-[#43493d]">
          Use AppKit to connect with MetaMask, WalletConnect, Coinbase, and more.
        </p>
        <button className="w-full rounded-lg bg-[#5B7E3C] py-4 font-semibold text-white" onClick={openModal}>
          Open Wallet Connector
        </button>
        {isConnected ? (
          <div className="mt-4 rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-3 text-sm text-[#43493d]">
            Connected with {connector?.name || 'wallet'} ({address?.slice(0, 6)}...{address?.slice(-4)}). Redirecting...
          </div>
        ) : (
          <p className="mt-4 text-center text-xs text-[#43493d]">You will continue automatically after wallet connection.</p>
        )}
        <div className="mt-6 rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-3 text-xs text-[#43493d]">
          If no wallets appear, set <code>VITE_WALLETCONNECT_PROJECT_ID</code> in your environment.
        </div>
      </div>
    </main>
  )
}
