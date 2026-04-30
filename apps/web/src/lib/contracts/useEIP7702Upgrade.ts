import { useWalletClient, usePublicClient, useAccount } from 'wagmi'
import { CONTRACTS, CHAIN_ID } from './config'

export function useEIP7702Upgrade() {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { address } = useAccount()

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
   * For browser wallets (JSON-RPC accounts), we CANNOT use
   * `signAuthorization()` — that requires a Local Account with the
   * private key in memory. Instead, we pass unsigned authorization
   * entries to `sendTransaction` and let the wallet sign them.
   *
   * NONCE RULE: For self-sponsored transactions (the EOA authorizing
   * the delegation is also the account sending the tx), we must use
   * `currentNonce + 1`. The EVM increments the sender's nonce BEFORE
   * processing the authorization list, so by the time the authorization
   * is validated, the account's nonce is already N+1.
   */
  const upgrade = async () => {
    if (!walletClient || !address || !publicClient) throw new Error('Missing client or account')

    // Fetch the current nonce — we need nonce + 1 for self-sponsored auth
    const currentNonce = await publicClient.getTransactionCount({ address })

    // Send a Type 4 tx with an unsigned authorization entry.
    // The wallet extension (MetaMask, Coinbase Wallet, etc.) will:
    //  1. Prompt the user with a delegation approval dialog
    //  2. Sign the authorization entry (r, s, v)
    //  3. Sign and broadcast the complete Type 4 transaction
    //
    // We cast to `any` because viem's TS types expect SignedAuthorization,
    // but JSON-RPC wallets need unsigned entries to sign themselves.
    const hash = await walletClient.sendTransaction({
      to: address,
      authorizationList: [{
        contractAddress: CONTRACTS.ritaDelegate,
        chainId: CHAIN_ID,
        nonce: currentNonce + 1,
      }],
      data: '0x',
      value: 0n,
    } as any)
    console.log('Upgrade tx hash:', hash)

    // Wait for confirmation and verify success
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('Upgrade receipt:', receipt)

    if (receipt.status === 'reverted') {
      throw new Error('EIP-7702 upgrade transaction reverted on-chain')
    }

    // Verify delegation actually landed on the EOA
    const code = await publicClient.getCode({ address })
    console.log('EOA code after upgrade:', code)

    if (!code || !code.startsWith('0xef0100')) {
      throw new Error(
        'Delegation did not apply. The EOA still has no delegate code. ' +
        'This may indicate a wallet or RPC incompatibility with EIP-7702.'
      )
    }

    return { hash, receipt, code }
  }

  return { upgrade, checkIsDelegated }
}