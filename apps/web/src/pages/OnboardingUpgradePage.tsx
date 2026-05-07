import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { usePrivy, useWallets, type ConnectedWallet } from '@privy-io/react-auth'
import { CONTRACTS } from '../lib/contracts/config'
import { usePrivyEIP7702 } from '../lib/contracts/usePrivyEIP7702'
import { useIsDelegated, useRitaDashboardData, useRitaAccount } from '../lib/contracts/hooks'

// Project default constants for initialization
const DEFAULT_CORE_STABLES: `0x${string}`[] = []

export function OnboardingUpgradePage() {
  const navigate = useNavigate()
  const { login, logout, authenticated, user } = usePrivy()
  const { wallets } = useWallets()
  const { upgrade: privyUpgrade } = usePrivyEIP7702()
  const { address } = useRitaAccount()
  const { isDelegated, isLoading: delegationLoading } = useIsDelegated()
  const ritaData = useRitaDashboardData()

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

      // Navigate to the full initialization form
      await navigate({ to: '/app/initialize-will' })
    } catch (err) {
      console.error('Delegation failed:', err)
      const message = err instanceof Error ? err.message : 'Delegation failed. Please try again.'
      setError(message)
      setStep('idle')
    } finally {
      setIsUpgrading(false)
    }
  }

  const isLoading = delegationLoading || ritaData.isLoading

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-2xl font-semibold">Delegate to Rita Protocol</h2>
        <p className="mb-6 text-[#43493d]">Transform your wallet into a modular Rita account on Sepolia via EIP-7702.</p>
        
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#5B7E3C] border-t-transparent mx-auto" />
            <p className="mt-4 text-stone-500">Verifying account status...</p>
          </div>
        ) : isDelegated ? (
          <div className="mb-6 rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5B7E3C] text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-bold text-stone-800">Account Already Delegated</h3>
            <p className="mt-2 text-sm text-stone-600">
              Your account is already delegated to the Rita Protocol. 
              {ritaData.isInitialized 
                ? ' You can now manage your will details.' 
                : ' You can now proceed to initialize your will.'}
            </p>
            <button
              onClick={() => navigate({ to: ritaData.isInitialized ? '/app/my-will' : '/app/initialize-will' })}
              className="mt-6 w-full rounded-lg bg-[#5B7E3C] py-3 font-semibold text-white transition hover:opacity-90"
            >
              {ritaData.isInitialized ? 'Go to My Will' : 'Initialize My Will'}
            </button>
          </div>
        ) : (
          <>
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
                Delegation Details
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
                'Sign & Delegate'
              )}
            </button>
            
            {error ? (
              <div className="mt-4 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
                <p className="font-bold">Error:</p>
                <p>{error}</p>
              </div>
            ) : null}

            <p className="mt-6 text-center text-xs text-[#8a9282]">
              By delegating, you enable Rita Protocol to manage your account authority for inheritance.
              This does not grant Rita access to your private keys.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
