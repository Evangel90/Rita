# Frontend Architecture

This document describes the current architecture of the `apps/web` frontend, focusing on the EIP-7702 upgrade flow and modular smart account integration.

## Overview

The frontend is a React + TypeScript application powered by Vite, designed to transform standard Externally Owned Accounts (EOAs) into modular smart accounts.

Key libraries:
- `react` / `react-dom` (v19)
- `@tanstack/react-router` for type-safe routing.
- `@tanstack/react-query` for async state and blockchain data sync.
- `@reown/appkit` and `wagmi` for wallet connectivity.
- `viem` and `ethers` (v6) for EIP-7702 signatures and contract interactions.
- `tailwindcss` for modern, utility-first styling.

## Project Structure

`apps/web/`
- `src/main.tsx` - App entrypoint and route tree definition.
- `src/pages/` - Route-level components (Landing, Dashboard, Upgrade, etc.).
- `src/lib/web3/` - Wallet configuration (AppKit / Wagmi adapters).
- `src/lib/contracts/` - The core protocol integration layer.
  - `config.ts` - Contract addresses (Rita, MetaMask delegate) and Chain ID.
  - `useEIP7702Upgrade.ts` - Viem-based hook for account delegation.
  - `eip7702.ts` - Ethers-based utility for advanced signing and initialization.
  - `abi.ts` - Typed ABIs for RitaDelegate and RitaRegistry.

## EIP-7702 Account Upgrades

The core of Rita Protocol is the transition from an EOA to a Smart Account. This is implemented via a two-phase EIP-7702 flow:

### 1. Authorization Signing
The user signs a `SET_CODE` authorization. 
- **MetaMask Compatibility:** The app detects MetaMask and uses its designated `metamaskDelegate` (`0x63c0...2b1b`) to ensure signature acceptance.
- **Custom Support:** For local accounts or Reth Odyssey, it uses the custom `ritaDelegate`.
- **Nonce Logic:** Since the transaction is often sent from the account being upgraded, authorizations are signed with `currentNonce + 1` to account for the transaction's own increment.

### 2. Transaction Execution
A **Type 4 (0x04)** transaction is broadcast.
- The transaction targets the EOA itself (`to: address`).
- It includes the `authorizationList` signed in Phase 1.
- It often includes `data` to call `initialize()` on the delegate contract in the same atomic step.

## Blockchain Integration

The application interacts with Ethereum via two primary paths:
- **Wagmi Hooks:** Used for standard reads (balances, contract state) and simple writes.
- **Custom EIP-7702 Utilities:** Found in `src/lib/contracts/`, these handle the experimental RPC methods like `eth_signAuthorization` and raw Type 4 transaction construction.

Current Primary Network: **Sepolia (11155111)**.

## Routing

The app uses file-based routing via TanStack Router:
- `/` -> Landing & Wallet Connection
- `/app/upgrade` -> EIP-7702 Onboarding
- `/app/dashboard` -> Account status and Will management
- `/app/my-will` -> Heir configuration and asset tracking

## Improvements Needed

### Immediate
- **Module Bridging:** Implement a way to "bridge" Rita logic as a module into the MetaMask delegate once authorized.
- **Registry Sync:** Ensure every upgrade successfully pings the `RitaRegistry` for global discoverability.
- **Refactoring:** Consolidate the `viem` and `ethers` signing logic into a single unified provider to reduce bundle size.

### Developer Experience
- **Test Coverage:** Add integration tests for the EIP-7702 flow using local private keys.
- **Error Handling:** Improve UI feedback for specific RPC errors (e.g., `-32601 Method not found` when a wallet lacks 7702 support).

---

This document should be updated as the frontend becomes more complete, especially when real contract flows replace the current placeholders.
