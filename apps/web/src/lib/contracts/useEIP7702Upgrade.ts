import { useAccount, useSendTransaction, usePublicClient } from 'wagmi'
import { sepolia } from 'viem/chains'
import { CONTRACTS } from './config'

export function useEIP7702Upgrade() {
  const { address } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()
  const publicClient = usePublicClient()

  /**
   * Check if the connected EOA already has an EIP-7702 delegation.
   * Verifies it points to the correct Rita delegate contract.
   */
  const checkIsDelegated = async () => {
    if (!address || !publicClient) return false
    const code = await publicClient.getCode({ address })
    if (!code || !code.startsWith('0xef0100')) return false

    // Verify delegation points to OUR contract (0xef0100 + 20-byte address)
    const delegateAddr = ('0x' + code.slice(8)).toLowerCase()
    return delegateAddr === CONTRACTS.ritaDelegate.toLowerCase()
  }

  /**
   * Perform the EIP-7702 account upgrade.
   *
   * Note: EIP-7702 support depends on the wallet. Most wallets don't support
   * EIP-7702 natively yet. This implementation attempts to send the transaction
   * but may fail if the wallet doesn't support EIP-7702 authorization.
   */
  const upgrade = async () => {
    if (!address || !publicClient) throw new Error('Missing wallet or account')

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

    const hash = await sendTransactionAsync({
      to: CONTRACTS.ritaDelegate,
      gas: estimatedGas,
      authorizationList: [{
        chainId: sepolia.id,
        contractAddress: CONTRACTS.ritaDelegate,
        nonce: 0,
      }],
      data: '0x',
      value: 0n,
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    console.log('Upgrade tx hash:', hash);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
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
