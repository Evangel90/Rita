
import { useWallets, useSign7702Authorization, type ConnectedWallet } from '@privy-io/react-auth';
import { createWalletClient, createPublicClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { CONTRACTS } from './config';
import { ritaDelegateAbi } from './abi';

const DEFAULT_CORE_STABLES: `0x${string}`[] = [];

// A dedicated relay account that pays gas and sends the type-4 delegation tx.
// Needs a small amount of Sepolia ETH. Store in .env — NOT the user's key.
const RELAY_PRIVATE_KEY = import.meta.env.VITE_RELAY_PRIVATE_KEY as `0x${string}`;

/** Returns true if the EOA's bytecode is an EIP-7702 delegation to our RitaDelegate. */
function isDelegatedToRita(code: `0x${string}` | undefined): boolean {
  if (!code || !code.toLowerCase().startsWith('0xef0100')) return false;
  // EIP-7702 code format: 0xef0100 (3 bytes) + 20-byte delegate address = 46 hex chars after 0x
  const embeddedAddr = code.slice(8).toLowerCase();
  return embeddedAddr === CONTRACTS.ritaDelegate.slice(2).toLowerCase();
}

// ─── Helper: runs the initialize() self-call ─────────────────────────────────
// Called whether we just delegated OR skipped delegation (already delegated).
async function initializeOnly(
  eoaAddress: `0x${string}`,
  embeddedWallet: ConnectedWallet,
  publicClient: ReturnType<typeof createPublicClient>,
  heirs: `0x${string}`[],
  thresholdDays: number,
  stableTokens: `0x${string}`[]
): Promise<{ initTxHash: `0x${string}` | undefined }> {
  // Guard: skip if already initialized
  let alreadyInitialized = false;
  try {
    alreadyInitialized = await publicClient.readContract({
      address: eoaAddress,
      abi: ritaDelegateAbi,
      functionName: 'getInitialized',
    });
    console.log('[Rita] getInitialized:', alreadyInitialized);
  } catch (e) {
    console.warn('[Rita] getInitialized() threw — assuming not yet initialized:', e);
  }

  if (alreadyInitialized) {
    console.log('[Rita] Already initialized — skipping initialize() call.');
    return { initTxHash: undefined };
  }

  const thresholdSeconds = BigInt(thresholdDays * 24 * 60 * 60);
  const initData = encodeFunctionData({
    abi: ritaDelegateAbi,
    functionName: 'initialize',
    args: [heirs, thresholdSeconds, stableTokens],
  });
  console.log('[Rita] initialize() calldata:', initData);

  // Estimate gas — Privy's RPC doesn't auto-estimate for EIP-7702 self-calls
  let gasEstimate: bigint;
  try {
    gasEstimate = await publicClient.estimateGas({
      account: eoaAddress,
      to: eoaAddress,
      data: initData,
      value: 0n,
    });
    gasEstimate = (gasEstimate * 130n) / 100n; // +30% safety buffer
    console.log('[Rita] Gas estimate (+30%):', gasEstimate.toString());
  } catch (e) {
    console.warn('[Rita] Gas estimation failed — using 300_000 fallback:', e);
    gasEstimate = 300_000n;
  }

  // EOA sends to itself → msg.sender == address(this) → onlyOwner passes ✅
  console.log('[Rita] Sending initialize() self-call via Privy (Privy popup will appear)...');
  const provider = await embeddedWallet.getEthereumProvider();
  let initTxHash: `0x${string}`;
  try {
    initTxHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: eoaAddress,
          to: eoaAddress,
          data: initData,
          value: '0x0',
          gas: `0x${gasEstimate.toString(16)}`,
          chainId: `0x${sepolia.id.toString(16)}`,
        },
      ],
    }) as `0x${string}`;
  } catch (e) {
    console.error('[Rita] initialize() provider.request failed:', e);
    throw new Error(
      `Failed to send initialize() transaction. ${e instanceof Error ? e.message : String(e)}`
    );
  }

  console.log('[Rita] Initialize tx hash:', initTxHash);
  const initReceipt = await publicClient.waitForTransactionReceipt({ hash: initTxHash });
  console.log('[Rita] Initialize receipt:', initReceipt.status);

  if (initReceipt.status === 'reverted') {
    throw new Error(
      'initialize() reverted on-chain. Check Sepolia Etherscan for the revert reason.\nTX: ' + initTxHash
    );
  }

  console.log('[Rita] ✅ initialize() confirmed.');
  return { initTxHash };
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function usePrivyEIP7702() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();

  const upgrade = async (
    heirs: `0x${string}`[],
    thresholdDays: number,
    stableTokens: `0x${string}`[] = DEFAULT_CORE_STABLES
  ) => {
    console.log('[Rita] upgrade() called');
    console.log('[Rita] All wallets:', wallets.map(w => ({ address: w.address, type: w.walletClientType })));

    // ── Resolve the Privy embedded wallet ────────────────────────────────────
    const embeddedWallet = wallets.find((w: ConnectedWallet) => w.walletClientType === 'privy');
    if (!embeddedWallet) {
      throw new Error('No Privy embedded wallet found. Please log in with email/social.');
    }
    const eoaAddress = embeddedWallet.address as `0x${string}`;
    console.log('[Rita] EOA address:', eoaAddress);

    if (!RELAY_PRIVATE_KEY) {
      throw new Error('VITE_RELAY_PRIVATE_KEY is not set in your .env file.');
    }

    const relay = privateKeyToAccount(RELAY_PRIVATE_KEY);
    console.log('[Rita] Relay address:', relay.address);

    const relayClient = createWalletClient({
      account: relay,
      chain: sepolia,
      transport: http(),
    });
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    // ── Fast-path: check on-chain state ──────────────────────────────────────
    console.log('[Rita] Fetching account code from chain...');
    const currentCode = await publicClient.getCode({ address: eoaAddress });
    console.log('[Rita] Current code:', currentCode ?? '(none — plain EOA)');
    console.log('[Rita] isDelegatedToRita:', isDelegatedToRita(currentCode));

    if (isDelegatedToRita(currentCode)) {
      // Already delegated — check if also initialized
      let alreadyInit = false;
      try {
        alreadyInit = await publicClient.readContract({
          address: eoaAddress,
          abi: ritaDelegateAbi,
          functionName: 'getInitialized',
        });
        console.log('[Rita] getInitialized (fast-path):', alreadyInit);
      } catch (e) {
        console.warn('[Rita] getInitialized() threw on fast-path:', e);
      }

      if (alreadyInit) {
        // Fully done — nothing to do
        console.log('[Rita] ✅ Already fully upgraded. Returning.');
        return { delegateTxHash: undefined, initTxHash: undefined };
      }

      // Delegated but NOT initialized — skip straight to initialize
      console.log('[Rita] Delegated but not initialized — running initialize() only...');
      const { initTxHash } = await initializeOnly(
        eoaAddress, embeddedWallet, publicClient, heirs, thresholdDays, stableTokens
      );
      return { delegateTxHash: undefined, initTxHash };
    }

    // ── Step 1: Privy signs the EIP-7702 authorization ───────────────────────
    // This triggers a Privy modal asking the user to sign.
    console.log('[Rita] Step 1: signAuthorization() via Privy (Privy popup will appear)...');
    let authorization: Awaited<ReturnType<typeof signAuthorization>>;
    try {
      authorization = await signAuthorization(
        { contractAddress: CONTRACTS.ritaDelegate, chainId: sepolia.id },
        { address: eoaAddress }
      );
    } catch (e) {
      console.error('[Rita] signAuthorization failed:', e);
      throw new Error(
        `EIP-7702 authorization signing failed. ` +
        `Ensure you are using a Privy embedded wallet and EIP-7702 is enabled for your Privy app. ` +
        `Details: ${e instanceof Error ? e.message : String(e)}`
      );
    }
    console.log('[Rita] Authorization signed:', authorization);

    // ── Step 2: Relay submits type-4 tx (delegation only, no calldata) ────────
    // msg.sender = relay ≠ address(this), so initialize() would revert here.
    // We send data:'0x' to just apply the EIP-7702 delegation.
    console.log('[Rita] Step 2: Relay sending delegation-only type-4 tx...');
    const delegateTxHash = await relayClient.sendTransaction({
      authorizationList: [authorization],
      to: eoaAddress,
      data: '0x',
      value: 0n,
    });
    console.log('[Rita] Delegation tx:', delegateTxHash);

    const delegateReceipt = await publicClient.waitForTransactionReceipt({ hash: delegateTxHash });
    console.log('[Rita] Delegation receipt status:', delegateReceipt.status);
    if (delegateReceipt.status === 'reverted') {
      throw new Error('EIP-7702 delegation tx reverted. TX: ' + delegateTxHash);
    }

    const codeAfter = await publicClient.getCode({ address: eoaAddress });
    console.log('[Rita] Code after delegation:', codeAfter);
    if (!isDelegatedToRita(codeAfter)) {
      throw new Error(`Delegation did not apply on-chain. Code: ${codeAfter ?? 'empty'}`);
    }

    // ── Step 3: EOA self-calls initialize() ──────────────────────────────────
    const { initTxHash } = await initializeOnly(
      eoaAddress, embeddedWallet, publicClient, heirs, thresholdDays, stableTokens
    );

    const finalCode = await publicClient.getCode({ address: eoaAddress });
    console.log('[Rita] ✅ Upgrade complete. Final code:', finalCode);
    return { delegateTxHash, initTxHash };
  };

  return { upgrade };
}
