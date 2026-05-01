import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAccount, useSendTransaction, usePublicClient, useDisconnect, useConfig } from 'wagmi'
import { getConnectorClient } from '@wagmi/core'
import { useAppKit } from '@reown/appkit/react'
import { encodeFunctionData } from 'viem'
import { eip7702Actions } from 'viem/experimental'
import { sepolia } from 'viem/chains'
import { ritaDelegateAbi } from '../lib/contracts/abi'
import { CONTRACTS } from '../lib/contracts/config'

// Project default constants for initialization
const DEFAULT_THRESHOLD = 1n
const DEFAULT_CORE_STABLES: `0x${string}`[] = []

export function OnboardingUpgradePage() {
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const { open } = useAppKit()
  const { disconnect } = useDisconnect()
  const { sendTransactionAsync } = useSendTransaction()
  const publicClient = usePublicClient({ chainId: sepolia.id })
  const config = useConfig()
  
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'signing' | 'executing'>('idle')

  const onUpgrade = async () => {
    if (!address || !publicClient) return

    try {
      setIsUpgrading(true)
      setError(null)
      setStep('signing')

      // 1. Get the wallet client and extend with EIP-7702 actions
      const client = await getConnectorClient(config)
      const walletClient = (client as any).extend(eip7702Actions)

      // 2. Fetch current nonce
      const currentNonce = await publicClient.getTransactionCount({ address })

      // 3. Sign the authorization payload (Reference logic)
      let authorization
      const isMetaMask = (window as any).ethereum?.isMetaMask

      if (client.account.type === 'json-rpc') {
        console.log('Account is JSON-RPC, attempting eth_signAuthorization via RPC...')
        
        // Use MetaMask delegate if MetaMask is detected
        const delegateAddress = isMetaMask 
          ? CONTRACTS.metamaskDelegate 
          : CONTRACTS.ritaDelegate

        console.log(`Signing for ${isMetaMask ? 'MetaMask' : 'Custom'} delegate: ${delegateAddress}`)

        try {
          authorization = await walletClient.request({
            method: 'eth_signAuthorization',
            params: [{
              chainId: `0x${client.chain.id.toString(16)}`,
              address: delegateAddress,
              nonce: `0x${(currentNonce + 1).toString(16)}`,
            }]
          })
        } catch (err) {
          console.error('Wallet does not support eth_signAuthorization:', err)
          throw new Error(
            'Your wallet does not support EIP-7702 signing (eth_signAuthorization). ' +
            'Please use a compatible wallet like Reth Odyssey or a local private key account.'
          )
        }
      } else {
        authorization = await walletClient.signAuthorization({
          account: address,
          contractAddress: CONTRACTS.ritaDelegate,
          chainId: client.chain.id,
          nonce: currentNonce + 1,
        })
      }

      console.log('Authorization signed successfully:', authorization)

      // Prepare Initialize call data
      const initData = encodeFunctionData({
        abi: ritaDelegateAbi,
        functionName: 'initialize',
        args: [[address], DEFAULT_THRESHOLD, DEFAULT_CORE_STABLES],
      })

      setStep('executing')

      // 4. Send transaction to ourselves with authorization and init data
      // This applies delegation AND initializes in one step
      const hash = await sendTransactionAsync({
        to: address,
        data: initData,
        // @ts-ignore
        authorizationList: [authorization],
      } as any)

      console.log('Upgrade transaction sent:', hash)

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      
      if (receipt.status === 'reverted') {
        throw new Error('EIP-7702 upgrade transaction reverted on-chain')
      }

      // Verify delegation
      const code = await publicClient.getCode({ address })
      if (!code || !code.startsWith('0xef0100')) {
        throw new Error('Delegation did not apply to the account')
      }

      // Navigate back to my-will after success
      await navigate({ to: '/app/my-will' })
    } catch (err) {
      console.error('Upgrade failed:', err)
      const message = err instanceof Error ? err.message : 'Upgrade failed. Please try again.'
      setError(message)
      setStep('idle')
    } finally {
      setIsUpgrading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FBF2] p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#E8F5BD] bg-white p-8">
        <h2 className="mb-2 text-2xl font-semibold">Upgrade to Smart Account</h2>
        <p className="mb-6 text-[#43493d]">Transform your wallet into a modular Rita account on Sepolia.</p>
        
        {!isConnected ? (
          <div className="mb-6">
            <button
              onClick={() => open()}
              className="w-full rounded-lg bg-[#5B7E3C] py-2 font-semibold text-white transition hover:opacity-90"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            <div className="rounded-lg border border-[#E8F5BD] bg-[#F9FBF2] p-3 text-sm text-[#43493d]">
              <span className="font-medium">Connected wallet:</span> {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <button
              onClick={() => disconnect()}
              className="w-full rounded-lg border border-[#E8F5BD] bg-white py-2 font-semibold text-[#5B7E3C] transition hover:bg-[#F9FBF2]"
            >
              Disconnect
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
          disabled={isUpgrading || !isConnected}
          onClick={onUpgrade}
        >
          {isUpgrading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {step === 'signing' && 'Preparing Upgrade...'}
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
