import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useSignMessage } from 'wagmi'

export function OnboardingUpgradePage() {
  const navigate = useNavigate()
  const { isConnected, address } = useAccount()
  const { signMessageAsync, isPending } = useSignMessage()
  const [error, setError] = useState<string | null>(null)

  const onSign = async () => {
    try {
      setError(null)
      await signMessageAsync({ message: 'Authorize Rita EIP-7702 upgrade intent' })
      await navigate({ to: '/onboarding/install' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signing was rejected. Please try again.'
      setError(message)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-2xl font-semibold">Upgrade to Modular Account</h2>
        <p className="mb-6 text-[#43493d]">Step 2 of 3: authorize the EIP-7702 upgrade intent.</p>
        {!isConnected ? (
          <div className="mb-6 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
            Wallet not connected. Go back and connect your wallet first.
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-3 text-sm text-[#43493d]">
            Connected wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        )}
        <pre className="mb-6 overflow-x-auto rounded-lg bg-stone-900 p-4 text-sm text-stone-300">
{`{
  "type": "0x04",
  "to": "0xRita...7702",
  "authorization": "EIP-7702_UPGRADE_REK"
}`}
        </pre>
        <button
          className="w-full rounded-lg bg-[#5B7E3C] py-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || !isConnected}
          onClick={onSign}
        >
          {isPending ? 'Signing...' : 'Sign & Upgrade'}
        </button>
        {error ? <p className="mt-3 text-sm text-[#ba1a1a]">{error}</p> : null}
      </div>
    </main>
  )
}
