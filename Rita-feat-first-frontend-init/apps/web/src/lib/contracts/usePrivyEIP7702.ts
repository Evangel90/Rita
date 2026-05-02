import { useWallets, useSign7702Authorization, type ConnectedWallet } from '@privy-io/react-auth';
import { createWalletClient, createPublicClient, custom, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { CONTRACTS } from './config';
import { ritaDelegateAbi } from './abi';

// Project default constants for initialization
const DEFAULT_CORE_STABLES: `0x${string}`[] = [];

// A dedicated relay account that ONLY submits the type-4 tx and pays gas.
// This is a throwaway key — it just needs a small amount of Sepolia ETH.
// Store in your .env — this is NOT the user's key.
const RELAY_PRIVATE_KEY = import.meta.env.VITE_RELAY_PRIVATE_KEY as `0x${string}`;

export function usePrivyEIP7702() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();

  const upgrade = async (
    heirs: `0x${string}`[],
    thresholdDays: number,
    stableTokens: `0x${string}`[] = DEFAULT_CORE_STABLES
  ) => {
    const embeddedWallet = wallets.find((w: ConnectedWallet) => w.walletClientType === 'privy');
    if (!embeddedWallet) throw new Error('No Privy embedded wallet found. Please log in with email/social.');

    if (!RELAY_PRIVATE_KEY) {
      throw new Error('VITE_RELAY_PRIVATE_KEY is missing in your .env file.');
    }

    const provider = await embeddedWallet.getEthereumProvider();

    // Relay account — pays gas, sends the type-4 tx, has no restrictions
    const relay = privateKeyToAccount(RELAY_PRIVATE_KEY);

    // Relay wallet client on plain HTTP — Privy's provider never touches this
    const relayClient = createWalletClient({
      account: relay,
      chain: sepolia,
      transport: http(),
    });

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    // Wallet client for the user's EOA (via Privy) to call initialize
    const userClient = createWalletClient({
      account: embeddedWallet.address as `0x${string}`,
      chain: sepolia,
      transport: custom(provider),
    });

    console.log('Step 1: Signing EIP-7702 authorization via Privy...');

    // 1. Privy signs the authorization for the user's EOA.
    // The relay is the executor, so no nonce offset is needed for the auth.
    const authorization = await signAuthorization({
      contractAddress: CONTRACTS.ritaDelegate,
      chainId: sepolia.id,
    }, {
      address: embeddedWallet.address as `0x${string}`,
    });

    console.log('Privy authorization signed:', authorization);

    // 2. Relay sends the type-4 tx to delegate the EOA.
    // We send an empty data call first because 'initialize' has 'onlyOwner' (msg.sender == address(this)).
    // In EIP-7702, msg.sender for the top-level call is the relay, so user must call initialize themselves.
    console.log('Step 2: Relaying EIP-7702 delegation transaction...');

    const upgradeHash = await relayClient.sendTransaction({
      authorizationList: [authorization],
      to: embeddedWallet.address as `0x${string}`, // target is the user's EOA
      data: '0x',
      value: 0n,
    });

    console.log('Delegation tx hash:', upgradeHash);
    const upgradeReceipt = await publicClient.waitForTransactionReceipt({ hash: upgradeHash });
    
    if (upgradeReceipt.status === 'reverted') {
      throw new Error('EIP-7702 upgrade transaction reverted on-chain');
    }

    // Small delay to ensure state propagation before EOA call
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Verify delegation prefix
    const code = await publicClient.getCode({ address: embeddedWallet.address as `0x${string}` });
    if (!code || !code.toLowerCase().startsWith('0xef0100')) {
      throw new Error(`Delegation did not apply. Code: ${code || 'empty'}`);
    }

    // 4. Initialize the delegated account from the EOA itself (satisfying onlyOwner)
    console.log('Step 3: Initializing delegated account via Privy EOA...');

    const thresholdSeconds = BigInt(thresholdDays * 24 * 60 * 60);
    const initHash = await userClient.writeContract({
      address: embeddedWallet.address as `0x${string}`,
      abi: ritaDelegateAbi,
      functionName: 'initialize',
      args: [heirs, thresholdSeconds, stableTokens],
    });

    console.log('Initialization tx hash:', initHash);
    const initReceipt = await publicClient.waitForTransactionReceipt({ hash: initHash });

    if (initReceipt.status === 'reverted') {
      throw new Error('Rita initialization transaction reverted on-chain');
    }

    return { upgradeHash, upgradeReceipt, initHash, initReceipt };
  };

  return { upgrade };
}
