import { AppShell } from '../components/layout/AppShell'

export function PlaceholderPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1200px] p-6">
        <div className="rounded-xl border border-[#E8F5BD] bg-white p-8">
          <h1 className="mb-2 text-3xl font-semibold">{title}</h1>
          <p className="text-[#43493d]">{subtitle}</p>
        </div>
      </div>
    </AppShell>
  )
}
