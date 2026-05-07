# Frontend Architecture

This document describes the current architecture of the `apps/web` frontend, focusing on the EIP-7702 upgrade flow and modular smart account integration.

## Overview

The frontend is a React + TypeScript application powered by Vite, designed to transform standard Externally Owned Accounts (EOAs) into modular smart accounts.

Key libraries:
- `react` / `react-dom` (v19)
- `@tanstack/react-router` for type-safe routing.
- `@tanstack/react-query` for async state and blockchain data sync.
- `@reown/appkit` and `wagmi` for wallet connectivity.
- `@privy-io/react-auth` for embedded wallet support and social login.
- `viem` and `ethers` (v6) for EIP-7702 signatures and contract interactions.
- `tailwindcss` for modern, utility-first styling.

## Project Structure

`apps/web/`
- `src/main.tsx` - App entrypoint and route tree definition.
- `src/pages/` - Route-level components (Landing, Dashboard, Upgrade, etc.).
- `src/lib/web3/` - Wallet configuration (AppKit / Wagmi / Privy adapters).
- `src/lib/contracts/` - The core protocol integration layer.
  - `config.ts` - Contract addresses (Rita, MetaMask delegate) and Chain ID.
  - `usePrivyEIP7702.ts` - Specialized hook for Privy embedded wallets using the Relay Pattern.
  - `useEIP7702Upgrade.ts` - Viem-based hook for standard account delegation.
  - `eip7702.ts` - Ethers-based utility for advanced signing and initialization.
  - `abi.ts` - Typed ABIs for RitaDelegate and RitaRegistry.

## EIP-7702 Account Upgrades

The core of Rita Protocol is the transition from an EOA to a Smart Account. This is implemented via a multi-phase EIP-7702 flow designed for maximum reliability and security.

### 1. Authorization Signing
The user signs a `SET_CODE` authorization. 
- **Privy Integration:** Uses `useSign7702Authorization` to sign the payload. We let the provider manage the nonce internally to avoid mismatches.
- **MetaMask Compatibility:** Detects MetaMask and uses its designated `metamaskDelegate` to ensure signature acceptance.

### 2. Transaction Execution (The Relay Pattern)
To bypass limitations where embedded wallet providers (like Privy) may not yet support broadcasting **Type 4 (0x04)** transactions directly, we use a **Relay Pattern**:
- **Delegation (Step A):** A dedicated relay account (configured via `VITE_RELAY_PRIVATE_KEY`) broadcasts the Type 4 transaction to the network. This transaction includes the user's authorization and points the EOA to the `ritaDelegate`.
- **Why a Relay?** This ensures the transaction is correctly formatted as Type 4 and bypasses internal provider validators that might silently downgrade the transaction to Type 2.

### 3. Initialization
Once the delegation is confirmed and verified (checked for the `0xef0100` prefix), the account must be initialized.
- **Satisfying `onlyOwner`:** The `RitaDelegate` contract's `initialize` function requires `msg.sender == address(this)`. 
- **EOA-Direct Call:** The user's EOA sends a second transaction directly to itself to trigger `initialize()`. This ensures the security check is satisfied and the account state (heirs, threshold) is set correctly.

## Blockchain Integration

The application interacts with Ethereum via two primary paths:
- **Wagmi Hooks:** Used for standard reads and simple writes.
- **Relay Client:** A `viem` `walletClient` using a plain HTTP transport and a dedicated private key, used specifically for EIP-7702 Type 4 broadcasts.
- **Standard HTTP Public Client:** Used for `getCode` checks and transaction receipt polling to ensure read consistency and bypass provider-level caching.

Current Primary Network: **Sepolia (11155111)**.

## Routing

The app uses file-based routing via TanStack Router:
- `/` -> Landing & Wallet Connection
- `/app/upgrade` -> EIP-7702 Onboarding (Standard Wallets)
- `/app/onboarding` -> Specialized Privy EIP-7702 Onboarding
- `/app/dashboard` -> Account status and Will management
- `/app/my-will` -> Heir configuration and asset tracking

## Improvements Needed

### Immediate
- **Atomic Initialization:** Explore `executor: 'self'` patterns for standard wallets to combine delegation and initialization into a single transaction where `msg.sender` is correctly preserved.
- **Relay Gas Management:** Implement a backend service to manage the relay account and avoid exposing a private key in frontend environment variables.
- **Registry Sync:** Ensure every upgrade successfully pings the `RitaRegistry` for global discoverability.

### Developer Experience
- **Unified 7702 Hook:** Consolidate `usePrivyEIP7702` and `useEIP7702Upgrade` into a single intelligent hook that detects the provider type and chooses the best upgrade path.
- **Error Handling:** Improve UI feedback for specific EIP-7702 failure modes (e.g., nonce conflicts or lack of chain support).

---

This document should be updated as the frontend becomes more complete, especially when real contract flows replace the current placeholders.
