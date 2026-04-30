import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { usePrivy, useWallets, getEmbeddedConnectedWallet } from '@privy-io/react-auth'
import { encodeFunctionData, createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { ritaDelegateAbi } from '../lib/contracts/abi'
import { CONTRACTS } from '../lib/contracts/config'

// Project default constants for initialization
const DEFAULT_THRESHOLD = 1n
const DEFAULT_CORE_STABLES: `0x${string}`[] = []

export function OnboardingUpgradePage() {
  const navigate = useNavigate()
  const { user, login, logout, sendTransaction } = usePrivy()
  const { wallets } = useWallets()
  const wallet = getEmbeddedConnectedWallet(wallets)
  
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'signing' | 'executing'>('idle')

  const onUpgrade = async () => {
    if (!wallet) return

    try {
      setIsUpgrading(true)
      setError(null)
      setStep('signing')

      const address = wallet.address as `0x${string}`
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
      })

      // Fetch the current nonce for the authority
      const nonce = await publicClient.getTransactionCount({ address })

      // Prepare Initialize call data
      const initData = encodeFunctionData({
        abi: ritaDelegateAbi,
        functionName: 'initialize',
        args: [[address], DEFAULT_THRESHOLD, DEFAULT_CORE_STABLES],
      })

      setStep('executing')

      // EIP-7702 requires calling the DELEGATED CONTRACT, not the EOA
      // The authorization makes the EOA delegate to this contract
      console.log('Sending EIP-7702 authorization...', {
        eoa: address,
        delegate: CONTRACTS.ritaDelegate,
        nonce: 0,
        chainId: sepolia.id,
      })

      // Estimate gas - EIP-7702 needs higher gas for authorization data
      let estimatedGas = 150000n // Base estimate for initialize + authorization overhead
      try {
        const gas = await publicClient.estimateGas({
          to: CONTRACTS.ritaDelegate,
          data: initData,
          account: address,
        })
        estimatedGas = BigInt(Math.ceil(Number(gas) * 1.2)) // Add 20% buffer
      } catch (err) {
        console.warn('Gas estimation failed, using default:', err)
      }

      console.log('Estimated gas:', estimatedGas.toString())

      // Send transaction to the DELEGATED CONTRACT with EIP-7702 authorization
      const { transactionHash: hash } = await sendTransaction({
        to: CONTRACTS.ritaDelegate,
        data: initData,
        account: address,
        gas: estimatedGas,
        authorizationList: [{
          chainId: sepolia.id,
          contractAddress: CONTRACTS.ritaDelegate,
          nonce: 0,
        }],
      } as any)

      console.log('Upgrade transaction sent:', hash)

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
      console.log('Transaction receipt:', { status: receipt.status, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed })
      
      if (receipt.status === 'reverted') {
        throw new Error('EIP-7702 upgrade transaction reverted on-chain')
      }

      // Verify delegation
      const code = await publicClient.getCode({ address })
      console.log('Account code after upgrade:', { address, codeLength: code?.length, codeStart: code?.slice(0, 10) })
      
      if (!code || !code.startsWith('0xef0100')) {
        throw new Error('Delegation did not apply to the account')
      }

      // Navigate to dashboard after success
      await navigate({ to: '/app/dashboard' })
    } catch (err) {
      console.error('Upgrade failed:', err)
      const message = err instanceof Error ? err.message : 'Upgrade failed. Please try again.'
      setError(message)
      setStep('idle')
    } finally {
      setIsUpgrading(false)
    }
  }

  const isConnected = !!user
  const address = wallet?.address

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-2xl font-semibold">Upgrade to Smart Account</h2>
        <p className="mb-6 text-[#43493d]">Transform your wallet into a modular Rita account on Sepolia.</p>
        
        {!isConnected ? (
          <div className="mb-6 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
            <button
              onClick={() => login()}
              className="w-full rounded-lg bg-[#5B7E3C] py-2 font-semibold text-white transition hover:opacity-90"
            >
              Connect Wallet
            </button>
          </div>
        ) : !wallet ? (
          <div className="mb-6 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
            <p className="mb-3">You are connected, but the upgrade requires Privy's embedded wallet for EIP-7702 support.</p>
            <button
              onClick={() => logout()}
              className="w-full rounded-lg bg-[#5B7E3C] py-2 font-semibold text-white transition hover:opacity-90"
            >
              Disconnect & Connect Embedded Wallet
            </button>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            <div className="rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-3 text-sm text-[#43493d]">
              <span className="font-medium">Connected wallet:</span> {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <button
              onClick={() => logout()}
              className="w-full rounded-lg border border-[#E8F5BD] bg-white py-2 font-semibold text-[#5B7E3C] transition hover:bg-[#F9FBF2]"
            >
              Disconnect & Connect Different Wallet
            </button>
          </div>
        )}

        <div className="mb-8 overflow-hidden rounded-xl border border-[#E8F5BD]">
          <div className="bg-[#F9FBF2] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#5B7E3C] border-b border-[#E8F5BD]">
            Upgrade Details
          </div>
          <div className="p-4 bg-white space-y-2 text-sm text-[#43493d]">
            <div className="flex justify-between">
              <span>Account Type</span>
              <span className="font-mono font-medium">EIP-7702 Delegated</span>
            </div>
            <div className="flex justify-between">
              <span>Delegate</span>
              <span className="font-mono text-xs">{CONTRACTS.ritaDelegate.slice(0, 10)}...{CONTRACTS.ritaDelegate.slice(-8)}</span>
            </div>
            <div className="flex justify-between border-t border-[#F9FBF2] pt-2 mt-2">
              <span>Initial Heir</span>
              <span className="font-mono text-xs">Self ({address?.slice(0, 6)}...)</span>
            </div>
          </div>
        </div>

        <button
          className="w-full rounded-lg bg-[#5B7E3C] py-4 font-semibold text-white shadow-lg shadow-[#5B7E3C]/10 transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isUpgrading || !isConnected || !wallet}
          onClick={onUpgrade}
        >
          {isUpgrading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {step === 'signing' && 'Signing Upgrade...'}
              {step === 'executing' && 'Executing Transaction...'}
            </span>
          ) : (
            'Sign & Upgrade'
          )}
        </button>
        
        {error ? (
          <div className="mt-4 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
            {error.includes('EIP-7702') && (
              <p className="mt-2 text-xs">
                <strong>Note:</strong> Privy's embedded wallet supports EIP-7702. Make sure you're using the embedded wallet login option.
              </p>
            )}
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-[#8a9282]">
          By upgrading, you enable Rita Protocol to manage your account authority for inheritance.
          This does not grant Rita access to your private keys.
        </p>
      </div>
    </main>
  )
}
