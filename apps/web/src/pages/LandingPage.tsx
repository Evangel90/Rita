import { useNavigate } from '@tanstack/react-router'
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useEffect } from 'react'

export function LandingPage() {
  const { isConnected } = useAccount()
  const { open } = useAppKit()
  const navigate = useNavigate()

  useEffect(() => {
    if (isConnected) {
      navigate({ to: '/app/dashboard' })
    }
  }, [isConnected, navigate])

  const handleConnect = async () => {
    if (isConnected) {
      navigate({ to: '/app/dashboard' })
    } else {
      await open()
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FBF2] text-[#1a1c1f]">
      <nav className="fixed top-0 z-50 w-full border-b border-[#E8F5BD] bg-[#F9FBF2]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-2 text-xl font-bold text-[#5B7E3C]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5BD] text-sm">S</span>
            Rita Protocol
          </div>
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a className="border-b-2 border-[#5B7E3C] pb-1 text-[#5B7E3C]" href="#how-it-works">
              How it works
            </a>
            <a className="transition-colors duration-200 hover:text-[#5B7E3C]" href="#">
              Docs
            </a>
          </div>
          <button
            onClick={handleConnect}
            className="rounded-lg bg-[#5B7E3C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 cursor-pointer"
          >
            {isConnected ? 'Go to App' : 'Connect'}
          </button>
        </div>
      </nav>

      <main
        className="overflow-hidden pb-24 pt-32"
        style={{
          backgroundImage: 'radial-gradient(#E8F5BD 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        <div className="mx-auto grid max-w-[1200px] items-center gap-16 px-6 md:grid-cols-2">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E8F5BD] bg-[#E8F5BD]/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#5B7E3C]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5B7E3C]" />
              Secured by Ethereum
            </div>
            <h1 className="mb-8 text-[44px] font-semibold leading-[1.1] tracking-tight text-[#1a1c1f] md:text-[56px]">
              Rita does not move your money into a vault, it moves the <span className="text-[#5B7E3C]">authority</span> of your
              account.
            </h1>
            <p className="mb-10 max-w-lg text-lg text-[#43493d]">
              The first modular inheritance protocol that enables seamless generational wealth transfer without sacrificing custody
              or liquidity.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <button
                onClick={handleConnect}
                className="w-full rounded-lg bg-[#5B7E3C] px-8 py-4 text-center text-lg font-semibold text-white shadow-lg shadow-[#5B7E3C]/10 transition-all hover:opacity-90 active:scale-95 sm:w-auto cursor-pointer"
              >
                {isConnected ? 'Launch App' : 'Connect Wallet'}
              </button>
              <a className="font-semibold text-[#5B7E3C] transition-colors hover:text-[#436526]" href="#how-it-works">
                How it works →
              </a>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div
              className="relative flex h-[400px] w-[400px] items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(162, 203, 139, 0.15) 0%, rgba(232, 245, 189, 0) 70%)',
              }}
            >
              <div className="absolute inset-0 rounded-full border border-[#a2cb8b]/40" />
              <div className="absolute inset-0 scale-[1.3] rounded-full border border-[#a2cb8b]/30" />
              <div className="absolute inset-0 scale-[1.6] rounded-full border border-[#a2cb8b]/20" />
              <div className="relative z-10 flex h-32 w-32 items-center justify-center rounded-2xl border border-[#E8F5BD] bg-white text-5xl shadow-xl shadow-[#5B7E3C]/10">
                ❤
              </div>
            </div>

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute right-12 top-12 flex items-center gap-3 rounded-xl border border-[#E8F5BD] bg-white p-4 shadow-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c4efab] text-[#446832]">K</div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#43493d]">Protocol Status</p>
                  <p className="text-sm font-bold text-[#5B7E3C]">Active Guard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section id="how-it-works" className="border-y border-[#E8F5BD] bg-white py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-16 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-xl">
              <h2 className="mb-4 text-4xl font-semibold tracking-tight text-[#5B7E3C]">Programmable Legacies</h2>
              <p className="text-[#43493d]">
                Built for institutional-grade security with consumer-grade simplicity. Rita provides infrastructure for the future
                of digital asset continuity.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded border border-[#E8F5BD] bg-[#E8F5BD]/20 px-3 py-1.5 text-sm text-[#5B7E3C]">
              {'>_'} v1.0.4-stable
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <article className="group relative overflow-hidden rounded-2xl border border-[#E8F5BD] bg-white p-8 transition-all duration-300 hover:border-[#5B7E3C]/30 hover:shadow-xl">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#E8F5BD]/20 blur-2xl transition-all group-hover:bg-[#5B7E3C]/10" />
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#c4efab] font-semibold text-[#446832]">A</div>
              <h3 className="mb-3 text-xl font-medium text-[#1a1c1f]">Zero maintenance</h3>
              <p className="leading-relaxed text-[#43493d]">
                Once set, the protocol monitors your activity automatically. No check-ins or complex vault workflows required.
              </p>
            </article>

            <article className="group relative overflow-hidden rounded-2xl border border-[#E8F5BD] bg-white p-8 transition-all duration-300 hover:border-[#5B7E3C]/30 hover:shadow-xl">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#E8F5BD]/20 blur-2xl transition-all group-hover:bg-[#5B7E3C]/10" />
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#c4efab] font-semibold text-[#446832]">M</div>
              <h3 className="mb-3 text-xl font-medium text-[#1a1c1f]">Modular &amp; extensible</h3>
              <p className="leading-relaxed text-[#43493d]">
                Plug in guardians, heirs, and recovery conditions as needed. Rita scales with your portfolio and governance model.
              </p>
            </article>

            <article className="group relative overflow-hidden rounded-2xl border border-[#E8F5BD] bg-white p-8 transition-all duration-300 hover:border-[#5B7E3C]/30 hover:shadow-xl">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#E8F5BD]/20 blur-2xl transition-all group-hover:bg-[#5B7E3C]/10" />
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#c4efab] font-semibold text-[#446832]">C</div>
              <h3 className="mb-3 text-xl font-medium text-[#1a1c1f]">100% asset coverage</h3>
              <p className="leading-relaxed text-[#43493d]">
                Secure everything in your wallet without wrapping or moving tokens. NFTs, DeFi positions, and L2 assets are
                included.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#F9FBF2] py-16">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-12 px-6 md:flex-row">
          <div className="text-center md:text-left">
            <p className="mb-2 text-xs uppercase tracking-wider text-[#43493d]">Integrated with</p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 md:justify-start">
              <div className="text-lg font-bold text-slate-500">SAFE</div>
              <div className="text-lg font-bold text-slate-500">LEDGER</div>
              <div className="text-lg font-bold text-slate-500">METAMASK</div>
              <div className="text-lg font-bold text-slate-500">COINBASE</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-[#E8F5BD] bg-[#F9FBF2]">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-6 py-12 md:flex-row">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <div className="text-lg font-black uppercase tracking-tighter text-[#5B7E3C]">Rita Protocol</div>
            <p className="text-xs uppercase tracking-wider text-slate-500">© 2024 Rita Protocol. Secured by Ethereum.</p>
          </div>
          <div className="flex gap-8">
            <a className="text-xs uppercase tracking-wider text-slate-500 transition-colors duration-300 hover:text-[#5B7E3C]" href="#">
              Privacy Policy
            </a>
            <a className="text-xs uppercase tracking-wider text-slate-500 transition-colors duration-300 hover:text-[#5B7E3C]" href="#">
              Terms of Service
            </a>
            <a className="text-xs uppercase tracking-wider text-slate-500 transition-colors duration-300 hover:text-[#5B7E3C]" href="#">
              Github
            </a>
            <a className="text-xs uppercase tracking-wider text-slate-500 transition-colors duration-300 hover:text-[#5B7E3C]" href="#">
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
