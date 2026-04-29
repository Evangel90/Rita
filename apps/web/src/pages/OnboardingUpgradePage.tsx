import { useNavigate } from '@tanstack/react-router'
import { useSignMessage } from 'wagmi'

export function OnboardingUpgradePage() {
  const navigate = useNavigate()
  const { signMessageAsync, isPending } = useSignMessage()

  const onSign = async () => {
    await signMessageAsync({ message: 'Authorize Rita EIP-7702 upgrade intent' })
    await navigate({ to: '/onboarding/install' })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-2xl font-semibold">Upgrade to Modular Account</h2>
        <p className="mb-6 text-[#43493d]">Step 2 of 3: authorize the EIP-7702 upgrade intent.</p>
        <pre className="mb-6 overflow-x-auto rounded-lg bg-stone-900 p-4 text-sm text-stone-300">
{`{
  "type": "0x04",
  "to": "0xRita...7702",
  "authorization": "EIP-7702_UPGRADE_REK"
}`}
        </pre>
        <button className="w-full rounded-lg bg-[#5B7E3C] py-4 font-semibold text-white" disabled={isPending} onClick={onSign}>
          {isPending ? 'Signing...' : 'Sign & Upgrade'}
        </button>
      </div>
    </main>
  )
}
