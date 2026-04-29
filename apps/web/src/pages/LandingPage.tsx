import { Link } from '@tanstack/react-router'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F9FBF2]">
      <nav className="fixed top-0 z-50 w-full border-b border-[#E8F5BD] bg-[#F9FBF2]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <div className="text-xl font-bold text-[#5B7E3C]">Rita Protocol</div>
          <Link to="/onboarding/connect" className="rounded-lg bg-[#5B7E3C] px-5 py-2.5 text-sm font-semibold text-white">
            Launch App
          </Link>
        </div>
      </nav>
      <main className="mx-auto grid max-w-[1200px] gap-8 px-6 pb-16 pt-32 md:grid-cols-2">
        <div>
          <h1 className="mb-6 text-5xl font-semibold text-[#1a1c1f]">
            Rita moves the authority of your account.
          </h1>
          <p className="mb-8 text-lg text-[#43493d]">
            Modular inheritance flow for seamless transfer when your pulse expires.
          </p>
          <Link to="/onboarding/connect" className="rounded-lg bg-[#5B7E3C] px-8 py-4 font-semibold text-white">
            Upgrade my wallet
          </Link>
        </div>
        <div className="rounded-2xl border border-[#E8F5BD] bg-white p-8">
          <h2 className="mb-3 text-2xl font-semibold text-[#5B7E3C]">Programmable Legacies</h2>
          <p className="text-[#43493d]">Zero maintenance, modular permissions, full asset coverage.</p>
        </div>
      </main>
    </div>
  )
}
