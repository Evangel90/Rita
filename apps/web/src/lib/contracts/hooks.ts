import { useMemo } from 'react'
import { formatEther } from 'viem'
import { useAccount, useBalance, useReadContracts, useWriteContract } from 'wagmi'
import { ritaDelegateAbi, ritaRegistryAbi } from './abi'
import { CONTRACTS } from './config'

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

  const ownersByHeir = (data?.[5].result as `0x${string}`[] | undefined) ?? []

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
    [data, ethBalance],
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
    claimEth: () => {
      const owner = dashboard.ownersByHeir[0]
      if (!owner) return Promise.reject('No inheritance to claim')
      return writeContractAsync({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimETH',
      })
    },
    claimToken: (token: `0x${string}`) => {
      const owner = dashboard.ownersByHeir[0]
      if (!owner) return Promise.reject('No inheritance to claim')
      return writeContractAsync({
        abi: ritaDelegateAbi,
        address: owner,
        functionName: 'claimERC20',
        args: [token],
      })
    },
    claimMultiple: (tokens: `0x${string}`[]) => {
      const owner = dashboard.ownersByHeir[0]
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
