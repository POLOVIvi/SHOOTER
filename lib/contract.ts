export const BASE_CHAIN_ID = 8453;
// INSERT DEPLOYED CONTRACT ADDRESS HERE AFTER DEPLOY
export const PAYWALL_ADDRESS = '0x0000000000000000000000000000000000000000';

export const PAYWALL_ABI = [
  {
    type: 'function',
    name: 'pay',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'hasPaid',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'priceWei',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'Paid',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
    anonymous: false,
  },
] as const;
