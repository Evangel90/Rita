import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { isAddress } from 'viem'
import { AppShell } from '../components/layout/AppShell'
import { useRitaActions, useRitaDashboardData, useIsDelegated } from '../lib/contracts/hooks'

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatCountdown(nextPingtime: bigint | undefined, nowSeconds: number): string {
  if (!nextPingtime) return '—'
  const now = BigInt(nowSeconds)
  if (now >= nextPingtime) return 'Claimable now'
  const diffSecs = Number(nextPingtime - now)
  const days = Math.floor(diffSecs / 86400)
  const hours = Math.floor((diffSecs % 86400) / 3600)
  const mins = Math.floor((diffSecs % 3600) / 60)
  const secs = diffSecs % 60

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`)
  parts.push(`${secs}s`)

  return parts.join(' ') + ' remaining'
}

export function MyWillPage() {
  const navigate = useNavigate()
  const data = useRitaDashboardData()
  const actions = useRitaActions()
  const { isDelegated, isLoading: delegationLoading } = useIsDelegated()
  const [thresholdValue, setThresholdValue] = useState(180)
  const [thresholdUnit, setThresholdUnit] = useState<'days' | 'hours' | 'minutes'>('days')
  const [heir, setHeir] = useState('')
  const [token, setToken] = useState('')
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Sync with on-chain threshold once loaded
  useEffect(() => {
    if (data.threshold) {
      const seconds = Number(data.threshold)
      if (seconds % 86400 === 0) {
        setThresholdValue(seconds / 86400)
        setThresholdUnit('days')
      } else if (seconds % 3600 === 0) {
        setThresholdValue(seconds / 3600)
        setThresholdUnit('hours')
      } else {
        setThresholdValue(seconds / 60)
        setThresholdUnit('minutes')
      }
    }
  }, [data.threshold])

  const onUpdateThreshold = async () => {
    let seconds = 0
    if (thresholdUnit === 'days') seconds = Math.floor(thresholdValue * 86400)
    else if (thresholdUnit === 'hours') seconds = Math.floor(thresholdValue * 3600)
    else seconds = Math.floor(thresholdValue * 60)
    
    console.log('[MyWill] Updating threshold:', { thresholdValue, thresholdUnit, seconds })
    await actions.updateThreshold(BigInt(seconds))
  }

  // Redirect to initialization if delegated but not initialized
  if (isDelegated && data.isInitialized === false) {
    navigate({ to: '/app/initialize-will' })
    return null
  }

  if (delegationLoading || data.isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#5B7E3C] border-t-transparent" />
          <p className="mt-4 text-stone-500">Loading your will...</p>
        </div>
      </AppShell>
    )
  }

  if (!isDelegated) {
    return (
      <AppShell>
        <div className="mx-auto max-w-[800px] p-6 py-20 text-center">
          <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-12">
            <h2 className="text-3xl font-bold text-stone-800">Delegation Required</h2>
            <p className="mx-auto mt-4 max-w-md text-stone-600">
              To create and manage your Smart Will, you first need to delegate your account 
              to the Rita Smart Account protocol via EIP-7702.
            </p>
            <button
              onClick={() => navigate({ to: '/app/upgrade' })}
              className="mt-8 rounded-xl bg-[#5B7E3C] px-10 py-4 font-bold text-white shadow-lg shadow-[#5B7E3C]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Delegate Now
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  const onAddHeir = async () => {
    if (!isAddress(heir)) return
    if (!isDelegated) {
      navigate({ to: '/app/upgrade' })
      return
    }
    await actions.addHeir(heir as `0x${string}`)
    await actions.registerHeir(heir as `0x${string}`)
  }

  const onRemoveHeir = async () => {
    if (!isAddress(heir)) return
    await actions.removeHeir(heir as `0x${string}`)
    await actions.deregisterHeir(heir as `0x${string}`)
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 p-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Current Will Configuration Summary */}
          <div className="rounded-xl border border-[#E8F5BD] bg-[#F9FDF4] p-8">
            <h2 className="text-2xl font-bold text-stone-800">Active Will Details</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${data.ritaState === 'ACTIVE' ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <p className="font-semibold text-stone-700">{data.ritaState ?? 'Unknown'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Next Pulse Due</p>
                <p className="mt-1 font-semibold text-stone-700">{formatCountdown(data.nextPing, now)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Inactivity Threshold</p>
                <p className="mt-1 font-semibold text-stone-700">{data.threshold ? Number(data.threshold / 86400n) : '—'} days</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Beneficiaries</p>
                <div className="mt-1 space-y-1">
                  {data.heirs.length > 0 ? (
                    data.heirs.map(h => (
                      <p key={h} className="font-mono text-xs text-stone-600">{formatAddress(h)}</p>
                    ))
                  ) : (
                    <p className="text-sm text-stone-400 italic">No beneficiaries configured</p>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tracked Assets</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-md bg-white border border-stone-200 px-2 py-1 font-mono text-xs text-stone-600">
                    ETH (Native)
                  </span>
                  {data.supportedTokens.map(t => (
                    <span key={t} className="rounded-md bg-white border border-stone-200 px-2 py-1 font-mono text-xs text-stone-600">
                      {formatAddress(t)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 border-t border-[#E8F5BD] pt-6">
              <button 
                onClick={() => actions.ping()}
                className="rounded-xl bg-[#5B7E3C] px-6 py-3 font-bold text-white shadow-lg shadow-[#5B7E3C]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Send Pulse (I am alive)
              </button>
              <p className="mt-2 text-xs text-stone-400">Sending a pulse resets the inactivity timer.</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E8F5BD] bg-white p-8">
            <h3 className="mb-2 text-xl font-semibold text-stone-800">Adjust Pulse Interval</h3>
            <p className="mb-6 text-sm text-stone-500">How long should we wait before your assets become claimable by beneficiaries?</p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={thresholdUnit === 'days' ? 0.0007 : thresholdUnit === 'hours' ? 0.0167 : 1}
                max={thresholdUnit === 'days' ? 365 : thresholdUnit === 'hours' ? 8760 : 525600}
                value={thresholdValue}
                onChange={(e) => setThresholdValue(Number(e.target.value))}
                className="w-32 rounded-lg border border-stone-200 p-3 text-lg font-bold text-[#5B7E3C] focus:border-[#5B7E3C] focus:outline-none focus:ring-1 focus:ring-[#5B7E3C]"
              />
              <select
                value={thresholdUnit}
                onChange={(e) => setThresholdUnit(e.target.value as 'days' | 'hours' | 'minutes')}
                className="rounded-lg border border-stone-200 bg-white p-3 font-semibold text-stone-600 focus:border-[#5B7E3C] focus:outline-none"
              >
                <option value="days">Days</option>
                <option value="hours">Hours</option>
                <option value="minutes">Minutes</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-stone-400">
              Min: 1 minute | Max: 365 days
            </p>
            <button 
              className="mt-6 w-full rounded-xl bg-[#5B7E3C] py-3 font-bold text-white transition-all hover:opacity-90 sm:w-auto sm:px-8 disabled:opacity-60" 
              onClick={onUpdateThreshold}
            >
              Update Threshold
            </button>
          </div>

          <div className="rounded-xl border border-[#E8F5BD] bg-white p-8">
            <h3 className="mb-2 text-xl font-semibold text-stone-800">Beneficiary Management</h3>
            <p className="mb-6 text-sm text-stone-500">Add or remove wallets that can claim your assets after the threshold.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={heir}
                onChange={(e) => setHeir(e.target.value)}
                placeholder="0x..."
                className="flex-1 rounded-lg border border-stone-200 p-3 font-mono text-sm focus:border-[#5B7E3C] focus:outline-none focus:ring-1 focus:ring-[#5B7E3C]"
              />
              <div className="flex gap-2">
                <button 
                  className="flex-1 rounded-lg bg-[#5B7E3C] px-6 py-3 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 sm:flex-none" 
                  disabled={!isAddress(heir)} 
                  onClick={onAddHeir}
                >
                  Add
                </button>
                <button 
                  className="flex-1 rounded-lg border border-stone-200 px-6 py-3 font-bold text-stone-600 transition-all hover:bg-stone-50 disabled:opacity-50 sm:flex-none" 
                  disabled={!isAddress(heir)} 
                  onClick={onRemoveHeir}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E8F5BD] bg-white p-8">
            <h3 className="mb-2 text-xl font-semibold text-stone-800">Token Permissions</h3>
            <p className="mb-6 text-sm text-stone-500">By default, only ETH is claimable. Add ERC-20 token addresses you want to include.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Token address (0x...)"
                className="flex-1 rounded-lg border border-stone-200 p-3 font-mono text-sm focus:border-[#5B7E3C] focus:outline-none focus:ring-1 focus:ring-[#5B7E3C]"
              />
              <div className="flex gap-2">
                <button 
                  className="flex-1 rounded-lg bg-[#5B7E3C] px-6 py-3 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 sm:flex-none" 
                  disabled={!isAddress(token)} 
                  onClick={() => actions.addToken(token as `0x${string}`)}
                >
                  Enable
                </button>
                <button 
                  className="flex-1 rounded-lg border border-stone-200 px-6 py-3 font-bold text-stone-600 transition-all hover:bg-stone-50 disabled:opacity-50 sm:flex-none" 
                  disabled={!isAddress(token)} 
                  onClick={() => actions.removeToken(token as `0x${string}`)}
                >
                  Disable
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-xl border border-[#E8F5BD] bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#5B7E3C]">Protocol Status</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-stone-500">Smart Account</p>
                <p className="font-mono text-sm font-medium text-stone-700">{data.isInitialized ? 'Active (Rita Protocol)' : 'Not Initialized'}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Total Heirs</p>
                <p className="text-sm font-medium text-stone-700">{data.heirs.length}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Tracked Tokens</p>
                <p className="text-sm font-medium text-stone-700">{data.supportedTokens.length + 1}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-6">
            <h4 className="mb-2 text-sm font-semibold text-stone-800">Pro-Tip</h4>
            <p className="text-xs leading-relaxed text-stone-500">
              The "Pulse" action is your way of telling the blockchain you're still active. 
              We recommend pulsing at least once every few months to avoid accidental inheritance triggers.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
