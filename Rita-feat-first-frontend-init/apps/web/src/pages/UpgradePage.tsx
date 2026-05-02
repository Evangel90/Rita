import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { useEIP7702 } from '../lib/contracts/hooks'
import { CONTRACTS } from '../lib/contracts/config'

const DEFAULT_CORE_STABLES: `0x${string}`[] = []

export function UpgradePage() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()

  const [step, setStep] = useState<'idle' | 'signing' | 'executing'>('idle')
  const { upgrade, isPending: isUpgrading, error: upgradeError } = useEIP7702()

  const onUpgrade = async () => {
    if (!address || !isConnected) return

    try {
      setStep('signing')
      const upgradePromise = upgrade([address], 1, DEFAULT_CORE_STABLES)
      setStep('executing')
      await upgradePromise
      await navigate({ to: '/app/my-will' })
    } catch (err) {
      console.error('Upgrade failed:', err)
      setStep('idle')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-2xl font-semibold">Upgrade to Smart Account</h2>
        <p className="mb-6 text-[#43493d]">Transform your wallet into a modular Rita account on Sepolia.</p>
        
        {!isConnected ? (
          <div className="mb-6 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
            <p className="mb-3">Please connect your wallet to continue with the upgrade.</p>
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full rounded-lg bg-[#5B7E3C] py-2 font-semibold text-white transition hover:opacity-90"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            <div className="rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-3 text-sm text-[#43493d]">
              <span className="font-medium">Connected wallet:</span> {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full rounded-lg border border-[#E8F5BD] bg-white py-2 font-semibold text-[#5B7E3C] transition hover:bg-[#F9FBF2]"
            >
              Connect Different Wallet
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
              <span className="font-mono text-xs">Self ({address?.slice(0, 6)}...)</span>
            </div>
          </div>
        </div>

        <button
          className="w-full rounded-lg bg-[#5B7E3C] py-4 font-semibold text-white shadow-lg shadow-[#5B7E3C]/10 transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUpgrading || !isConnected || !address}
          onClick={onUpgrade}
        >
          {isUpgrading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {step === 'signing' && 'Signing Upgrade...'}
              {step === 'executing' && 'Executing Transaction...'}
            </span>
          ) : (
            'Sign & Upgrade'
          )}
        </button>
        
        {upgradeError ? (
          <div className="mt-4 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
            <p className="font-bold">Error:</p>
            <p>{upgradeError}</p>
            {upgradeError.includes('EIP-7702') && (
              <p className="mt-2 text-xs">
                <strong>Note:</strong> EIP-7702 requires wallet support for authorization transactions. Not all wallets support this feature yet.
              </p>
            )}
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
