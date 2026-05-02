// Web3 setup file - now using Privy for authentication and Wagmi for contract interactions
// Reown AppKit has been removed in favor of Privy integration

export { wagmiConfig } from './wagmi'

// Note: Privy provides the PrivyProvider which handles user authentication
// Wagmi configuration handles RPC connections and contract interactions
// See main.tsx for complete provider setup
