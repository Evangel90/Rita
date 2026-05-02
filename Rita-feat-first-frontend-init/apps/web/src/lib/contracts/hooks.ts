import { useMemo, useState } from 'react'
import { formatEther } from 'viem'
import { useAccount, useBalance, useReadContracts, useWriteContract, usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { ritaDelegateAbi, ritaRegistryAbi } from './abi'
import { checkDelegation, upgradeAndInitialize } from './eip7702'
import { CONTRACTS } from './config'

// --- Types ---

export interface InheritanceInfo {
  /** The owner EOA whose will this heir is named in */
  ownerAddress: `0x${string}`
  /** "ACTIVE" | "CLAIMABLE" or undefined while loading */
  ritaState: string | undefined
  /** Unix timestamp after which assets can be claimed */
  nextPingtime: bigint | undefined
  /** Inactivity threshold in seconds */
  threshold: bigint | undefined
  /** ERC-20 tokens tracked by this will */
  supportedTokens: `0x${string}`[]
  /** ETH balance held by the owner's delegated account */
  ethBalance: string
  /** True when the current time is past nextPingtime */
  isClaimable: boolean
}

// --- Hooks ---

/**
 * Fetches all inheritances for the connected wallet by:
 * 1. Querying RitaRegistry.getOwnersByHeir(address) to get owner list
 * 2. Batch-reading each owner's RitaDelegate state
 */
export function useHeirInheritances() {
  const { address } = useAccount()

  // Step 1: get the list of owners who registered this address as an heir
  const { data: ownersData, isLoading: ownersLoading } = useReadContracts({
    contracts: [
      {
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'getOwnersByHeir',
        args: [address ?? '0x0000000000000000000000000000000000000000'],
      },
    ],
    query: { enabled: Boolean(address) },
  })

  const owners = useMemo<`0x${string}`[]>(() => {
    return (ownersData?.[0].result as `0x${string}`[] | undefined) ?? []
  }, [ownersData])

  // Step 2: for each owner, read their delegate state (4 calls per owner)
  const perOwnerContracts = useMemo(() => {
    return owners.flatMap((owner) => [
      { abi: ritaDelegateAbi, address: owner, functionName: 'getRitaState' as const },
      { abi: ritaDelegateAbi, address: owner, functionName: 'getNextPingtime' as const },
      { abi: ritaDelegateAbi, address: owner, functionName: 'getThreshold' as const },
      { abi: ritaDelegateAbi, address: owner, functionName: 'getSupportedTokens' as const },
    ])
  }, [owners])

  const { data: delegateData, isLoading: delegateLoading } = useReadContracts({
    contracts: perOwnerContracts,
    query: { enabled: owners.length > 0 },
  })

  // Step 3: fetch ETH balances for each owner
  // We use a single useReadContracts call with native balance reads via getBalance
  // wagmi doesn't support batch native balance reads, so we derive from delegateData
  // and fall back to '0' — a separate hook handles individual balances if needed.

  const inheritances = useMemo<InheritanceInfo[]>(() => {
    if (!delegateData) return []
    const now = BigInt(Math.floor(Date.now() / 1000))

    return owners.map((owner, i) => {
      const base = i * 4
      const ritaState = delegateData[base]?.result as string | undefined
      const nextPingtime = delegateData[base + 1]?.result as bigint | undefined
      const threshold = delegateData[base + 2]?.result as bigint | undefined
      const supportedTokens = (delegateData[base + 3]?.result as `0x${string}`[] | undefined) ?? []
      const isClaimable = nextPingtime !== undefined && now >= nextPingtime

      return {
        ownerAddress: owner,
        ritaState,
        nextPingtime,
        threshold,
        supportedTokens,
        ethBalance: '0', // populated by useInheritanceEthBalance per-card
        isClaimable,
      }
    })
  }, [owners, delegateData])

  return {
    inheritances,
    owners,
    isLoading: ownersLoading || (owners.length > 0 && delegateLoading),
    hasInheritances: owners.length > 0,
  }
}

/**
 * Fetches the ETH balance of a single owner's delegated account.
 * Used per-card in the dashboard.
 */
export function useOwnerEthBalance(ownerAddress: `0x${string}` | undefined) {
  const { data } = useBalance({
    address: ownerAddress,
    query: { enabled: Boolean(ownerAddress) },
  })
  return data ? formatEther(data.value) : '0'
}

export function useRitaDashboardData() {
  const { address } = useAccount()

  const { data } = useReadContracts({
    contracts: [
      { abi: ritaDelegateAbi, address: address, functionName: 'getRitaState' },
      { abi: ritaDelegateAbi, address: address, functionName: 'getNextPingtime' },
      { abi: ritaDelegateAbi, address: address, functionName: 'getThreshold' },
      { abi: ritaDelegateAbi, address: address, functionName: 'getSupportedTokens' },
      { abi: ritaDelegateAbi, address: address, functionName: 'getHeirs' },
      {
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'getOwnersByHeir',
        args: [address ?? '0x0000000000000000000000000000000000000000'],
      },
    ],
    query: { enabled: Boolean(address) },
  })

  const { data: ethBalance } = useBalance({
    address: address,
  })

  const ownersByHeir = useMemo(() => {
    return (data?.[5].result as `0x${string}`[] | undefined) ?? []
  }, [data?.[5].result])

  return useMemo(
    () => ({
      ritaState: data?.[0].result as string | undefined,
      nextPing: data?.[1].result as bigint | undefined,
      threshold: data?.[2].result as bigint | undefined,
      supportedTokens: (data?.[3].result as `0x${string}`[] | undefined) ?? [],
      heirs: (data?.[4].result as `0x${string}`[] | undefined) ?? [],
      ownersByHeir,
      isHeir: ownersByHeir.length > 0,
      delegateEthBalance: ethBalance ? formatEther(ethBalance.value) : '0',
    }),
    [data, ethBalance, ownersByHeir],
  )
}

export function useRitaActions() {
  const { address } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()
  const dashboard = useRitaDashboardData()

  // For heir actions, we typically act on the owner's account.
  // For owner actions, we act on our own account (address).
  const targetAddress = address

  return {
    isPending,
    /**
     * Claim ETH from a specific owner's delegated account.
     * If ownerAddress is omitted, falls back to the first owner in the registry.
     */
    claimEth: (ownerAddress?: `0x${string}`) => {
      const owner = ownerAddress ?? dashboard.ownersByHeir[0]
      if (!owner) return Promise.reject('No inheritance to claim')
      return writeContractAsync({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimETH',
      })
    },
    /**
     * Claim a specific ERC-20 token from a given owner's delegated account.
     */
    claimToken: (token: `0x${string}`, ownerAddress?: `0x${string}`) => {
      const owner = ownerAddress ?? dashboard.ownersByHeir[0]
      if (!owner) return Promise.reject('No inheritance to claim')
      return writeContractAsync({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimERC20',
        args: [token],
      })
    },
    /**
     * Claim multiple ERC-20 tokens from a given owner's delegated account.
     */
    claimMultiple: (tokens: `0x${string}`[], ownerAddress?: `0x${string}`) => {
      const owner = ownerAddress ?? dashboard.ownersByHeir[0]
      if (!owner) return Promise.reject('No inheritance to claim')
      return writeContractAsync({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimMultipleTokens',
        args: [tokens],
      })
    },
    ping: () =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'ping',
      }),
    updateThreshold: (value: bigint) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'updateThreshold',
        args: [value],
      }),
    addHeir: (heir: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'addHeir',
        args: [heir],
      }),
    removeHeir: (heir: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'removeHeir',
        args: [heir],
      }),
    addToken: (token: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'addToken',
        args: [token],
      }),
    removeToken: (token: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'removeToken',
        args: [token],
      }),
    initialize: (heirs: `0x${string}`[], threshold: bigint, coreStables: `0x${string}`[]) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: targetAddress!,
        functionName: 'initialize',
        args: [heirs, threshold, coreStables],
      }),
    registerHeir: (heir: `0x${string}`) =>
      writeContractAsync({
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'registerHeir',
        args: [heir],
      }),
    deregisterHeir: (heir: `0x${string}`) =>
      writeContractAsync({
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'deregisterHeir',
        args: [heir],
      }),
  }
}

export function useIsUpgraded() {
  const { address } = useAccount()
  const publicClient = usePublicClient()

  const { data: code } = useQuery({
    queryKey: ['account-code', address],
    queryFn: () => publicClient?.getCode({ address: address! }),
    enabled: !!address && !!publicClient,
  })

  return code?.startsWith('0xef0100') ?? false
}

export function useEIP7702() {
  const { address } = useAccount()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upgrade = async (
    heirs: string[],
    thresholdDays: number,
    stableTokens: string[],
  ) => {
    setIsPending(true)
    setError(null)

    try {
      await upgradeAndInitialize(heirs, thresholdDays, stableTokens)
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
