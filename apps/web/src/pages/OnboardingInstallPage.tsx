import { Link } from '@tanstack/react-router'

export function OnboardingInstallPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#E8F5BD] bg-white p-8 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#5B7E3C]">Step 3 of 3</p>
        <h1 className="mb-2 text-3xl font-semibold">Module Installed Successfully</h1>
        <p className="mb-8 text-[#43493d]">ERC-7579 inheritance module is now active.</p>
        <Link to="/app/dashboard" className="inline-flex rounded-lg bg-[#5B7E3C] px-6 py-3 font-semibold text-white">
          Go to Dashboard
        </Link>
      </div>
    </main>
  )
}
