import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAccount, useSendTransaction, useWalletClient, useSwitchChain, usePublicClient } from 'wagmi'
import { encodeFunctionData } from 'viem'
import { ritaDelegateAbi } from '../lib/contracts/abi'
import { CONTRACTS, CHAIN_ID } from '../lib/contracts/config'

// Project default constants for initialization
const DEFAULT_THRESHOLD = 1n
const DEFAULT_CORE_STABLES: `0x${string}`[] = []

export function OnboardingUpgradePage() {
  const navigate = useNavigate()
  const { isConnected, address, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { sendTransactionAsync } = useSendTransaction()
  const { switchChainAsync } = useSwitchChain()
  const publicClient = usePublicClient()
  
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'switching' | 'authorizing' | 'executing'>('idle')

  const onUpgrade = async () => {
    if (!walletClient || !address || !publicClient) return

    try {
      setIsUpgrading(true)
      setError(null)

      // 1. Ensure correct network
      if (chainId !== CHAIN_ID) {
        setStep('switching')
        await switchChainAsync({ chainId: CHAIN_ID })
      }

      setStep('executing')

      // Fetch the current nonce for the authority (the user's address)
      const nonce = await publicClient.getTransactionCount({ address })

      // 2. Prepare Initialize call data
      const initData = encodeFunctionData({
        abi: ritaDelegateAbi,
        functionName: 'initialize',
        args: [[address], DEFAULT_THRESHOLD, DEFAULT_CORE_STABLES],
      })

      // 3. Send Transaction with Authorization intent + Initialize call
      // By passing the authorization object directly in the list, 
      // we let the wallet handle the signing if it supports type 0x04.
      const hash = await sendTransactionAsync({
        to: address, 
        data: initData,
        authorizationList: [{
          contractAddress: CONTRACTS.ritaDelegate,
          chainId: CHAIN_ID,
          nonce,
        }],
      } as any)

      console.log('Upgrade transaction sent:', hash)
      
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

  const isWrongChain = isConnected && chainId !== CHAIN_ID

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-2xl font-semibold">Upgrade to Smart Account</h2>
        <p className="mb-6 text-[#43493d]">Transform your wallet into a modular Rita account on Lisk Sepolia.</p>
        
        {!isConnected ? (
          <div className="mb-6 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
            Wallet not connected. Go back and connect your wallet first.
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            <div className="rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-3 text-sm text-[#43493d]">
              <span className="font-medium">Connected wallet:</span> {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            {isWrongChain && (
              <div className="rounded-lg border border-[#fff2cc] bg-[#fffcf0] p-3 text-sm text-[#856404]">
                Please switch to Lisk Sepolia (Chain ID: 4202) to continue.
              </div>
            )}
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
          disabled={isUpgrading || !isConnected}
          onClick={onUpgrade}
        >
          {isUpgrading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {step === 'switching' && 'Switching Network...'}
              {step === 'authorizing' && 'Authorizing Upgrade...'}
              {step === 'executing' && 'Executing Transaction...'}
            </span>
          ) : isWrongChain ? (
            'Switch Network & Upgrade'
          ) : (
            'Sign & Upgrade'
          )}
        </button>
        
        {error ? (
          <div className="mt-4 rounded-lg border border-[#ffd8d8] bg-[#fff4f4] p-3 text-sm text-[#a00010]">
            {error}
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
