import { BrowserProvider, Contract, type Signer, type Authorization } from 'ethers'
import { CONTRACTS } from './config'
import { ritaDelegateAbi } from './abi'

type EthereumProvider = {
  request: (args: { method: string; params: unknown[] }) => Promise<unknown>
  isMetaMask?: boolean
  [key: string]: unknown
}

function toHex(value: bigint | number) {
  return `0x${value.toString(16)}`
}

async function getProviderAndSigner() {
  const ethereum = (window as { ethereum?: EthereumProvider }).ethereum
  if (!ethereum) {
    throw new Error('No wallet provider found')
  }

  const provider = new BrowserProvider(ethereum)
  const signer = await provider.getSigner()
  const address = await signer.getAddress()

  return { ethereum, provider, signer, address }
}

export async function signEIP7702Authorization() {
  const { ethereum, provider, signer } = await getProviderAndSigner()
  const network = await provider.getNetwork()
  const address = await signer.getAddress()
  
  // CRITICAL: When sending from the same account, nonce must be currentNonce + 1
  const currentNonce = await provider.getTransactionCount(address)
  const targetNonce = BigInt(currentNonce + 1)

  // Use MetaMask's delegate if MetaMask is detected
  const delegateAddress = ethereum.isMetaMask 
    ? CONTRACTS.metamaskDelegate 
    : CONTRACTS.ritaDelegate

  console.log(`Signing authorization for ${ethereum.isMetaMask ? 'MetaMask' : 'Custom'} delegate: ${delegateAddress} with nonce: ${targetNonce}`)

  const auth = {
    chainId: network.chainId,
    address: delegateAddress,
    nonce: targetNonce,
  }

  if (typeof (signer as Signer & { authorize?: (auth: { chainId: bigint; address: string; nonce: bigint }) => Promise<Authorization> }).authorize === 'function') {
    const signature = await (signer as Signer & { authorize: (auth: { chainId: bigint; address: string; nonce: bigint }) => Promise<Authorization> }).authorize(auth)
    console.log('Signed authorization:', signature)
    return signature
  }

  console.warn('Signer does not support authorize(); using raw authorization tuple for type-4 upgrade.')
  return auth as Authorization
}

export async function sendUpgradeTransaction(
  authorization: Authorization,
) {
  const { ethereum, provider, signer, address } = await getProviderAndSigner()

  if (typeof (signer as Signer & { authorize?: (auth: { chainId: bigint; address: string; nonce: bigint }) => Promise<Authorization> }).authorize === 'function') {
    const txParams = {
      from: address,
      to: address,
      type: 4,
      data: '0x',
      value: '0x0',
      authorizationList: [authorization],
    }
    const tx = await signer.sendTransaction(txParams)
    console.log('Upgrade tx sent:', tx.hash)
    const receipt = await tx.wait()
    console.log('Upgrade confirmed:', receipt)
    return receipt
  }

  if (!ethereum.request) {
    throw new Error('Wallet provider does not support direct RPC requests')
  }

  // For raw RPC, we need to format the authorization properly
  // If no signature, this is an unsigned authorization for wallets that handle signing
  const rawAuth: Record<string, unknown> = {
    chainId: toHex(authorization.chainId),
    address: authorization.address,
    nonce: toHex(authorization.nonce),
  }

  if (authorization.signature) {
    rawAuth.yParity = authorization.signature.yParity
    rawAuth.r = authorization.signature.r
    rawAuth.s = authorization.signature.s
  }

  const txParams = {
    from: address,
    to: address,
    type: '0x4',
    data: '0x',
    value: '0x0',
    authorizationList: [rawAuth],
  }

  console.log('Sending raw EIP-7702 transaction:', txParams)
  const txHash = await ethereum.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  }) as string

  console.log('Raw upgrade tx sent:', txHash)

  // Wait for confirmation
  const receipt = await provider.waitForTransaction(txHash)
  console.log('Upgrade confirmed:', receipt)
  return receipt
}

export async function checkDelegation(eoaAddress: string) {
  const { provider } = await getProviderAndSigner()
  const code = await provider.getCode(eoaAddress)
  console.log('EOA bytecode:', code)

  if (!code || code === '0x') {
    return { isDelegated: false, delegatedTo: null }
  }

  const isDelegated = code.startsWith('0xef0100')
  const delegatedTo = isDelegated ? `0x${code.slice(8)}` : null

  return { isDelegated, delegatedTo }
}

export async function getEOAAsContract(eoaAddress: string) {
  const { signer } = await getProviderAndSigner()
  return new Contract(eoaAddress, ritaDelegateAbi, signer)
}

export async function upgradeAndInitialize(
  heirs: string[],
  thresholdDays: number,
  stableTokens: string[],
) {
  const { address } = await getProviderAndSigner()

  const { isDelegated } = await checkDelegation(address)
  console.log('Already delegated?', isDelegated)

  if (!isDelegated) {
    const authorization = await signEIP7702Authorization()
    await sendUpgradeTransaction(authorization)
  }

  const { isDelegated: confirmed, delegatedTo } = await checkDelegation(address)
  console.log('Delegation confirmed:', confirmed, '→', delegatedTo)

  if (!confirmed) {
    throw new Error('Upgrade failed — chain may not support EIP-7702')
  }

  const contract = await getEOAAsContract(address)
  const tx = await contract.initialize(
    heirs,
    BigInt(thresholdDays * 24 * 60 * 60),
    stableTokens,
  )
  const receipt = await tx.wait()
  console.log('Initialized!', receipt)
  return receipt
}
