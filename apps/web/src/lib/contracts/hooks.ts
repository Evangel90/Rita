import { useMemo } from 'react'
import { formatEther } from 'viem'
import { useAccount, useBalance, useReadContract, useReadContracts, useWriteContract } from 'wagmi'
import { ritaDelegateAbi, ritaRegistryAbi } from './abi'
import { CONTRACTS } from './config'

export function useRitaDashboardData() {
  const { address } = useAccount()

  const { data } = useReadContracts({
    contracts: [
      { abi: ritaDelegateAbi, address: CONTRACTS.ritaDelegate, functionName: 'getRitaState' },
      { abi: ritaDelegateAbi, address: CONTRACTS.ritaDelegate, functionName: 'getNextPingtime' },
      { abi: ritaDelegateAbi, address: CONTRACTS.ritaDelegate, functionName: 'getThreshold' },
      { abi: ritaDelegateAbi, address: CONTRACTS.ritaDelegate, functionName: 'getSupportedTokens' },
      { abi: ritaDelegateAbi, address: CONTRACTS.ritaDelegate, functionName: 'getHeirs' },
      {
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'getOwnersByHeir',
        args: [address ?? '0x0000000000000000000000000000000000000000'],
      },
    ],
    query: { enabled: Boolean(address) },
  })

  const { data: isHeir } = useReadContract({
    abi: ritaDelegateAbi,
    address: CONTRACTS.ritaDelegate,
    functionName: 'getIsHeirs',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: Boolean(address) },
  })

  const { data: ethBalance } = useBalance({
    address: CONTRACTS.ritaDelegate,
  })

  return useMemo(
    () => ({
      ritaState: data?.[0].result as string | undefined,
      nextPing: data?.[1].result as bigint | undefined,
      threshold: data?.[2].result as bigint | undefined,
      supportedTokens: (data?.[3].result as `0x${string}`[] | undefined) ?? [],
      heirs: (data?.[4].result as `0x${string}`[] | undefined) ?? [],
      ownersByHeir: (data?.[5].result as `0x${string}`[] | undefined) ?? [],
      isHeir: Boolean(isHeir),
      delegateEthBalance: ethBalance ? formatEther(ethBalance.value) : '0',
    }),
    [data, ethBalance, isHeir],
  )
}

export function useRitaActions() {
  const { writeContractAsync, isPending } = useWriteContract()

  return {
    isPending,
    claimEth: () =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: CONTRACTS.ritaDelegate,
        functionName: 'claimETH',
      }),
    claimToken: (token: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: CONTRACTS.ritaDelegate,
        functionName: 'claimERC20',
        args: [token],
      }),
    claimMultiple: (tokens: `0x${string}`[]) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: CONTRACTS.ritaDelegate,
        functionName: 'claimMultipleTokens',
        args: [tokens],
      }),
    ping: () =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: CONTRACTS.ritaDelegate,
        functionName: 'ping',
      }),
    updateThreshold: (value: bigint) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: CONTRACTS.ritaDelegate,
        functionName: 'updateThreshold',
        args: [value],
      }),
    addHeir: (heir: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: CONTRACTS.ritaDelegate,
        functionName: 'addHeir',
        args: [heir],
      }),
    removeHeir: (heir: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: CONTRACTS.ritaDelegate,
        functionName: 'removeHeir',
        args: [heir],
      }),
    addToken: (token: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: CONTRACTS.ritaDelegate,
        functionName: 'addToken',
        args: [token],
      }),
    removeToken: (token: `0x${string}`) =>
      writeContractAsync({
        abi: ritaDelegateAbi,
        address: CONTRACTS.ritaDelegate,
        functionName: 'removeToken',
        args: [token],
      }),
    registerHeir: (heir: `0x${string}`) =>
      writeContractAsync({
        abi: ritaRegistryAbi,
        address: CONTRACTS.ritaRegistry,
        functionName: 'registerHeir',
        args: [heir],
      }),
  }
}
