import { useState } from 'react'
import { useAccount } from 'wagmi'
import { AppShell } from '../components/layout/AppShell'
import { useInheritances, useClaimInheritance, type InheritanceEntry } from '../lib/contracts/hooks'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatCountdown(nextPingtime: bigint | undefined): string {
  if (!nextPingtime) return '—'
  const now = BigInt(Math.floor(Date.now() / 1000))
  if (now >= nextPingtime) return 'Claimable now'
  const diffSecs = Number(nextPingtime - now)
  const days = Math.floor(diffSecs / 86400)
  const hours = Math.floor((diffSecs % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h remaining`
  const mins = Math.floor((diffSecs % 3600) / 60)
  return `${hours}h ${mins}m remaining`
}

// ---------------------------------------------------------------------------
// InheritanceCard
// ---------------------------------------------------------------------------

function InheritanceCard({ entry }: { entry: InheritanceEntry }) {
  const { claimEth, claimToken, claimMultiple, isPending } = useClaimInheritance(entry.owner)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)

  const handleClaim = async (fn: () => Promise<unknown>, label: string) => {
    setClaimError(null)
    setClaimSuccess(null)
    try {
      await fn()
      setClaimSuccess(`${label} claimed successfully.`)
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Transaction failed.')
    }
  }

  const stateColor =
    entry.isClaimable
      ? 'bg-[#E8F5BD] text-[#3a5c1e] border-[#5B7E3C]'
      : 'bg-stone-50 text-stone-500 border-stone-200'

  return (
    <div className={`rounded-xl border-2 p-6 transition-shadow hover:shadow-md ${stateColor}`}>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60">Testator</p>
          <p className="font-mono text-sm font-medium">{formatAddress(entry.owner)}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            entry.isClaimable
              ? 'bg-[#5B7E3C] text-white'
              : 'bg-stone-200 text-stone-600'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${entry.isClaimable ? 'bg-white' : 'bg-stone-400'}`}
          />
          {entry.ritaState ?? 'Loading…'}
        </span>
      </div>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white/70 p-3">
          <p className="text-xs text-stone-500">ETH Balance</p>
          <p className="mt-0.5 font-semibold">{Number(entry.ethBalance).toFixed(4)} ETH</p>
        </div>
        <div className="rounded-lg bg-white/70 p-3">
          <p className="text-xs text-stone-500">Tracked Tokens</p>
          <p className="mt-0.5 font-semibold">{entry.supportedTokens.length}</p>
        </div>
        <div className="col-span-2 rounded-lg bg-white/70 p-3 sm:col-span-1">
          <p className="text-xs text-stone-500">Claim Window</p>
          <p className="mt-0.5 text-sm font-semibold">{formatCountdown(entry.nextPingtime)}</p>
        </div>
      </div>

      {/* Claim actions */}
      {entry.isClaimable ? (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={isPending}
            onClick={() => handleClaim(claimEth, 'ETH')}
            className="rounded-lg bg-[#5B7E3C] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? 'Claiming…' : 'Claim ETH'}
          </button>

          {entry.supportedTokens.length > 0 && (
            <>
              {entry.supportedTokens.slice(0, 2).map((token) => (
                <button
                  key={token}
                  disabled={isPending}
                  onClick={() => handleClaim(() => claimToken(token), `Token ${formatAddress(token)}`)}
                  className="rounded-lg border border-[#5B7E3C] px-4 py-2 text-sm font-semibold text-[#5B7E3C] transition hover:bg-[#5B7E3C]/10 disabled:opacity-60"
                >
                  Claim {formatAddress(token)}
                </button>
              ))}
              {entry.supportedTokens.length > 1 && (
                <button
                  disabled={isPending}
                  onClick={() => handleClaim(() => claimMultiple(entry.supportedTokens), 'All tokens')}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 disabled:opacity-60"
                >
                  Claim all tokens
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          The testator's account is still active. You'll be able to claim once the inactivity
          threshold is reached.
        </p>
      )}

      {/* Feedback */}
      {claimSuccess && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{claimSuccess}</p>
      )}
      {claimError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{claimError}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function NoInheritanceFallback() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-white py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
        {/* Inbox icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-stone-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-semibold text-stone-700">No inheritances found</h3>
      <p className="max-w-sm text-sm text-stone-500">
        This wallet hasn't been registered as an heir on any Rita will. If you believe this is a
        mistake, ask the testator to add your address as a beneficiary.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border-2 border-stone-100 bg-stone-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-stone-200" />
            <div className="h-6 w-20 rounded-full bg-stone-200" />
          </div>
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-14 rounded-lg bg-stone-200" />
            ))}
          </div>
          <div className="h-9 w-28 rounded-lg bg-stone-200" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const { address, isConnected } = useAccount()
  const { inheritances, isLoading, hasInheritance } = useInheritances()

  return (
    <AppShell>
      <div className="mx-auto max-w-[900px] space-y-6 p-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-stone-800">My Inheritances</h1>
          {isConnected && address && (
            <p className="mt-1 font-mono text-sm text-stone-500">{formatAddress(address)}</p>
          )}
        </div>

        {/* Content */}
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-white py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="mb-1 text-lg font-semibold text-stone-700">Connect your wallet</h3>
            <p className="max-w-sm text-sm text-stone-500">
              Connect your wallet to check if you have any inheritances waiting for you.
            </p>
          </div>
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : hasInheritance ? (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">
              {inheritances.length} inheritance{inheritances.length !== 1 ? 's' : ''} found for
              this wallet.
            </p>
            {inheritances.map((entry) => (
              <InheritanceCard key={entry.owner} entry={entry} />
            ))}
          </div>
        ) : (
          <NoInheritanceFallback />
        )}
      </div>
    </AppShell>
  )
}
