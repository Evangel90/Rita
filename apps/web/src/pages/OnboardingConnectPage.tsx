import { useNavigate } from '@tanstack/react-router'
import { useConnect } from 'wagmi'

export function OnboardingConnectPage() {
  const { connectors, connectAsync } = useConnect()
  const navigate = useNavigate()

  const connectAndContinue = async (index: number) => {
    await connectAsync({ connector: connectors[index] ?? connectors[0] })
    await navigate({ to: '/onboarding/upgrade' })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-md rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-center text-2xl font-semibold">Connect your wallet to begin</h2>
        <p className="mb-6 text-center text-sm text-[#43493d]">Choose provider to access your inheritance vault.</p>
        <div className="space-y-3">
          <button className="w-full rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-4 text-left" onClick={() => connectAndContinue(0)}>
            MetaMask / Injected
          </button>
          <button className="w-full rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-4 text-left" onClick={() => connectAndContinue(0)}>
            WalletConnect (injected fallback)
          </button>
          <button className="w-full rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-4 text-left" onClick={() => connectAndContinue(1)}>
            Coinbase Wallet
          </button>
        </div>
      </div>
    </main>
  )
}
