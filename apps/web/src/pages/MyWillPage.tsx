import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { isAddress } from 'viem'
import { AppShell } from '../components/layout/AppShell'
import { useRitaActions, useRitaDashboardData, useIsUpgraded } from '../lib/contracts/hooks'

export function MyWillPage() {
  const navigate = useNavigate()
  const data = useRitaDashboardData()
  const actions = useRitaActions()
  const isUpgraded = useIsUpgraded()
  const [thresholdDays, setThresholdDays] = useState(180)
  const [heir, setHeir] = useState('')
  const [token, setToken] = useState('')

  const onAddHeir = async () => {
    if (!isAddress(heir)) return
    if (!isUpgraded) {
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
          <div className="rounded-xl border border-[#E8F5BD] bg-white p-8">
            <h3 className="mb-2 text-xl font-semibold">Pulse Interval</h3>
            <input
              type="range"
              min={7}
              max={365}
              value={thresholdDays}
              onChange={(e) => setThresholdDays(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-2 text-sm text-[#43493d]">{thresholdDays} days</p>
            <button className="mt-4 rounded-lg bg-[#5B7E3C] px-4 py-2 text-white" onClick={() => actions.updateThreshold(BigInt(thresholdDays * 86400))}>
              Save threshold
            </button>
          </div>

          <div className="rounded-xl border border-[#E8F5BD] bg-white p-8">
            <h3 className="mb-2 text-xl font-semibold">Beneficiary Management</h3>
            <input
              value={heir}
              onChange={(e) => setHeir(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-stone-300 p-3 font-mono"
            />
            <div className="mt-4 flex gap-3">
              <button className="rounded-lg bg-[#5B7E3C] px-4 py-2 text-white" disabled={!isAddress(heir)} onClick={onAddHeir}>
                Add heir
              </button>
              <button className="rounded-lg border border-stone-300 px-4 py-2" disabled={!isAddress(heir)} onClick={onRemoveHeir}>
                Remove heir
              </button>
            </div>
            <p className="mt-3 text-sm text-[#43493d]">Current heirs: {data.heirs.length}</p>
          </div>

          <div className="rounded-xl border border-[#E8F5BD] bg-white p-8">
            <h3 className="mb-2 text-xl font-semibold">Token Permissions</h3>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token address"
              className="w-full rounded-lg border border-stone-300 p-3 font-mono"
            />
            <div className="mt-4 flex gap-3">
              <button className="rounded-lg bg-[#5B7E3C] px-4 py-2 text-white" disabled={!isAddress(token)} onClick={() => actions.addToken(token as `0x${string}`)}>
                Add token
              </button>
              <button className="rounded-lg border border-stone-300 px-4 py-2" disabled={!isAddress(token)} onClick={() => actions.removeToken(token as `0x${string}`)}>
                Remove token
              </button>
            </div>
          </div>
        </div>

        {/* <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-xl border border-[#E8F5BD] bg-white p-6">
            <h4 className="mb-3 text-sm font-semibold uppercase text-[#5B7E3C]">Status Overview</h4>
            <p className="text-sm">Protocol state: {data.ritaState ?? 'Loading...'}</p>
            <p className="text-sm">Configured threshold: {data.threshold ? Number(data.threshold / 86400n) : '-'} days</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h4 className="mb-2 text-lg font-semibold text-red-700">Critical Action Area</h4>
            <p className="mb-4 text-sm text-red-600">Revoke module is unavailable in this contract ABI version.</p>
            <button className="w-full cursor-not-allowed rounded-lg bg-red-300 py-3 text-white" disabled>
              Revoke Module (Unavailable)
            </button>
          </div>
        </aside> */}
      </div>
    </AppShell>
  )
}
