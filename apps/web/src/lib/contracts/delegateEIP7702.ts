import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, liskSepolia } from 'viem/chains';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });
// You can swap to liskSepolia if you are using chain 4202 as per your config.ts
const CHAIN = sepolia;
const DELEGATE_ADDRESS = '0xFD055766aF5DC43eAC17a0fBf8A5f520dBE49316'; 

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL;
  console.log(privateKey, rpcUrl);
  console.log(CHAIN.name, CHAIN.id);

  if (!privateKey) {
    console.error('Error: PRIVATE_KEY environment variable is required.');
    console.error('Usage: PRIVATE_KEY=0x... RPC_URL=https://... npx tsx scripts/delegateEIP7702.ts');
    process.exit(1);
  }

  // Ensure the private key has the 0x prefix
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

  // Set up the account from the existing wallet private key
  const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
  console.log(`Using account: ${account.address}`);
  console.log(`Target Delegate: ${DELEGATE_ADDRESS}`);
  console.log(`Chain: ${CHAIN.name} (ID: ${CHAIN.id})`);

  // Set up clients
  const transport = rpcUrl ? http(rpcUrl) : http();
  
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport
  });

  const walletClient = createWalletClient({
    account,
    chain: CHAIN,
    transport
  });

  // Check balance before sending
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Account balance: ${balance} wei`);
  
  if (balance === 0n) {
    console.warn('Warning: Account has 0 balance, transaction will fail unless sponsored.');
  }

  console.log('\nSigning EIP-7702 authorization...');
  
  try {
    // 1. Sign the authorization payload for the delegate contract
    const currentNonce = await publicClient.getTransactionCount({ address: account.address });
    
    // CRITICAL: Because you are sending the transaction from the SAME account that is being delegated,
    // the EVM increments your account's nonce at the very start of the transaction.
    // By the time the EVM evaluates the authorization, your account's nonce is already currentNonce + 1!
    // Therefore, the authorization must be signed over currentNonce + 1.
    const authorization = await walletClient.signAuthorization({
      account,
      contractAddress: DELEGATE_ADDRESS,
      chainId: CHAIN.id,
      nonce: currentNonce + 1,
    });
    
    console.log('Authorization signed successfully!');
    
    console.log('\nSending transaction to upgrade account...');
    
    // 2. Send the transaction including the authorization list.
    // We send a 0-value transaction to ourselves just to publish the authorization.
    const hash = await walletClient.sendTransaction({
      account,
      chain: CHAIN,
      to: account.address,
      data: '0x',
      value: 0n,
      authorizationList: [authorization]
    } as any);

    console.log(`Transaction sent! Hash: ${hash}`);
    console.log('Waiting for confirmation...');

    // 3. Wait for the transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('\nTransaction confirmed successfully!');
      
      // 4. Verify the delegation was actually applied
      const code = await publicClient.getCode({ address: account.address });
      if (code && code.startsWith('0xef0100')) {
        const delegatedTo = `0x${code.slice(8)}`;
        console.log(`✅ Success! Account is now delegated to: ${delegatedTo}`);
      } else {
        console.log(`❌ Warning: Account code does not reflect the delegation. Expected code starting with 0xef0100, got: ${code || '0x'}`);
      }
    } else {
      console.error('\n❌ Transaction reverted on-chain.');
    }

  } catch (error) {
    console.error('\n❌ Error during delegation process:');
    console.error(error);
  }
}

main().catch(console.error);
