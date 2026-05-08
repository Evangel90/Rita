import { getAddress } from 'viem'

export const CHAIN_ID = 11155111

export const CONTRACTS = {
  // ritaDelegate: getAddress('0xFD055766aF5DC43eAC17a0fBf8A5f520dBE49316'),
  ritaDelegate: getAddress('0x7BE5E09026Aff169C6534fbdf4741C5Ab7185437'),
  ritaRegistry: getAddress('0x9CD0d7015A6ea12BbED3186C52C37545a0e24928'),
  metamaskDelegate: getAddress('0x63c0c19aa24777aa0d610243f8294a07dae32b1b'),
} as const
