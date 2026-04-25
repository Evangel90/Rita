# 🛡️ Rita Protocol: Monorepo

Rita is a decentralized, modular inheritance protocol. It allows users to upgrade their existing EOA (Externally Owned Account) into a Modular Smart Account that automatically transfers authority to a beneficiary if a quorum of guardians fails to detect a "pulse."

> **💡 Pro-Tip:** "Rita doesn't move your money into a vault; it moves the authority of your account. By securing the account at the protocol level, we ensure that 100% of future assets are inherited with zero manual maintenance."

## 🏗️ Technical Architecture

The project is organized as a pnpm monorepo, ensuring total type-safety between the blockchain, the database, and the user interface.

### 1. The Security Layer (\`packages/contracts\`)
- **Framework:** Foundry (Solidity).
- **Standards:** ERC-7579 (Modular Accounts) & EIP-7702 (EOA Upgrades).
- **Core Logic:** An M-of-N Quorum pulse. Guardians must "ping" the contract to reset a death-timer. Upon expiry, an Atomic Validator Swap grants the beneficiary root access to the account.

### 2. The Discovery Layer (\`apps/api\`)
- **Framework:** Express + TypeScript.
- **Database:** MongoDB Atlas.
- **Role:** Acts as a high-speed cache for the blockchain. It listens for \`WillCreated\` events and indexes them so beneficiaries can "find" inheritances without scanning every block. It provides metadata (guardian names, asset labels) that are too expensive to store on-chain.

### 3. The Interface Layer (\`apps/web\`)
- **Framework:** Vite + React + Tailwind CSS.
- **Routing:** TanStack Router (File-based, type-safe routing).
- **Data Fetching:** TanStack Query (v5) for syncing MongoDB state and blockchain status.
- **Blockchain Glue:** Wagmi & Viem for EIP-7702 signatures and contract interactions.

### 4. The Shared Glue (\`packages/shared\`)
This package is the internal bridge. Whenever contracts are compiled:
- ABIs are exported to this package.
- TypeScript Types are generated for the contracts.
- The Frontend and Backend both import from \`@rita/shared\`, ensuring that if a Solidity function signature changes, the entire stack throws a compile-time error.

## 🔄 Core User Flow
1. **Benefactor:** Upgrades EOA via EIP-7702, installs the Rita Module (ERC-7579), and grants scoped permissions (ERC-7715).
2. **The Pulse:** Benefactor or Guardians "ping" the contract regularly.
3. **The Reaper:** If the timer hits zero, the Heir triggers the handoff.
4. **The Handoff:** The original 0x address is "re-keyed" to the Heir's private key via a modular validator swap.

## 🛠️ Dev Workflow

- **Package Management:** `pnpm` workspaces for local linking.
- **Parallelism:** Use `pnpm dev` (concurrently) to run the Vite dev server and Express API simultaneously.
- **Syncing:** Run `pnpm sync-abis` to move Foundry output into the TypeScript ecosystem.

## 🤝 Contributing

We welcome contributions from the team! Before starting any work, please read our strict [Contributors Guide](./CONTRIBUTORS.md) to understand our branching strategy, Git workflow, and rules for pull requests.

## 🗄️ Database Testing & Development

The `api` layer uses MongoDB Atlas as a high-speed cache. To test the backend locally against a remote MongoDB database:

1. Copy the `.env.example` file in `apps/api` to `.env`.
2. Update the `MONGODB_URI` to point to a MongoDB Atlas cluster.
3. **Developer Isolation:** To prevent data collisions with teammates during development, append your name to the database path in your connection string (e.g., `...mongodb.net/rita-dev-alice?...`).
4. **Automated Testing:** For CI/CD and unit tests, we recommend using `mongodb-memory-server` to spin up an ephemeral in-memory database rather than connecting to the remote Atlas instance.
