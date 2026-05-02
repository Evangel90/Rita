import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { PrivyProvider } from '@privy-io/react-auth'
import { sepolia } from 'viem/chains'
import './index.css'
import { wagmiConfig } from './lib/web3/wagmi'
import { DashboardPage } from './pages/DashboardPage'
import { LandingPage } from './pages/LandingPage'
import { MyWillPage } from './pages/MyWillPage'
import { OnboardingUpgradePage } from './pages/OnboardingUpgradePage'
import { PlaceholderPage } from './pages/PlaceholderPage'

const queryClient = new QueryClient()

const rootRoute = createRootRoute({
  component: () => (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email', 'wallet', 'google'],
        appearance: {
          theme: 'light',
          accentColor: '#5B7E3C',
          showWalletLoginFirst: true,
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  ),
})

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const upgradeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/upgrade',
  component: OnboardingUpgradePage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/dashboard',
  component: DashboardPage,
})

const myWillRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/my-will',
  component: MyWillPage,
})

const guardiansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/guardians',
  component: () => <PlaceholderPage title="Guardians" subtitle="Guardian roster and quorum tooling can be managed here." />,
})

const pulseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/pulse',
  component: () => <PlaceholderPage title="Pulse" subtitle="Pulse monitoring and ping workflow." />,
})

const assetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/assets',
  component: () => <PlaceholderPage title="Assets" subtitle="Tracked assets and token claim tools." />,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/settings',
  component: () => <PlaceholderPage title="Settings" subtitle="Profile, preferences, and integrations." />,
})

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p>Page not found</p>
      <Link to="/">Go home</Link>
    </div>
  ),
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  upgradeRoute,
  dashboardRoute,
  myWillRoute,
  guardiansRoute,
  pulseRoute,
  assetsRoute,
  settingsRoute,
  notFoundRoute,
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
