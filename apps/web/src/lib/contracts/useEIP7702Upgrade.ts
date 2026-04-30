import { useWallets, usePrivy, getEmbeddedConnectedWallet } from '@privy-io/react-auth'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { CONTRACTS } from './config'

export function useEIP7702Upgrade() {
  const { user, sendTransaction } = usePrivy()
  const { wallets } = useWallets()
  const wallet = getEmbeddedConnectedWallet(wallets)

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  })

  /**
   * Check if the connected EOA already has an EIP-7702 delegation.
   * Verifies it points to the correct Rita delegate contract.
   */
  const checkIsDelegated = async () => {
    if (!wallet?.address || !publicClient) return false
    const code = await publicClient.getCode({ address: wallet.address as `0x${string}` })
    if (!code || !code.startsWith('0xef0100')) return false

    // Verify delegation points to OUR contract (0xef0100 + 20-byte address)
    const delegateAddr = ('0x' + code.slice(8)).toLowerCase()
    return delegateAddr === CONTRACTS.ritaDelegate.toLowerCase()
  }

  /**
   * Perform the EIP-7702 account upgrade with Privy's embedded wallet.
   * 
   * Privy's embedded wallet natively supports EIP-7702 Type 4 transactions
   * and automatically handles authorization signing.
   */
  const upgrade = async () => {
    if (!wallet?.address || !user || !publicClient) throw new Error('Missing wallet or account')

    const address = wallet.address as `0x${string}`
    const currentNonce = await publicClient.getTransactionCount({ address })

    // Send transaction to the DELEGATED CONTRACT with EIP-7702 authorization
    // The authorization makes the EOA delegate to this contract
    // EIP-7702 needs higher gas for authorization data
    let estimatedGas = 100000n // Base estimate for empty call + authorization overhead
    try {
      const gas = await publicClient.estimateGas({
        to: CONTRACTS.ritaDelegate,
        data: '0x',
        account: address,
      })
      estimatedGas = BigInt(Math.ceil(Number(gas) * 1.2)) // Add 20% buffer
    } catch (err) {
      console.warn('Gas estimation failed, using default:', err)
    }

    const { transactionHash: hash } = await sendTransaction({
      to: CONTRACTS.ritaDelegate,
      gas: estimatedGas,
      authorizationList: [{
        chainId: sepolia.id,
        contractAddress: CONTRACTS.ritaDelegate,
        nonce: 0,
      }],
      data: '0x',
      value: 0n,
    } as any)
    
    console.log('Upgrade tx hash:', hash)

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` })
    console.log('Upgrade receipt:', receipt)

    if (receipt.status === 'reverted') {
      throw new Error('EIP-7702 upgrade transaction reverted on-chain')
    }

    // Verify delegation actually landed on the account
    const code = await publicClient.getCode({ address })
    console.log('Account code after upgrade:', code)

    if (!code || !code.startsWith('0xef0100')) {
      throw new Error(
        'Delegation did not apply. The account still has no delegate code. ' +
        'This may indicate a wallet or RPC incompatibility with EIP-7702.'
      )
    }

    return { hash, receipt, code }
  }

  return { upgrade, checkIsDelegated }
}
