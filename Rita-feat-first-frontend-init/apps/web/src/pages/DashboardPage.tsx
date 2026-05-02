import { useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { useRitaActions, useHeirInheritances, useOwnerEthBalance, type InheritanceInfo } from '../lib/contracts/hooks'
import { useAccount } from 'wagmi'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function daysUntil(timestamp: bigint | undefined): number {
  if (!timestamp) return 0
  const now = BigInt(Math.floor(Date.now() / 1000))
  if (timestamp <= now) return 0
  return Math.ceil(Number((timestamp - now) / 86400n))
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface InheritanceCardProps {
  inheritance: InheritanceInfo
}

function InheritanceCard({ inheritance }: InheritanceCardProps) {
  const actions = useRitaActions()
  const ethBalance = useOwnerEthBalance(inheritance.ownerAddress)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState(false)

  const days = daysUntil(inheritance.nextPingtime)
  const isClaimable = inheritance.isClaimable
  const stateLabel = inheritance.ritaState ?? '…'

  async function handleClaimEth() {
    setClaimError(null)
    setClaimSuccess(false)
    try {
      await actions.claimEth(inheritance.ownerAddress)
      setClaimSuccess(true)
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleClaimToken(token: `0x${string}`) {
    setClaimError(null)
    setClaimSuccess(false)
    try {
      await actions.claimToken(token, inheritance.ownerAddress)
      setClaimSuccess(true)
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleClaimAll() {
    setClaimError(null)
    setClaimSuccess(false)
    try {
      await actions.claimMultiple(inheritance.supportedTokens, inheritance.ownerAddress)
      setClaimSuccess(true)
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <article className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div
        className={`flex items-center justify-between px-6 py-4 ${
          isClaimable ? 'bg-[#E8F5BD]' : 'bg-stone-50'
        }`}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Owner</p>
          <p className="font-mono text-sm font-semibold text-stone-800">
            {formatAddress(inheritance.ownerAddress)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isClaimable
              ? 'bg-[#5B7E3C] text-white'
              : 'bg-stone-200 text-stone-600'
          }`}
        >
          {stateLabel}
        </span>
      </div>

      {/* Card body */}
      <div className="px-6 py-5 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-stone-500">ETH Balance</p>
            <p className="text-sm font-semibold text-stone-800">
              {Number(ethBalance).toFixed(4)} ETH
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Tracked Tokens</p>
            <p className="text-sm font-semibold text-stone-800">
              {inheritance.supportedTokens.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">
              {isClaimable ? 'Claimable Now' : 'Days Until Claimable'}
            </p>
            <p className={`text-sm font-semibold ${isClaimable ? 'text-[#5B7E3C]' : 'text-stone-800'}`}>
              {isClaimable ? '✓ Ready' : `${days}d`}
            </p>
          </div>
        </div>

        {/* Claim actions */}
        <div className="space-y-2">
          <button
            className="w-full rounded-lg bg-[#5B7E3C] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#4a6830] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isClaimable || actions.isPending}
            onClick={handleClaimEth}
          >
            {actions.isPending ? 'Claiming…' : 'Claim ETH'}
          </button>

          {inheritance.supportedTokens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {inheritance.supportedTokens.map((token) => (
                <button
                  key={token}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-[#5B7E3C] hover:text-[#5B7E3C] disabled:opacity-50"
                  disabled={!isClaimable || actions.isPending}
                  onClick={() => handleClaimToken(token)}
                >
                  Claim {formatAddress(token)}
                </button>
              ))}
              {inheritance.supportedTokens.length > 1 && (
                <button
                  className="rounded-lg border border-[#5B7E3C] px-3 py-1.5 text-xs font-medium text-[#5B7E3C] transition hover:bg-[#E8F5BD] disabled:opacity-50"
                  disabled={!isClaimable || actions.isPending}
                  onClick={handleClaimAll}
                >
                  Claim all tokens
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback */}
        {claimSuccess && (
          <p className="rounded-lg bg-green-50 px-4 py-2 text-xs text-green-700">
            ✓ Claim submitted successfully.
          </p>
        )}
        {claimError && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-xs text-red-600 break-all">
            ✗ {claimError}
          </p>
        )}

        {!isClaimable && (
          <p className="text-xs text-stone-400">
            Assets become claimable once the owner's inactivity threshold is reached.
          </p>
        )}
      </div>
    </article>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function NoInheritances() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-white px-8 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
        <svg
          className="h-8 w-8 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-stone-700">No inheritances found</h3>
      <p className="max-w-sm text-sm text-stone-500">
        Your connected wallet hasn't been registered as an heir in any active Rita will. If you
        believe this is a mistake, ask the will owner to add your address as an heir.
      </p>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-stone-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-stone-200" />
            <div className="h-6 w-20 rounded-full bg-stone-200" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="space-y-1">
                <div className="h-3 w-16 rounded bg-stone-100" />
                <div className="h-4 w-20 rounded bg-stone-200" />
              </div>
            ))}
          </div>
          <div className="mt-4 h-10 rounded-lg bg-stone-100" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { address, isConnected } = useAccount()
  const { inheritances, isLoading, hasInheritances } = useHeirInheritances()

  const claimableCount = inheritances.filter((i) => i.isClaimable).length

  return (
    <AppShell>
      <div className="mx-auto max-w-[900px] space-y-6 p-6">
        {/* Page header */}
        <div>
          <h2 className="text-2xl font-bold text-stone-900">My Inheritances</h2>
          <p className="mt-1 text-sm text-stone-500">
            {isConnected && address
              ? `Showing inheritances for ${formatAddress(address)}`
              : 'Connect your wallet to see your inheritances'}
          </p>
        </div>

        {/* Summary banner — only shown when there are claimable inheritances */}
        {claimableCount > 0 && (
          <div className="flex items-center gap-4 rounded-xl border-2 border-[#5B7E3C] bg-[#E8F5BD] px-6 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5B7E3C] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#3d5628]">
                {claimableCount === 1
                  ? '1 inheritance is ready to claim'
                  : `${claimableCount} inheritances are ready to claim`}
              </p>
              <p className="text-xs text-[#5B7E3C]">
                The inactivity threshold has been reached — you can claim assets now.
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-white px-8 py-20 text-center">
            <p className="text-sm text-stone-500">Connect your wallet to check for inheritances.</p>
          </div>
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : !hasInheritances ? (
          <NoInheritances />
        ) : (
          <div className="space-y-4">
            {inheritances.map((inheritance) => (
              <InheritanceCard key={inheritance.ownerAddress} inheritance={inheritance} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
