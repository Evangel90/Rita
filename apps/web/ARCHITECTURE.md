# Frontend Architecture

This document describes the current architecture of the `apps/web` frontend, how the main pieces fit together, and what to improve before handing the project off to contributors.

## Overview

The frontend is a React + TypeScript application powered by Vite.

Key libraries:
- `react` / `react-dom`
- `@tanstack/react-router` for routing
- `@tanstack/react-query` for async data management
- `@privy-io/react-auth` for authentication and wallet integration
- `viem` for Ethereum contract interactions
- `tailwindcss` / `@tailwindcss/vite` for styling
- `eslint` for linting

## Project structure

`apps/web/`
- `src/main.tsx` - application entrypoint, route definitions, auth provider setup, query provider setup.
- `src/pages/` - page-level route components.
- `src/lib/` - shared frontend utilities and blockchain integration code.
  - `lib/web3/privy.ts` - Privy auth / wallet configuration.
  - `lib/contracts/abi.ts` - hard-coded ABIs for Solidity contracts.
  - `lib/contracts/config.ts` - chain and contract address constants.
  - `lib/contracts/hooks.ts` - stubbed hooks for dashboard data and contract actions.
- `src/components/` - reusable UI components and layout pieces.
- `src/index.css` / `src/App.css` - global styling.
- `apps/web/README.md` - existing app README.

## Routing

Routing is defined in `src/main.tsx` using `@tanstack/react-router`.

The app currently uses a root route with the following children:
- `/` -> `LandingPage`
- `/onboarding/upgrade` -> `OnboardingUpgradePage`
- `/app/dashboard` -> `DashboardPage`
- `/app/my-will` -> `MyWillPage`
- `/app/guardians` -> placeholder page
- `/app/pulse` -> placeholder page
- `/app/assets` -> placeholder page
- `/app/settings` -> placeholder page
- `*` -> not-found fallback

The route tree is created and supplied to `<RouterProvider />` in `main.tsx`.

### Notes

- `src/App.tsx` is currently an empty component and not used.
- `src/routes/__root.tsx` exists but is not consumed by the current `main.tsx` route setup.

## Authentication and app context

Authentication is initialized at the root of the application using `PrivyProvider` in `main.tsx`.

`PrivyProvider` wraps the whole app and is configured by `src/lib/web3/privy.ts`:
- `appId` from `VITE_PRIVY_APP_ID`
- `defaultChain` and `supportedChains`
- embedded wallet behavior
- external wallet providers (Coinbase Wallet, MetaMask)

Data fetching and caching are handled by `@tanstack/react-query` via a single `QueryClientProvider` also in `main.tsx`.

## Blockchain integration

The app is wired for Ethereum smart contract interaction, but much of the current implementation is placeholder.

Important files:
- `src/lib/contracts/abi.ts` - ABIs for `ritaDelegate` and `ritaRegistry`
- `src/lib/contracts/config.ts` - on-chain contract addresses and a `CHAIN_ID`
- `src/lib/contracts/hooks.ts` - stubbed hooks returning mock values and no real contract reads/writes

Current hook behavior is intentionally minimal:
- `useRitaDashboardData()` returns placeholder dashboard state
- `useRitaActions()` returns stubbed promises for contract actions

## Styling

Styling is provided by Tailwind CSS and global CSS files.

The app uses `src/index.css` for global styles and `src/App.css` for extra styles.

## Contribution guidelines for new contributors

### What contributors should touch first

1. `src/main.tsx` - understand the route tree and root providers.
2. `src/pages/` - each page is a self-contained route.
3. `src/lib/contracts/` - real blockchain behavior should be implemented here.
4. `src/lib/web3/privy.ts` - update wallet/auth config when new chains or wallet options are needed.
5. `src/components/` - build small reusable UI pieces and layout patterns.

### Recommended patterns

- Keep pages thin. Page components should orchestrate data and pass props into reusable UI components.
- Put business logic and data loading into hooks or services under `src/lib/`.
- Use React Query for all async reads/writes and caching.
- Favor type-safe contract interactions with `viem` and shared contract types.
- Keep web3 config isolated in `src/lib/web3/` and contract metadata in `src/lib/contracts/`.

## Improvements needed

### Immediate improvements

- Replace placeholder `useRitaDashboardData` and `useRitaActions` with real contract calls using `viem`.
- Implement auth-aware route guards and sign-in flow based on Privy state.
- Remove or repurpose unused files such as `src/App.tsx` and `src/routes/__root.tsx`.
- Standardize page and component organization into feature folders if the app grows.

### Developer experience

- Add tests for pages, hooks, and contract utilities.
- Add strong TypeScript typing around contract inputs/outputs.
- Add a shared API/service layer for on-chain reads, writes, and state transformations.
- Add docs for local development and environment variables in `apps/web/README.md`.

### Architecture enhancements

- Introduce a `src/features/` or `src/modules/` folder layout for each domain area (dashboard, will, guardians, pulse, assets, settings).
- Create a design system / UI library under `src/components/ui/` for buttons, cards, dialogs, forms.
- Add a `web3` service that centralizes wallet connection, network switching, and transaction management.
- Add a consistent error / loading state pattern using `react-query` combined with shared `Loading` and `ErrorBoundary` components.

## How this fits in the monorepo

`apps/web` is the user-facing application in the `Rita` workspace. It depends on shared contract artifacts and may eventually consume packages from `packages/contracts` or `shared/`.

For contributors, keep the frontend focused on UI, auth, routing, and orchestration while leaving Solidity contract generation and tests in the `packages/contracts` package.

## Quick start for contributors

1. `cd apps/web`
2. `pnpm install`
3. `pnpm dev`
4. Set `VITE_PRIVY_APP_ID` in `apps/web/.env`
5. Open `http://localhost:5173`

---

This document should be updated as the frontend becomes more complete, especially when real contract flows replace the current placeholders.
