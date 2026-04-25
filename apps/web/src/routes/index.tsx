import { createFileRoute } from '@tanstack/router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-rita-purple mb-4">Rita Inheritance</h1>
      <p className="text-gray-400 mb-8">Secure your digital legacy with modular accounts.</p>
      
      <button className="bg-rita-purple hover:bg-purple-600 px-6 py-3 rounded-lg font-bold transition-all">
        Upgrade to Smart Account (EIP-7702)
      </button>
    </div>
  )
}