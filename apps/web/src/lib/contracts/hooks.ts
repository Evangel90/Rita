import { useMemo, useState, useEffect } from 'react'
import { formatEther, encodeFunctionData, getAddress } from 'viem'
import { useAccount, useBalance, useReadContracts, useWriteContract, usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { useWallets, usePrivy } from '@privy-io/react-auth'
import { ritaDelegateAbi, ritaRegistryAbi } from './abi'
import { checkDelegation, upgradeAndInitialize } from './eip7702'
import { usePrivyEIP7702 } from './usePrivyEIP7702'
import { CONTRACTS, CHAIN_ID } from './config'

// ---------------------------------------------------------------------------
// Unified Account Hook
// ---------------------------------------------------------------------------

export function useRitaAccount() {
  const wagmiAccount = useAccount()
  const { wallets } = useWallets()
  const { authenticated } = usePrivy()

  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
  const address = wagmiAccount.address || (embeddedWallet?.address as `0x${string}` | undefined)
  const isConnected = wagmiAccount.isConnected || (authenticated && !!embeddedWallet)

  return {
    address,
    isConnected,
    isConnecting: wagmiAccount.isConnecting,
    isDisconnected: !isConnected,
    connector: wagmiAccount.connector,
    chainId: wagmiAccount.chainId,
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InheritanceEntry {
  owner: `0x${string}`
  ritaState: string | undefined
  nextPingtime: bigint | undefined
  supportedTokens: `0x${string}`[]
  ethBalance: string
  isClaimable: boolean
}

export function useRitaDashboardData() {
  const { address } = useRitaAccount()

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { abi: ritaDelegateAbi, address: address, functionName: 'getRitaState', chainId: CHAIN_ID },
      { abi: ritaDelegateAbi, address: address, functionName: 'getNextPingtime', chainId: CHAIN_ID },
      { abi: ritaDelegateAbi, address: address, functionName: 'getThreshold', chainId: CHAIN_ID },
      { abi: ritaDelegateAbi, address: address, functionName: 'getSupportedTokens', chainId: CHAIN_ID },
      { abi: ritaDelegateAbi, address: address, functionName: 'getHeirs', chainId: CHAIN_ID },
      { abi: ritaDelegateAbi, address: address, functionName: 'getInitialized', chainId: CHAIN_ID },
      {
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'getOwnersByHeir',
        args: [address ?? '0x0000000000000000000000000000000000000000'],
        chainId: CHAIN_ID
      },
    ],
    query: { enabled: Boolean(address) },
  })

  const { data: ethBalance } = useBalance({
    address: address,
    chainId: CHAIN_ID,
  })

  const ownersByHeir = useMemo(() => {
    return (data?.[6].result as `0x${string}`[] | undefined) ?? []
  }, [data?.[6].result])

  return useMemo(
    () => ({
      ritaState: data?.[0].result as string | undefined,
      nextPing: data?.[1].result as bigint | undefined,
      threshold: data?.[2].result as bigint | undefined,
      supportedTokens: (data?.[3].result as `0x${string}`[] | undefined) ?? [],
      heirs: (data?.[4].result as `0x${string}`[] | undefined) ?? [],
      isInitialized: data?.[5].result as boolean | undefined,
      ownersByHeir,
      isHeir: ownersByHeir.length > 0,
      delegateEthBalance: ethBalance ? formatEther(ethBalance.value) : '0',
      isLoading,
      refetch,
    }),
    [data, ethBalance, ownersByHeir, isLoading, refetch],
  )
}

// ---------------------------------------------------------------------------
// useInheritances — heir-centric hook
// ---------------------------------------------------------------------------

export function useInheritances() {
  const { address } = useRitaAccount()

  const { data: ownersData, isLoading: ownersLoading, refetch: refetchOwners, error: ownersError } = useReadContracts({
    contracts: [
      {
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'getOwnersByHeir',
        args: [address ? getAddress(address) : '0x0000000000000000000000000000000000000000'],
        chainId: CHAIN_ID,
      },
    ],
    query: { 
      enabled: Boolean(address),
      staleTime: 5000, 
    },
  })

  // Diagnostic logging
  useEffect(() => {
    if (address) {
      console.log(`[useInheritances] Querying registry at ${CONTRACTS.ritaRegistry} on chain ${CHAIN_ID} for heir: ${address}`)
      if (ownersData?.[0]) {
        console.log(`[useInheritances] Registry response:`, {
          status: ownersData[0].status,
          result: ownersData[0].result,
          error: ownersData[0].error
        })
      }
    }
  }, [address, ownersData])

  const owners = useMemo<`0x${string}`[]>(
    () => (ownersData?.[0].result as `0x${string}`[] | undefined) ?? [],
    [ownersData],
  )

  const perOwnerContracts = useMemo(
    () =>
      owners.flatMap((owner) => [
        { abi: ritaDelegateAbi, address: owner, functionName: 'getRitaState' as const, chainId: CHAIN_ID },
        { abi: ritaDelegateAbi, address: owner, functionName: 'getNextPingtime' as const, chainId: CHAIN_ID },
        { abi: ritaDelegateAbi, address: owner, functionName: 'getSupportedTokens' as const, chainId: CHAIN_ID },
      ]),
    [owners],
  )

  const { data: perOwnerData, isLoading: detailsLoading } = useReadContracts({
    contracts: perOwnerContracts,
    query: { enabled: owners.length > 0 },
  })

  const publicClient = usePublicClient({ chainId: CHAIN_ID })

  const { data: ethBalances } = useQuery({
    queryKey: ['heir-eth-balances', owners.join(','), CHAIN_ID],
    queryFn: async () => {
      if (!publicClient || owners.length === 0) return []
      return Promise.all(
        owners.map((owner) =>
          publicClient.getBalance({ address: owner }).then(formatEther).catch(() => '0'),
        ),
      )
    },
    enabled: owners.length > 0 && Boolean(publicClient),
  })

  const inheritances = useMemo<InheritanceEntry[]>(() => {
    if (owners.length === 0) return []
    const now = BigInt(Math.floor(Date.now() / 1000))

    return owners.map((owner, i) => {
      const base = i * 3
      const ritaState = perOwnerData?.[base]?.result as string | undefined
      const nextPingtime = perOwnerData?.[base + 1]?.result as bigint | undefined
      const supportedTokens = (perOwnerData?.[base + 2]?.result as `0x${string}`[] | undefined) ?? []
      const ethBalance = ethBalances?.[i] ?? '0'
      const isClaimable = ritaState === 'CLAIMABLE' || (nextPingtime !== undefined && now >= nextPingtime)

      return { owner, ritaState, nextPingtime, supportedTokens, ethBalance, isClaimable }
    })
  }, [owners, perOwnerData, ethBalances])

  return {
    inheritances,
    isLoading: ownersLoading || (owners.length > 0 && detailsLoading),
    hasInheritance: inheritances.length > 0,
    refetch: refetchOwners,
    error: ownersError,
  }
}

// ---------------------------------------------------------------------------
// useClaimInheritance — per-owner claim actions
// ---------------------------------------------------------------------------

export function useClaimInheritance(owner: `0x${string}`) {
  const { writeContractAsync, isPending } = useWriteContract()

  return {
    isPending,
    claimEth: () =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimETH',
        chainId: CHAIN_ID,
      }),
    claimToken: (token: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimERC20',
        args: [token],
        chainId: CHAIN_ID,
      }),
    claimMultiple: (tokens: `0x${string}`[]) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimMultipleTokens',
        args: [tokens],
        chainId: CHAIN_ID,
      }),
  }
}

export function useRitaActions() {
  const { address, connector } = useRitaAccount()
  const { writeContractAsync, isPending } = useWriteContract()
  const { wallets } = useWallets()
  const publicClient = usePublicClient({ chainId: CHAIN_ID })
  const dashboard = useRitaDashboardData()

  const callContract = async ({
    abi,
    address: contractAddress,
    functionName,
    args = [],
  }: {
    abi: any
    address: `0x${string}`
    functionName: string
    args?: any[]
  }) => {
    let hash: `0x${string}`

    if (connector) {
      hash = await writeContractAsync({
        abi,
        address: contractAddress,
        functionName,
        args,
        chainId: CHAIN_ID,
      } as any)
    } else {
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
      if (embeddedWallet) {
        console.log(`[RitaActions] Using Privy embedded wallet for ${functionName}...`)
        const provider = await embeddedWallet.getEthereumProvider()
        const data = encodeFunctionData({ abi, functionName, args })

        hash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: contractAddress,
            data,
            value: '0x0',
            chainId: `0x${CHAIN_ID.toString(16)}`,
          }],
        }) as `0x${string}`
      } else {
        throw new Error('No wallet connector found. Please connect your wallet.')
      }
    }

    if (publicClient) {
      console.log(`[RitaActions] Waiting for confirmation on chain ${CHAIN_ID}: ${hash}...`)
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      dashboard.refetch()
      return receipt
    }

    return { hash }
  }

  const targetAddress = address

  return {
    isPending,
    claimEth: () => {
      const owner = dashboard.ownersByHeir[0]
      if (!owner) return Promise.reject('No inheritance to claim')
      return callContract({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimETH',
      })
    },
    claimToken: (token: `0x${string}`) => {
      const owner = dashboard.ownersByHeir[0]
      if (!owner) return Promise.reject('No inheritance to claim')
      return callContract({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimERC20',
        args: [token],
      })
    },
    claimMultiple: (tokens: `0x${string}`[]) => {
      const owner = dashboard.ownersByHeir[0]
      if (!owner) return Promise.reject('No inheritance to claim')
      return callContract({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimMultipleTokens',
        args: [tokens],
      })
    },
    ping: () =>
      callContract({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'ping',
      }),
    updateThreshold: (value: bigint) =>
      callContract({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'updateThreshold',
        args: [value],
      }),
    addHeir: (heir: `0x${string}`) =>
      callContract({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'addHeir',
        args: [heir],
      }),
    removeHeir: (heir: `0x${string}`) =>
      callContract({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'removeHeir',
        args: [heir],
      }),
    addToken: (token: `0x${string}`) =>
      callContract({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'addToken',
        args: [token],
      }),
    removeToken: (token: `0x${string}`) =>
      callContract({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'removeToken',
        args: [token],
      }),
    initialize: (heirs: `0x${string}`[], threshold: bigint, coreStables: `0x${string}`[]) =>
      callContract({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'initialize',
        args: [heirs, threshold, coreStables],
      }),
    registerHeir: (heir: `0x${string}`) =>
      callContract({
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'registerHeir',
        args: [heir],
      }),
    deregisterHeir: (heir: `0x${string}`) =>
      callContract({
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'deregisterHeir',
        args: [heir],
      }),
  }
}

export function useIsDelegated() {
  const { address } = useRitaAccount()
  const publicClient = usePublicClient({ chainId: CHAIN_ID })

  const { data: code, isLoading } = useQuery({
    queryKey: ['account-code', address, CHAIN_ID],
    queryFn: async () => {
      if (!publicClient || !address) return '0x'
      const result = await publicClient.getCode({ address })
      return result ?? '0x'
    },
    enabled: !!address && !!publicClient,
  })

  return {
    isDelegated: code?.startsWith('0xef0100') ?? false,
    isLoading,
    code,
  }
}

export function useEIP7702() {
  const { address } = useRitaAccount()
  const { wallets } = useWallets()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const privy7702 = usePrivyEIP7702()

  const upgrade = async (
    heirs: string[],
    thresholdDays: number,
    stableTokens: string[],
  ) => {
    setIsPending(true)
    setError(null)

    try {
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
      
      if (embeddedWallet) {
        console.log('Detected Privy embedded wallet, using Privy EIP-7702 path...');
        await privy7702.upgrade(
          heirs as `0x${string}`[],
          thresholdDays,
          stableTokens as `0x${string}`[]
        );
      } else {
        console.log('No Privy embedded wallet, using standard EIP-7702 path...');
        await upgradeAndInitialize(heirs, thresholdDays, stableTokens)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Upgrade failed')
      throw err
    } finally {
      setIsPending(false)
    }
  }

  const checkStatus = async () => {
    if (!address) return false
    const result = await checkDelegation(address)
    return result.isDelegated
  }

  return { upgrade, checkStatus, isPending, error }
}
