import { getAddress } from 'viem'

export const CHAIN_ID = 4202

export const CONTRACTS = {
  ritaDelegate: getAddress('0xFD055766aF5DC43eAC17a0fBf8A5f520dBE49316'),
  ritaRegistry: getAddress('0x9CD0d7015A6ea12BbED3186C52C37545a0e24928'),
} as const
