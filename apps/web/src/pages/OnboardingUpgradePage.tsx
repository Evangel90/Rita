import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { usePrivy, useWallets, type ConnectedWallet } from '@privy-io/react-auth'
import { CONTRACTS } from '../lib/contracts/config'
import { usePrivyEIP7702 } from '../lib/contracts/usePrivyEIP7702'

// Project default constants for initialization
const DEFAULT_CORE_STABLES: `0x${string}`[] = []

export function OnboardingUpgradePage() {
  const navigate = useNavigate()
  const { login, logout, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const { upgrade: privyUpgrade } = usePrivyEIP7702()


  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'signing' | 'delegating' | 'initializing'>('idle')

  const embeddedWallet = wallets.find((w: ConnectedWallet) => w.walletClientType === 'privy')
  const activeAddress = embeddedWallet?.address as `0x${string}` | undefined

  const onUpgrade = async () => {
    if (!activeAddress) {
      setError('No wallet connected. Please log in with Privy first.')
      return
    }

    try {
      setIsUpgrading(true)
      setError(null)
      setStep('signing')

      await privyUpgrade([activeAddress], 1, DEFAULT_CORE_STABLES)

      // Navigate to dashboard — the hook verified everything internally
      await navigate({ to: '/app/my-will' })
    } catch (err) {
      console.error('Upgrade failed:', err)
      const message = err instanceof Error ? err.message : 'Upgrade failed. Please try again.'
      setError(message)
      setStep('idle')
    } finally {
      setIsUpgrading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-2xl font-semibold">Upgrade to Smart Account</h2>
        <p className="mb-6 text-[#43493d]">Transform your wallet into a modular Rita account on Sepolia.</p>
        
        {!authenticated ? (
          <div className="mb-6">
            <button
              onClick={() => login()}
              className="w-full rounded-lg bg-[#5B7E3C] py-2 font-semibold text-white transition hover:opacity-90"
            >
              Connect with Privy
            </button>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            <div className="rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-3 text-sm text-[#43493d]">
              <span className="font-medium">Privy Account:</span> {activeAddress?.slice(0, 6)}...{activeAddress?.slice(-4)}
              {user?.email && <div className="mt-1 text-xs opacity-70">{user.email.address}</div>}
            </div>
            <button
              onClick={() => logout()}
              className="w-full rounded-lg border border-[#E8F5BD] bg-white py-2 font-semibold text-[#5B7E3C] transition hover:bg-[#F9FBF2]"
            >
              Logout
            </button>
          </div>
        )}

        <div className="mb-8 overflow-hidden rounded-xl border border-[#E8F5BD]">
          <div className="bg-[#F9FBF2] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#5B7E3C] border-b border-[#E8F5BD]">
            Upgrade Details
          </div>
          <div className="p-4 bg-white space-y-2 text-sm text-[#43493d]">
            <div className="flex justify-between">
              <span>Account Type</span>
              <span className="font-mono font-medium">EIP-7702 Delegated</span>
            </div>
            <div className="flex justify-between">
              <span>Delegate</span>
              <span className="font-mono text-xs">{CONTRACTS.ritaDelegate.slice(0, 10)}...{CONTRACTS.ritaDelegate.slice(-8)}</span>
            </div>
            <div className="flex justify-between border-t border-[#F9FBF2] pt-2 mt-2">
              <span>Initial Heir</span>
              <span className="font-mono text-xs">Self ({activeAddress?.slice(0, 6)}...)</span>
            </div>
          </div>
        </div>

        <button
          className="w-full rounded-lg bg-[#5B7E3C] py-4 font-semibold text-white shadow-lg shadow-[#5B7E3C]/10 transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUpgrading || !authenticated || !activeAddress}
          onClick={onUpgrade}
        >
          {isUpgrading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {step === 'signing' && 'Signing Authorization...'}
              {step === 'delegating' && 'Delegating Account...'}
              {step === 'initializing' && 'Initializing Smart Will...'}
            </span>
          ) : (
            'Sign & Upgrade'
          )}
        </button>
        
        {error ? (
          <div className="mt-4 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-[#8a9282]">
          By upgrading, you enable Rita Protocol to manage your account authority for inheritance.
          This does not grant Rita access to your private keys.
        </p>
      </div>
    </main>
  )
}
