import type { PropsWithChildren } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useAccount, useDisconnect } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/my-will', label: 'My Will' },
  { to: '/app/guardians', label: 'Guardians' },
  { to: '/app/pulse', label: 'Pulse' },
  { to: '/app/assets', label: 'Assets' },
  { to: '/app/settings', label: 'Settings' },
] as const

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit()

  return (
    <div className="min-h-screen bg-[#F9FBF2]">
      <aside className="fixed left-0 top-0 z-40 flex h-full w-[260px] flex-col border-r border-stone-800 bg-stone-900 py-6">
        <div className="mb-6 px-6">
          <h1 className="text-xl font-bold text-white">Rita Protocol</h1>
          <p className="text-xs text-stone-400">Beneficiary Portal</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block rounded-lg px-4 py-3 text-sm transition ${
                  active ? 'bg-stone-800 text-lime-500' : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4">
          {isConnected ? (
            <button className="w-full rounded-lg bg-stone-800 px-4 py-3 text-sm text-white hover:bg-stone-700 transition" onClick={() => disconnect()}>
              Disconnect
            </button>
          ) : (
            <button
              className="w-full rounded-lg bg-stone-800 px-4 py-3 text-sm text-white hover:bg-stone-700 transition"
              onClick={() => open()}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </aside>
      <header className="fixed right-0 top-0 z-30 flex h-16 w-[calc(100%-260px)] items-center justify-end border-b border-stone-200 bg-[#F9FBF2] px-8">
        <span className="rounded-full border border-stone-200 bg-white px-4 py-1 text-xs">
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
        </span>
      </header>
      <main className="ml-[260px] min-h-screen pt-16">{children}</main>
    </div>
  )
}
