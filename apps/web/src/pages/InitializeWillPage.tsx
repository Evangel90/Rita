import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { isAddress } from 'viem'
import { AppShell } from '../components/layout/AppShell'
import { useRitaActions, useRitaDashboardData, useIsDelegated } from '../lib/contracts/hooks'

export function InitializeWillPage() {
  const navigate = useNavigate()
  const data = useRitaDashboardData()
  const actions = useRitaActions()
  const { isDelegated, isLoading: delegationLoading } = useIsDelegated()

  const [heirs, setHeirs] = useState<string[]>([''])
  const [thresholdValue, setThresholdValue] = useState(180)
  const [thresholdUnit, setThresholdUnit] = useState<'days' | 'hours'>('days')
  const [coreTokens, setCoreTokens] = useState<string[]>([''])
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  const handleAddHeir = () => setHeirs([...heirs, ''])
  const handleRemoveHeir = (index: number) => setHeirs(heirs.filter((_, i) => i !== index))
  const handleHeirChange = (index: number, value: string) => {
    const newHeirs = [...heirs]
    newHeirs[index] = value
    setHeirs(newHeirs)
  }

  const handleAddToken = () => setCoreTokens([...coreTokens, ''])
  const handleRemoveToken = (index: number) => setCoreTokens(coreTokens.filter((_, i) => i !== index))
  const handleTokenChange = (index: number, value: string) => {
    const newTokens = [...coreTokens]
    newTokens[index] = value
    setCoreTokens(newTokens)
  }

  const onInitialize = async () => {
    setError(null)
    
    // Validation
    const validHeirs = heirs.filter(h => isAddress(h)) as `0x${string}`[]
    if (validHeirs.length === 0) {
      setError('At least one valid heir address is required.')
      return
    }

    const validTokens = coreTokens.filter(t => isAddress(t)) as `0x${string}`[]

    try {
      setIsInitializing(true)
      const thresholdSeconds = BigInt(
        thresholdUnit === 'days' 
          ? Math.floor(thresholdValue * 86400) 
          : Math.floor(thresholdValue * 3600)
      )
      
      console.log('Initializing with:', { validHeirs, thresholdSeconds, validTokens })
      
      // 1. Initialize the smart account
      await actions.initialize(validHeirs, thresholdSeconds, validTokens)
      
      // 2. Register heirs in the global registry
      for (const heir of validHeirs) {
        await actions.registerHeir(heir)
      }

      await navigate({ to: '/app/my-will' })
    } catch (err) {
      console.error('Initialization failed:', err)
      setError(err instanceof Error ? err.message : 'Initialization failed. Please try again.')
    } finally {
      setIsInitializing(false)
    }
  }

  const isLoading = delegationLoading || data.isLoading

  // Only show the fallback if we are SURE it is not delegated and not loading
  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold">Checking Delegation Status...</h2>
          <p className="mt-2 text-stone-500">Verifying your Rita Smart Account on the blockchain.</p>
          <div className="mt-6 h-8 w-8 animate-spin rounded-full border-4 border-[#5B7E3C] border-t-transparent mx-auto" />
        </div>
      </AppShell>
    )
  }

  if (isDelegated === false) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold">Account Not Delegated</h2>
          <p className="mt-2 text-stone-500">You need to delegate your EOA to a Rita Smart Account first via EIP-7702.</p>
          <button 
            onClick={() => navigate({ to: '/app/upgrade' })}
            className="mt-6 rounded-lg bg-[#5B7E3C] px-8 py-3 font-semibold text-white"
          >
            Go to Delegation
          </button>
        </div>
      </AppShell>
    )
  }

  if (data.isInitialized) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold">Will Already Initialized</h2>
          <p className="mt-2 text-stone-500">Your smart will is already active. You can manage it from the settings page.</p>
          <button 
            onClick={() => navigate({ to: '/app/my-will' })}
            className="mt-6 rounded-lg bg-[#5B7E3C] px-8 py-3 font-semibold text-white"
          >
            Manage My Will
          </button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800">Initialize Your Smart Will</h1>
          <p className="mt-2 text-stone-600">
            Set up the core parameters of your inheritance protocol. These settings ensure your assets 
            are protected and properly transferred when the time comes.
          </p>
        </header>

        <div className="space-y-8">
          {/* Heirs Section */}
          <section className="rounded-xl border border-[#E8F5BD] bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-stone-800 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5BD] text-xs text-[#5B7E3C]">1</span>
              Designate Beneficiaries
            </h2>
            <p className="mb-6 text-sm text-stone-500">
              Add the wallet addresses of the people or entities you want to inherit your authority.
            </p>
            <div className="space-y-3">
              {heirs.map((h, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={h}
                    onChange={(e) => handleHeirChange(index, e.target.value)}
                    placeholder="0x..."
                    className={`flex-1 rounded-lg border p-3 font-mono text-sm ${
                      h && !isAddress(h) ? 'border-red-300 bg-red-50' : 'border-stone-200'
                    }`}
                  />
                  {heirs.length > 1 && (
                    <button 
                      onClick={() => handleRemoveHeir(index)}
                      className="rounded-lg border border-stone-200 px-3 text-stone-400 hover:bg-stone-50"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={handleAddHeir}
              className="mt-4 text-sm font-semibold text-[#5B7E3C] hover:underline"
            >
              + Add another heir
            </button>
          </section>

          {/* Threshold Section */}
          {/* Threshold Section */}
          <section className="rounded-xl border border-[#E8F5BD] bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-stone-800 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5BD] text-xs text-[#5B7E3C]">2</span>
              Inactivity Threshold
            </h2>
            <p className="mb-6 text-sm text-stone-500">
              How long should the protocol wait without a "pulse" from you before granting access to heirs?
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={thresholdUnit === 'days' ? 0.0417 : 1}
                max={thresholdUnit === 'days' ? 365 : 8760}
                value={thresholdValue}
                onChange={(e) => setThresholdValue(Number(e.target.value))}
                className="w-32 rounded-lg border border-stone-200 p-3 text-lg font-bold text-[#5B7E3C] focus:border-[#5B7E3C] focus:outline-none focus:ring-1 focus:ring-[#5B7E3C]"
              />
              <select
                value={thresholdUnit}
                onChange={(e) => setThresholdUnit(e.target.value as 'days' | 'hours')}
                className="rounded-lg border border-stone-200 bg-white p-3 font-semibold text-stone-600 focus:border-[#5B7E3C] focus:outline-none"
              >
                <option value="days">Days</option>
                <option value="hours">Hours</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-stone-400">Min: 1 hour | Max: 365 days ({thresholdUnit === 'days' ? '365' : '8760'} {thresholdUnit})</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[30, 90, 180, 365].map(d => (
                <button 
                  key={d}
                  onClick={() => {
                    setThresholdValue(d)
                    setThresholdUnit('days')
                  }}
                  className={`rounded-lg border py-2 text-xs font-medium transition ${
                    thresholdUnit === 'days' && thresholdValue === d ? 'border-[#5B7E3C] bg-[#F9FBF2] text-[#5B7E3C]' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  {d === 365 ? '1 Year' : `${d} Days`}
                </button>
              ))}
            </div>
          </section>

          {/* Core Tokens Section */}
          <section className="rounded-xl border border-[#E8F5BD] bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-stone-800 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5BD] text-xs text-[#5B7E3C]">3</span>
              Initial Supported Tokens
            </h2>
            <p className="mb-6 text-sm text-stone-500">
              List any ERC-20 tokens you want to be immediately claimable. You can add more later.
            </p>
            <div className="space-y-3">
              {coreTokens.map((t, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={t}
                    onChange={(e) => handleTokenChange(index, e.target.value)}
                    placeholder="Token Address (0x...)"
                    className={`flex-1 rounded-lg border p-3 font-mono text-sm ${
                      t && !isAddress(t) ? 'border-red-300 bg-red-50' : 'border-stone-200'
                    }`}
                  />
                  {coreTokens.length > 1 && (
                    <button 
                      onClick={() => handleRemoveToken(index)}
                      className="rounded-lg border border-stone-200 px-3 text-stone-400 hover:bg-stone-50"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={handleAddToken}
              className="mt-4 text-sm font-semibold text-[#5B7E3C] hover:underline"
            >
              + Add another token
            </button>
          </section>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={onInitialize}
            disabled={isInitializing}
            className="w-full rounded-xl bg-[#5B7E3C] py-4 text-lg font-bold text-white shadow-lg shadow-[#5B7E3C]/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {isInitializing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Initializing Smart Will...
              </span>
            ) : (
              'Initialize Smart Will'
            )}
          </button>
          
          <p className="text-center text-xs text-stone-400">
            This action requires a blockchain transaction. You are authorizing the Rita Protocol 
            to manage inheritance for this account according to these parameters.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
