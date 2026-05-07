import { useAccount, useSendTransaction, usePublicClient, useConfig } from 'wagmi'
import { getConnectorClient } from '@wagmi/core'
import { eip7702Actions } from 'viem/experimental'
import { sepolia } from 'viem/chains'
import { CONTRACTS } from './config'

export function useEIP7702Upgrade() {
  const { address, isConnected } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()
  const publicClient = usePublicClient({ chainId: sepolia.id })
  const config = useConfig()

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
   * Follows the reference implementation from delegateEPI7702.ts
   */
  const upgrade = async () => {
    if (!address || !isConnected || !publicClient) throw new Error('Missing wallet or account')

    // 1. Get the wallet client (connector client) and extend with EIP-7702 actions
    const client = await getConnectorClient(config)
    const walletClient = (client as any).extend(eip7702Actions)

    // 2. Fetch current nonce
    const currentNonce = await publicClient.getTransactionCount({ address })

    console.log('Signing EIP-7702 authorization...', {
      account: address,
      contractAddress: CONTRACTS.ritaDelegate,
      nonce: BigInt(currentNonce) + 1n
    })

    // 3. Sign the authorization payload
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
            nonce: `0x${(BigInt(currentNonce) + 1n).toString(16)}`,
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
        nonce: BigInt(currentNonce) + 1n,
      })
    }

    console.log('Authorization signed successfully:', authorization)

    // 4. Send the transaction to ourselves (the EOA) to apply the delegation
    // We follow the reference script by sending to account.address
    const hash = await sendTransactionAsync({
      to: address,
      data: '0x',
      value: 0n,
      authorizationList: [authorization],
    } as any)
    
    console.log('Upgrade tx hash:', hash)

    // 5. Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('Upgrade receipt:', receipt)

    if (receipt.status === 'reverted') {
      throw new Error('EIP-7702 upgrade transaction reverted on-chain')
    }

    // Small delay to ensure state propagation
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 6. Verify delegation actually landed on the account
    const code = await publicClient.getCode({ address })
    console.log('Account code after upgrade:', code)

    if (!code || !code.startsWith('0xef0100')) {
      throw new Error(
        `Delegation did not apply. The account still has no delegate code. Code: ${code || 'empty'}`
      )
    }

    return { hash, receipt, code }
  }

  return { upgrade, checkIsDelegated }
}
