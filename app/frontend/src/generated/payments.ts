import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EnhancedLDAOTreasury
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const enhancedLdaoTreasuryAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_ldaoToken', internalType: 'address', type: 'address' },
      { name: '_usdcToken', internalType: 'address', type: 'address' },
      {
        name: '_multiSigWallet',
        internalType: 'address payable',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'donationId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'description',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'CharityDisbursement',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'donationId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'receiptHash',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'CharityDonationVerified',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newAllocation',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'availableBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CharityFundUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'charityAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'verified', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'CharityVerified',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'dailyVolume',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'threshold',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CircuitBreakerTriggered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newPrice',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'demandMultiplier',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DynamicPriceUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'reason',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'timestamp',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'EmergencyStop',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'FundsWithdrawn',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'KYCStatusUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'buyer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'ldaoAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'usdAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'ethAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'paymentMethod',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'LDAOPurchased',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldWallet',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newWallet',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'MultiSigWalletUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldPrice',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newPrice',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PriceUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tierId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'threshold',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'discountBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PricingTierAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'active', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'SalesStatusUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'whitelisted',
        internalType: 'bool',
        type: 'bool',
        indexed: false,
      },
    ],
    name: 'WhitelistUpdated',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MULTI_SIG_THRESHOLD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'threshold', internalType: 'uint256', type: 'uint256' },
      { name: 'discountBps', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'addPricingTier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'basePriceInUSD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'users', internalType: 'address[]', type: 'address[]' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'batchUpdateKYC',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'charityDonations',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'proposalId', internalType: 'uint256', type: 'uint256' },
      { name: 'isVerified', internalType: 'bool', type: 'bool' },
      { name: 'verificationReceipt', internalType: 'string', type: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'charityDonationsHistory',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'charityFund',
    outputs: [
      { name: 'totalDisbursed', internalType: 'uint256', type: 'uint256' },
      { name: 'totalReceived', internalType: 'uint256', type: 'uint256' },
      { name: 'availableBalance', internalType: 'uint256', type: 'uint256' },
      { name: 'charityCount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'charityFundAllocation',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'currentDayPurchases',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'dailyPurchaseLimit',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'dailyPurchases',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'demandMultiplier',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'recipient', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'proposalId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'disburseCharityFunds',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'reason', internalType: 'string', type: 'string' }],
    name: 'emergencyPause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'emergencyStopThreshold',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
    ],
    name: 'emergencyWithdrawLDAO',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'executedTransactions',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'donationId', internalType: 'uint256', type: 'uint256' }],
    name: 'getCharityDonation',
    outputs: [
      {
        name: '',
        internalType: 'struct EnhancedLDAOTreasury.CharityDonation',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'recipient', internalType: 'address', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'proposalId', internalType: 'uint256', type: 'uint256' },
          { name: 'isVerified', internalType: 'bool', type: 'bool' },
          {
            name: 'verificationReceipt',
            internalType: 'string',
            type: 'string',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'charityAddress', internalType: 'address', type: 'address' },
    ],
    name: 'getCharityDonationsHistory',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCharityFund',
    outputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCircuitBreakerStatus',
    outputs: [
      { name: 'dailyLimit', internalType: 'uint256', type: 'uint256' },
      { name: 'emergencyThreshold', internalType: 'uint256', type: 'uint256' },
      { name: 'currentVolume', internalType: 'uint256', type: 'uint256' },
      { name: 'nearEmergencyThreshold', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCurrentDayPurchases',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getDynamicPricingInfo',
    outputs: [
      { name: 'currentPrice', internalType: 'uint256', type: 'uint256' },
      { name: 'basePrice', internalType: 'uint256', type: 'uint256' },
      { name: 'multiplier', internalType: 'uint256', type: 'uint256' },
      { name: 'nextUpdateTime', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tierId', internalType: 'uint256', type: 'uint256' }],
    name: 'getPricingTier',
    outputs: [
      { name: 'threshold', internalType: 'uint256', type: 'uint256' },
      { name: 'discountBps', internalType: 'uint256', type: 'uint256' },
      { name: 'active', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'ldaoAmount', internalType: 'uint256', type: 'uint256' }],
    name: 'getQuote',
    outputs: [
      { name: 'usdAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ethAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'usdcAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'discount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTreasuryBalance',
    outputs: [
      { name: 'ldaoBalance', internalType: 'uint256', type: 'uint256' },
      { name: 'ethBalance', internalType: 'uint256', type: 'uint256' },
      { name: 'usdcBalance', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserDailyPurchases',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserPurchaseHistory',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'charityAddress', internalType: 'address', type: 'address' },
    ],
    name: 'isCharityVerified',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'kycApproved',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'kycRequired',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'lastPriceUpdate',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'lastPurchaseDay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'lastResetDay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ldaoPriceInUSD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ldaoToken',
    outputs: [
      { name: '', internalType: 'contract LDAOToken', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxPriceMultiplier',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxPurchaseAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minCharityDonationAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minPurchaseAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'multiSigWallet',
    outputs: [
      { name: '', internalType: 'contract MultiSigWallet', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextCharityDonationId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextTierId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'priceUpdateInterval',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'pricingTiers',
    outputs: [
      { name: 'threshold', internalType: 'uint256', type: 'uint256' },
      { name: 'discountBps', internalType: 'uint256', type: 'uint256' },
      { name: 'active', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'purchaseHistory',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'ldaoAmount', internalType: 'uint256', type: 'uint256' }],
    name: 'purchaseWithETH',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'ldaoAmount', internalType: 'uint256', type: 'uint256' }],
    name: 'purchaseWithUSDC',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'salesActive',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'required', internalType: 'bool', type: 'bool' }],
    name: 'setKYCRequired',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'active', internalType: 'bool', type: 'bool' }],
    name: 'setSalesActive',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalRevenue',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSold',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newAllocation', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateCharityFundAllocation',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_dailyLimit', internalType: 'uint256', type: 'uint256' },
      { name: '_emergencyThreshold', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateCircuitBreakerParams',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_maxPriceMultiplier', internalType: 'uint256', type: 'uint256' },
      {
        name: '_priceUpdateInterval',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'updateDynamicPricingParams',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'updateKYCStatus',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newPriceInUSD', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateLDAOPrice',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'newMultiSigWallet',
        internalType: 'address payable',
        type: 'address',
      },
    ],
    name: 'updateMultiSigWallet',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'threshold', internalType: 'uint256', type: 'uint256' },
      { name: 'discountBps', internalType: 'uint256', type: 'uint256' },
      { name: 'active', internalType: 'bool', type: 'bool' },
    ],
    name: 'updatePricingTier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'minAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'maxAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updatePurchaseLimits',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'whitelisted', internalType: 'bool', type: 'bool' },
    ],
    name: 'updateWhitelist',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'usdcToken',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'verifiedCharities',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'charityAddress', internalType: 'address', type: 'address' },
      { name: 'verify', internalType: 'bool', type: 'bool' },
    ],
    name: 'verifyCharity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'donationId', internalType: 'uint256', type: 'uint256' },
      { name: 'receiptHash', internalType: 'string', type: 'string' },
    ],
    name: 'verifyCharityDonation',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'whitelist',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address payable', type: 'address' },
    ],
    name: 'withdrawETH',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
    ],
    name: 'withdrawToken',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const enhancedLdaoTreasuryAddress = {
  11155111: '0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const enhancedLdaoTreasuryConfig = {
  address: enhancedLdaoTreasuryAddress,
  abi: enhancedLdaoTreasuryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// LDAOTreasury
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const ldaoTreasuryAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_ldaoToken', internalType: 'address', type: 'address' },
      { name: '_usdcToken', internalType: 'address', type: 'address' },
      {
        name: '_multiSigWallet',
        internalType: 'address payable',
        type: 'address',
      },
      { name: '_governance', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'EnforcedPause' },
  { type: 'error', inputs: [], name: 'ExpectedPause' },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'dailyVolume',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'threshold',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CircuitBreakerTriggered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newPrice',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'demandMultiplier',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DynamicPriceUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'reason',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'timestamp',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'EmergencyStop',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'FundsWithdrawn',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'target',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'data', internalType: 'bytes', type: 'bytes', indexed: false },
    ],
    name: 'GovernanceOperationExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'newGovernance',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'GovernanceUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'KYCStatusUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'buyer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'ldaoAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'usdAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'ethAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'paymentMethod',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'LDAOPurchased',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldWallet',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newWallet',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'MultiSigWalletUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Paused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldPrice',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newPrice',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PriceUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tierId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'threshold',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'discountBps',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'PricingTierAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'active', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'SalesStatusUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'account',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'Unpaused',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'whitelisted',
        internalType: 'bool',
        type: 'bool',
        indexed: false,
      },
    ],
    name: 'WhitelistUpdated',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MULTI_SIG_THRESHOLD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'threshold', internalType: 'uint256', type: 'uint256' },
      { name: 'discountBps', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'addPricingTier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'basePriceInUSD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'users', internalType: 'address[]', type: 'address[]' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'batchUpdateKYC',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'currentDayPurchases',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'dailyPurchaseLimit',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'dailyPurchases',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'demandMultiplier',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'reason', internalType: 'string', type: 'string' }],
    name: 'emergencyPause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'emergencyStopThreshold',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
    ],
    name: 'emergencyWithdrawLDAO',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'target', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'executeGovernanceOperation',
    outputs: [{ name: 'success', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'executedTransactions',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCircuitBreakerStatus',
    outputs: [
      { name: 'dailyLimit', internalType: 'uint256', type: 'uint256' },
      { name: 'emergencyThreshold', internalType: 'uint256', type: 'uint256' },
      { name: 'currentVolume', internalType: 'uint256', type: 'uint256' },
      { name: 'nearEmergencyThreshold', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCurrentDayPurchases',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getDynamicPricingInfo',
    outputs: [
      { name: 'currentPrice', internalType: 'uint256', type: 'uint256' },
      { name: 'basePrice', internalType: 'uint256', type: 'uint256' },
      { name: 'multiplier', internalType: 'uint256', type: 'uint256' },
      { name: 'nextUpdateTime', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tierId', internalType: 'uint256', type: 'uint256' }],
    name: 'getPricingTier',
    outputs: [
      { name: 'threshold', internalType: 'uint256', type: 'uint256' },
      { name: 'discountBps', internalType: 'uint256', type: 'uint256' },
      { name: 'active', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'ldaoAmount', internalType: 'uint256', type: 'uint256' }],
    name: 'getQuote',
    outputs: [
      { name: 'usdAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'ethAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'usdcAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'discount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTreasuryBalance',
    outputs: [
      { name: 'ldaoBalance', internalType: 'uint256', type: 'uint256' },
      { name: 'ethBalance', internalType: 'uint256', type: 'uint256' },
      { name: 'usdcBalance', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserDailyPurchases',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserPurchaseHistory',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'governance',
    outputs: [
      { name: '', internalType: 'contract Governance', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
    ],
    name: 'governanceWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'kycApproved',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'kycRequired',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'lastPriceUpdate',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'lastPurchaseDay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'lastResetDay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ldaoPriceInUSD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ldaoToken',
    outputs: [
      { name: '', internalType: 'contract LDAOToken', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxPriceMultiplier',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxPurchaseAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minPurchaseAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'multiSigWallet',
    outputs: [
      { name: '', internalType: 'contract MultiSigWallet', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextTierId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'paused',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'priceUpdateInterval',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'pricingTiers',
    outputs: [
      { name: 'threshold', internalType: 'uint256', type: 'uint256' },
      { name: 'discountBps', internalType: 'uint256', type: 'uint256' },
      { name: 'active', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'purchaseHistory',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'ldaoAmount', internalType: 'uint256', type: 'uint256' }],
    name: 'purchaseWithETH',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'ldaoAmount', internalType: 'uint256', type: 'uint256' }],
    name: 'purchaseWithUSDC',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'salesActive',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'required', internalType: 'bool', type: 'bool' }],
    name: 'setKYCRequired',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'active', internalType: 'bool', type: 'bool' }],
    name: 'setSalesActive',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalRevenue',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSold',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_dailyLimit', internalType: 'uint256', type: 'uint256' },
      { name: '_emergencyThreshold', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateCircuitBreakerParams',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_maxPriceMultiplier', internalType: 'uint256', type: 'uint256' },
      {
        name: '_priceUpdateInterval',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'updateDynamicPricingParams',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newGovernance', internalType: 'address', type: 'address' },
    ],
    name: 'updateGovernance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'updateKYCStatus',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newPriceInUSD', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateLDAOPrice',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'newMultiSigWallet',
        internalType: 'address payable',
        type: 'address',
      },
    ],
    name: 'updateMultiSigWallet',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'threshold', internalType: 'uint256', type: 'uint256' },
      { name: 'discountBps', internalType: 'uint256', type: 'uint256' },
      { name: 'active', internalType: 'bool', type: 'bool' },
    ],
    name: 'updatePricingTier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'minAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'maxAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updatePurchaseLimits',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'whitelisted', internalType: 'bool', type: 'bool' },
    ],
    name: 'updateWhitelist',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'usdcToken',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'whitelist',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address payable', type: 'address' },
    ],
    name: 'withdrawETH',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
    ],
    name: 'withdrawToken',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const ldaoTreasuryAddress = {
  11155111: '0xeF85C8CcC03320dA32371940b315D563be2585e5',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const ldaoTreasuryConfig = {
  address: ldaoTreasuryAddress,
  abi: ldaoTreasuryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PaymentRouter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const paymentRouterAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_feeBasisPoints', internalType: 'uint256', type: 'uint256' },
      { name: '_feeCollector', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'fee', internalType: 'uint256', type: 'uint256', indexed: false },
      { name: 'memo', internalType: 'string', type: 'string', indexed: false },
    ],
    name: 'PaymentSent',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'token',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: 'supported', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'TokenSupported',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'supported', internalType: 'bool', type: 'bool' },
    ],
    name: 'setTokenSupported',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_feeBasisPoints', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'setFee',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_feeCollector', internalType: 'address', type: 'address' },
    ],
    name: 'setFeeCollector',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'sendEthPayment',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'token', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'memo', internalType: 'string', type: 'string' },
    ],
    name: 'sendTokenPayment',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'withdrawEth',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'withdrawToken',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'supportedTokens',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'feeBasisPoints',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'feeCollector',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
] as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const paymentRouterAddress = {
  8453: '0x3456789012345678901234567890123456789012',
  84532: '0x3456789012345678901234567890123456789012',
  11155111: '0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50',
} as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const paymentRouterConfig = {
  address: paymentRouterAddress,
  abi: paymentRouterAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TipRouter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const tipRouterAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_ldao', internalType: 'address', type: 'address' },
      { name: '_rewardPool', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'OwnableInvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
  },
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  { type: 'event', anonymous: false, inputs: [], name: 'FeeTiersUpdated' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'previousOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newOwner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OwnershipTransferred',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tipper',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'creator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'SubscriptionCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tipper',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'creator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'interval',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'SubscriptionCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tipper',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'creator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'fee', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'SubscriptionPayment',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'postId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'comment',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'TipCommentAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'minAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'maxAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'cooldown',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'TipLimitsUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'postId',
        internalType: 'bytes32',
        type: 'bytes32',
        indexed: true,
      },
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'fee', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Tipped',
  },
  {
    type: 'function',
    inputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    name: 'calculateFee',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'creator', internalType: 'address', type: 'address' }],
    name: 'cancelSubscription',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'creator', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'interval', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'createSubscription',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'feeBps',
    outputs: [{ name: '', internalType: 'uint96', type: 'uint96' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'feeTiers',
    outputs: [
      { name: 'threshold', internalType: 'uint256', type: 'uint256' },
      { name: 'feeBps', internalType: 'uint96', type: 'uint96' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tipper', internalType: 'address', type: 'address' },
      { name: 'creator', internalType: 'address', type: 'address' },
    ],
    name: 'getSubscription',
    outputs: [
      {
        name: '',
        internalType: 'struct TipRouter.Subscription',
        type: 'tuple',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'interval', internalType: 'uint256', type: 'uint256' },
          { name: 'nextPayment', internalType: 'uint256', type: 'uint256' },
          { name: 'active', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'lastTipTime',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ldao',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxTipAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minTipAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'postId', internalType: 'bytes32', type: 'bytes32' },
      { name: 'creator', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'permitAndTip',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tipper', internalType: 'address', type: 'address' }],
    name: 'processSubscriptionPayment',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'rewardPool',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '_bps', internalType: 'uint96', type: 'uint96' }],
    name: 'setFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: '_feeTiers',
        internalType: 'struct TipRouter.FeeTier[]',
        type: 'tuple[]',
        components: [
          { name: 'threshold', internalType: 'uint256', type: 'uint256' },
          { name: 'feeBps', internalType: 'uint96', type: 'uint96' },
        ],
      },
    ],
    name: 'setFeeTiers',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_minTip', internalType: 'uint256', type: 'uint256' },
      { name: '_maxTip', internalType: 'uint256', type: 'uint256' },
      { name: '_cooldown', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'setTipLimits',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'subscriptions',
    outputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'interval', internalType: 'uint256', type: 'uint256' },
      { name: 'nextPayment', internalType: 'uint256', type: 'uint256' },
      { name: 'active', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'postId', internalType: 'bytes32', type: 'bytes32' },
      { name: 'creator', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'tip',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'tipComments',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'tipCooldown',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'postId', internalType: 'bytes32', type: 'bytes32' },
      { name: 'creator', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'comment', internalType: 'string', type: 'string' },
    ],
    name: 'tipWithComment',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const tipRouterAddress = {
  11155111: '0x755Fe81411c86019fff6033E0567A4D93b57281b',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const tipRouterConfig = {
  address: tipRouterAddress,
  abi: tipRouterAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasury = /*#__PURE__*/ createUseReadContract({
  abi: enhancedLdaoTreasuryAbi,
  address: enhancedLdaoTreasuryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"MULTI_SIG_THRESHOLD"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryMultiSigThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'MULTI_SIG_THRESHOLD',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"basePriceInUSD"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryBasePriceInUsd =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'basePriceInUSD',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"charityDonations"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryCharityDonations =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'charityDonations',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"charityDonationsHistory"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryCharityDonationsHistory =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'charityDonationsHistory',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"charityFund"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryCharityFund =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'charityFund',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"charityFundAllocation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryCharityFundAllocation =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'charityFundAllocation',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"currentDayPurchases"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryCurrentDayPurchases =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'currentDayPurchases',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"dailyPurchaseLimit"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryDailyPurchaseLimit =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'dailyPurchaseLimit',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"dailyPurchases"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryDailyPurchases =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'dailyPurchases',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"demandMultiplier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryDemandMultiplier =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'demandMultiplier',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"emergencyStopThreshold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryEmergencyStopThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'emergencyStopThreshold',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"executedTransactions"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryExecutedTransactions =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'executedTransactions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getCharityDonation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetCharityDonation =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getCharityDonation',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getCharityDonationsHistory"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetCharityDonationsHistory =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getCharityDonationsHistory',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getCharityFund"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetCharityFund =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getCharityFund',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getCircuitBreakerStatus"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetCircuitBreakerStatus =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getCircuitBreakerStatus',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getCurrentDayPurchases"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetCurrentDayPurchases =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getCurrentDayPurchases',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getDynamicPricingInfo"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetDynamicPricingInfo =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getDynamicPricingInfo',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getPricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetPricingTier =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getPricingTier',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getQuote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetQuote =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getQuote',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getTreasuryBalance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetTreasuryBalance =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getTreasuryBalance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getUserDailyPurchases"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetUserDailyPurchases =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getUserDailyPurchases',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"getUserPurchaseHistory"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryGetUserPurchaseHistory =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'getUserPurchaseHistory',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"isCharityVerified"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryIsCharityVerified =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'isCharityVerified',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"kycApproved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryKycApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'kycApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"kycRequired"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryKycRequired =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'kycRequired',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"lastPriceUpdate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryLastPriceUpdate =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'lastPriceUpdate',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"lastPurchaseDay"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryLastPurchaseDay =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'lastPurchaseDay',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"lastResetDay"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryLastResetDay =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'lastResetDay',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"ldaoPriceInUSD"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryLdaoPriceInUsd =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'ldaoPriceInUSD',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"ldaoToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryLdaoToken =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'ldaoToken',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"maxPriceMultiplier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryMaxPriceMultiplier =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'maxPriceMultiplier',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"maxPurchaseAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryMaxPurchaseAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'maxPurchaseAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"minCharityDonationAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryMinCharityDonationAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'minCharityDonationAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"minPurchaseAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryMinPurchaseAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'minPurchaseAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"multiSigWallet"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryMultiSigWallet =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'multiSigWallet',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"nextCharityDonationId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryNextCharityDonationId =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'nextCharityDonationId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"nextTierId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryNextTierId =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'nextTierId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryOwner =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'owner',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"paused"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryPaused =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'paused',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"priceUpdateInterval"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryPriceUpdateInterval =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'priceUpdateInterval',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"pricingTiers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryPricingTiers =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'pricingTiers',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"purchaseHistory"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryPurchaseHistory =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'purchaseHistory',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"salesActive"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasurySalesActive =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'salesActive',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"totalRevenue"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryTotalRevenue =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'totalRevenue',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"totalSold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryTotalSold =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'totalSold',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"usdcToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryUsdcToken =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'usdcToken',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"verifiedCharities"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryVerifiedCharities =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'verifiedCharities',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"whitelist"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useReadEnhancedLdaoTreasuryWhitelist =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'whitelist',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasury =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"addPricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryAddPricingTier =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'addPricingTier',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"batchUpdateKYC"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryBatchUpdateKyc =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'batchUpdateKYC',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"disburseCharityFunds"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryDisburseCharityFunds =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'disburseCharityFunds',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"emergencyPause"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryEmergencyPause =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'emergencyPause',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"emergencyWithdrawLDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryEmergencyWithdrawLdao =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'emergencyWithdrawLDAO',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"purchaseWithETH"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryPurchaseWithEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'purchaseWithETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"purchaseWithUSDC"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryPurchaseWithUsdc =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'purchaseWithUSDC',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"setKYCRequired"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasurySetKycRequired =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'setKYCRequired',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"setSalesActive"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasurySetSalesActive =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'setSalesActive',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"unpause"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUnpause =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'unpause',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateCharityFundAllocation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUpdateCharityFundAllocation =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateCharityFundAllocation',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateCircuitBreakerParams"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUpdateCircuitBreakerParams =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateCircuitBreakerParams',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateDynamicPricingParams"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUpdateDynamicPricingParams =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateDynamicPricingParams',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateKYCStatus"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUpdateKycStatus =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateKYCStatus',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateLDAOPrice"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUpdateLdaoPrice =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateLDAOPrice',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateMultiSigWallet"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUpdateMultiSigWallet =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateMultiSigWallet',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updatePricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUpdatePricingTier =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updatePricingTier',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updatePurchaseLimits"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUpdatePurchaseLimits =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updatePurchaseLimits',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateWhitelist"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryUpdateWhitelist =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateWhitelist',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"verifyCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryVerifyCharity =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'verifyCharity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"verifyCharityDonation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryVerifyCharityDonation =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'verifyCharityDonation',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"withdrawETH"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryWithdrawEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'withdrawETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"withdrawToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWriteEnhancedLdaoTreasuryWithdrawToken =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'withdrawToken',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasury =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"addPricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryAddPricingTier =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'addPricingTier',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"batchUpdateKYC"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryBatchUpdateKyc =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'batchUpdateKYC',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"disburseCharityFunds"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryDisburseCharityFunds =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'disburseCharityFunds',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"emergencyPause"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryEmergencyPause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'emergencyPause',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"emergencyWithdrawLDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryEmergencyWithdrawLdao =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'emergencyWithdrawLDAO',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"purchaseWithETH"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryPurchaseWithEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'purchaseWithETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"purchaseWithUSDC"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryPurchaseWithUsdc =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'purchaseWithUSDC',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"setKYCRequired"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasurySetKycRequired =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'setKYCRequired',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"setSalesActive"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasurySetSalesActive =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'setSalesActive',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"unpause"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUnpause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'unpause',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateCharityFundAllocation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUpdateCharityFundAllocation =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateCharityFundAllocation',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateCircuitBreakerParams"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUpdateCircuitBreakerParams =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateCircuitBreakerParams',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateDynamicPricingParams"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUpdateDynamicPricingParams =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateDynamicPricingParams',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateKYCStatus"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUpdateKycStatus =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateKYCStatus',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateLDAOPrice"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUpdateLdaoPrice =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateLDAOPrice',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateMultiSigWallet"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUpdateMultiSigWallet =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateMultiSigWallet',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updatePricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUpdatePricingTier =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updatePricingTier',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updatePurchaseLimits"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUpdatePurchaseLimits =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updatePurchaseLimits',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"updateWhitelist"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryUpdateWhitelist =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'updateWhitelist',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"verifyCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryVerifyCharity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'verifyCharity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"verifyCharityDonation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryVerifyCharityDonation =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'verifyCharityDonation',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"withdrawETH"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryWithdrawEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'withdrawETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `functionName` set to `"withdrawToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useSimulateEnhancedLdaoTreasuryWithdrawToken =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    functionName: 'withdrawToken',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"CharityDisbursement"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryCharityDisbursementEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'CharityDisbursement',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"CharityDonationVerified"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryCharityDonationVerifiedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'CharityDonationVerified',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"CharityFundUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryCharityFundUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'CharityFundUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"CharityVerified"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryCharityVerifiedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'CharityVerified',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"CircuitBreakerTriggered"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryCircuitBreakerTriggeredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'CircuitBreakerTriggered',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"DynamicPriceUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryDynamicPriceUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'DynamicPriceUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"EmergencyStop"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryEmergencyStopEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'EmergencyStop',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"FundsWithdrawn"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryFundsWithdrawnEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'FundsWithdrawn',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"KYCStatusUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryKycStatusUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'KYCStatusUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"LDAOPurchased"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryLdaoPurchasedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'LDAOPurchased',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"MultiSigWalletUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryMultiSigWalletUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'MultiSigWalletUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"Paused"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryPausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'Paused',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"PriceUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryPriceUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'PriceUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"PricingTierAdded"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryPricingTierAddedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'PricingTierAdded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"SalesStatusUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasurySalesStatusUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'SalesStatusUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"Unpaused"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryUnpausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'Unpaused',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedLdaoTreasuryAbi}__ and `eventName` set to `"WhitelistUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5)
 */
export const useWatchEnhancedLdaoTreasuryWhitelistUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedLdaoTreasuryAbi,
    address: enhancedLdaoTreasuryAddress,
    eventName: 'WhitelistUpdated',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasury = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTreasuryAbi,
  address: ldaoTreasuryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"MULTI_SIG_THRESHOLD"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryMultiSigThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'MULTI_SIG_THRESHOLD',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"basePriceInUSD"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryBasePriceInUsd =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'basePriceInUSD',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"currentDayPurchases"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryCurrentDayPurchases =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'currentDayPurchases',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"dailyPurchaseLimit"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryDailyPurchaseLimit =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'dailyPurchaseLimit',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"dailyPurchases"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryDailyPurchases =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'dailyPurchases',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"demandMultiplier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryDemandMultiplier =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'demandMultiplier',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"emergencyStopThreshold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryEmergencyStopThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'emergencyStopThreshold',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"executedTransactions"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryExecutedTransactions =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'executedTransactions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"getCircuitBreakerStatus"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryGetCircuitBreakerStatus =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'getCircuitBreakerStatus',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"getCurrentDayPurchases"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryGetCurrentDayPurchases =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'getCurrentDayPurchases',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"getDynamicPricingInfo"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryGetDynamicPricingInfo =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'getDynamicPricingInfo',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"getPricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryGetPricingTier =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'getPricingTier',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"getQuote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryGetQuote = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTreasuryAbi,
  address: ldaoTreasuryAddress,
  functionName: 'getQuote',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"getTreasuryBalance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryGetTreasuryBalance =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'getTreasuryBalance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"getUserDailyPurchases"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryGetUserDailyPurchases =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'getUserDailyPurchases',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"getUserPurchaseHistory"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryGetUserPurchaseHistory =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'getUserPurchaseHistory',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"governance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryGovernance =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'governance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"kycApproved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryKycApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'kycApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"kycRequired"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryKycRequired =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'kycRequired',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"lastPriceUpdate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryLastPriceUpdate =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'lastPriceUpdate',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"lastPurchaseDay"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryLastPurchaseDay =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'lastPurchaseDay',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"lastResetDay"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryLastResetDay =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'lastResetDay',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"ldaoPriceInUSD"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryLdaoPriceInUsd =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'ldaoPriceInUSD',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"ldaoToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryLdaoToken = /*#__PURE__*/ createUseReadContract(
  {
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'ldaoToken',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"maxPriceMultiplier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryMaxPriceMultiplier =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'maxPriceMultiplier',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"maxPurchaseAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryMaxPurchaseAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'maxPurchaseAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"minPurchaseAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryMinPurchaseAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'minPurchaseAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"multiSigWallet"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryMultiSigWallet =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'multiSigWallet',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"nextTierId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryNextTierId =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'nextTierId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryOwner = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTreasuryAbi,
  address: ldaoTreasuryAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"paused"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryPaused = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTreasuryAbi,
  address: ldaoTreasuryAddress,
  functionName: 'paused',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"priceUpdateInterval"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryPriceUpdateInterval =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'priceUpdateInterval',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"pricingTiers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryPricingTiers =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'pricingTiers',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"purchaseHistory"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryPurchaseHistory =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'purchaseHistory',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"salesActive"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasurySalesActive =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'salesActive',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"totalRevenue"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryTotalRevenue =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'totalRevenue',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"totalSold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryTotalSold = /*#__PURE__*/ createUseReadContract(
  {
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'totalSold',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"usdcToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryUsdcToken = /*#__PURE__*/ createUseReadContract(
  {
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'usdcToken',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"whitelist"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useReadLdaoTreasuryWhitelist = /*#__PURE__*/ createUseReadContract(
  {
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'whitelist',
  },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasury = /*#__PURE__*/ createUseWriteContract({
  abi: ldaoTreasuryAbi,
  address: ldaoTreasuryAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"addPricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryAddPricingTier =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'addPricingTier',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"batchUpdateKYC"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryBatchUpdateKyc =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'batchUpdateKYC',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"emergencyPause"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryEmergencyPause =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'emergencyPause',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"emergencyWithdrawLDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryEmergencyWithdrawLdao =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'emergencyWithdrawLDAO',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"executeGovernanceOperation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryExecuteGovernanceOperation =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'executeGovernanceOperation',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"governanceWithdraw"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryGovernanceWithdraw =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'governanceWithdraw',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"purchaseWithETH"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryPurchaseWithEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'purchaseWithETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"purchaseWithUSDC"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryPurchaseWithUsdc =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'purchaseWithUSDC',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"setKYCRequired"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasurySetKycRequired =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'setKYCRequired',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"setSalesActive"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasurySetSalesActive =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'setSalesActive',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"unpause"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUnpause = /*#__PURE__*/ createUseWriteContract(
  {
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'unpause',
  },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateCircuitBreakerParams"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUpdateCircuitBreakerParams =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateCircuitBreakerParams',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateDynamicPricingParams"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUpdateDynamicPricingParams =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateDynamicPricingParams',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateGovernance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUpdateGovernance =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateGovernance',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateKYCStatus"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUpdateKycStatus =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateKYCStatus',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateLDAOPrice"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUpdateLdaoPrice =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateLDAOPrice',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateMultiSigWallet"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUpdateMultiSigWallet =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateMultiSigWallet',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updatePricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUpdatePricingTier =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updatePricingTier',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updatePurchaseLimits"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUpdatePurchaseLimits =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updatePurchaseLimits',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateWhitelist"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryUpdateWhitelist =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateWhitelist',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"withdrawETH"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryWithdrawEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'withdrawETH',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"withdrawToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWriteLdaoTreasuryWithdrawToken =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'withdrawToken',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasury = /*#__PURE__*/ createUseSimulateContract({
  abi: ldaoTreasuryAbi,
  address: ldaoTreasuryAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"addPricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryAddPricingTier =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'addPricingTier',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"batchUpdateKYC"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryBatchUpdateKyc =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'batchUpdateKYC',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"emergencyPause"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryEmergencyPause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'emergencyPause',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"emergencyWithdrawLDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryEmergencyWithdrawLdao =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'emergencyWithdrawLDAO',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"executeGovernanceOperation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryExecuteGovernanceOperation =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'executeGovernanceOperation',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"governanceWithdraw"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryGovernanceWithdraw =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'governanceWithdraw',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"purchaseWithETH"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryPurchaseWithEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'purchaseWithETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"purchaseWithUSDC"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryPurchaseWithUsdc =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'purchaseWithUSDC',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"setKYCRequired"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasurySetKycRequired =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'setKYCRequired',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"setSalesActive"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasurySetSalesActive =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'setSalesActive',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"unpause"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUnpause =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'unpause',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateCircuitBreakerParams"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUpdateCircuitBreakerParams =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateCircuitBreakerParams',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateDynamicPricingParams"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUpdateDynamicPricingParams =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateDynamicPricingParams',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateGovernance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUpdateGovernance =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateGovernance',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateKYCStatus"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUpdateKycStatus =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateKYCStatus',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateLDAOPrice"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUpdateLdaoPrice =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateLDAOPrice',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateMultiSigWallet"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUpdateMultiSigWallet =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateMultiSigWallet',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updatePricingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUpdatePricingTier =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updatePricingTier',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updatePurchaseLimits"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUpdatePurchaseLimits =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updatePurchaseLimits',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"updateWhitelist"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryUpdateWhitelist =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'updateWhitelist',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"withdrawETH"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryWithdrawEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'withdrawETH',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `functionName` set to `"withdrawToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useSimulateLdaoTreasuryWithdrawToken =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    functionName: 'withdrawToken',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"CircuitBreakerTriggered"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryCircuitBreakerTriggeredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'CircuitBreakerTriggered',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"DynamicPriceUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryDynamicPriceUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'DynamicPriceUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"EmergencyStop"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryEmergencyStopEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'EmergencyStop',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"FundsWithdrawn"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryFundsWithdrawnEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'FundsWithdrawn',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"GovernanceOperationExecuted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryGovernanceOperationExecutedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'GovernanceOperationExecuted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"GovernanceUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryGovernanceUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'GovernanceUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"KYCStatusUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryKycStatusUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'KYCStatusUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"LDAOPurchased"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryLdaoPurchasedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'LDAOPurchased',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"MultiSigWalletUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryMultiSigWalletUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'MultiSigWalletUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"Paused"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryPausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'Paused',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"PriceUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryPriceUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'PriceUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"PricingTierAdded"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryPricingTierAddedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'PricingTierAdded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"SalesStatusUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasurySalesStatusUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'SalesStatusUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"Unpaused"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryUnpausedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'Unpaused',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTreasuryAbi}__ and `eventName` set to `"WhitelistUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xeF85C8CcC03320dA32371940b315D563be2585e5)
 */
export const useWatchLdaoTreasuryWhitelistUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTreasuryAbi,
    address: ldaoTreasuryAddress,
    eventName: 'WhitelistUpdated',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link paymentRouterAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useReadPaymentRouter = /*#__PURE__*/ createUseReadContract({
  abi: paymentRouterAbi,
  address: paymentRouterAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"supportedTokens"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useReadPaymentRouterSupportedTokens =
  /*#__PURE__*/ createUseReadContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'supportedTokens',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"feeBasisPoints"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useReadPaymentRouterFeeBasisPoints =
  /*#__PURE__*/ createUseReadContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'feeBasisPoints',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"feeCollector"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useReadPaymentRouterFeeCollector =
  /*#__PURE__*/ createUseReadContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'feeCollector',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWritePaymentRouter = /*#__PURE__*/ createUseWriteContract({
  abi: paymentRouterAbi,
  address: paymentRouterAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setTokenSupported"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWritePaymentRouterSetTokenSupported =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setTokenSupported',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setFee"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWritePaymentRouterSetFee = /*#__PURE__*/ createUseWriteContract(
  {
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setFee',
  },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setFeeCollector"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWritePaymentRouterSetFeeCollector =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setFeeCollector',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"sendEthPayment"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWritePaymentRouterSendEthPayment =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'sendEthPayment',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"sendTokenPayment"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWritePaymentRouterSendTokenPayment =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'sendTokenPayment',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"withdrawEth"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWritePaymentRouterWithdrawEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'withdrawEth',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"withdrawToken"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWritePaymentRouterWithdrawToken =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'withdrawToken',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useSimulatePaymentRouter = /*#__PURE__*/ createUseSimulateContract(
  { abi: paymentRouterAbi, address: paymentRouterAddress },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setTokenSupported"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useSimulatePaymentRouterSetTokenSupported =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setTokenSupported',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setFee"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useSimulatePaymentRouterSetFee =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setFee',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setFeeCollector"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useSimulatePaymentRouterSetFeeCollector =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setFeeCollector',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"sendEthPayment"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useSimulatePaymentRouterSendEthPayment =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'sendEthPayment',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"sendTokenPayment"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useSimulatePaymentRouterSendTokenPayment =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'sendTokenPayment',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"withdrawEth"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useSimulatePaymentRouterWithdrawEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'withdrawEth',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"withdrawToken"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useSimulatePaymentRouterWithdrawToken =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'withdrawToken',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link paymentRouterAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWatchPaymentRouterEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link paymentRouterAbi}__ and `eventName` set to `"PaymentSent"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWatchPaymentRouterPaymentSentEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    eventName: 'PaymentSent',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link paymentRouterAbi}__ and `eventName` set to `"TokenSupported"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x3456789012345678901234567890123456789012)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50)
 */
export const useWatchPaymentRouterTokenSupportedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    eventName: 'TokenSupported',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouter = /*#__PURE__*/ createUseReadContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"calculateFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterCalculateFee = /*#__PURE__*/ createUseReadContract(
  {
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'calculateFee',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"feeBps"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterFeeBps = /*#__PURE__*/ createUseReadContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'feeBps',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"feeTiers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterFeeTiers = /*#__PURE__*/ createUseReadContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'feeTiers',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"getSubscription"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterGetSubscription =
  /*#__PURE__*/ createUseReadContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'getSubscription',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"lastTipTime"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterLastTipTime = /*#__PURE__*/ createUseReadContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'lastTipTime',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"ldao"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterLdao = /*#__PURE__*/ createUseReadContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'ldao',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"maxTipAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterMaxTipAmount = /*#__PURE__*/ createUseReadContract(
  {
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'maxTipAmount',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"minTipAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterMinTipAmount = /*#__PURE__*/ createUseReadContract(
  {
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'minTipAmount',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterOwner = /*#__PURE__*/ createUseReadContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"rewardPool"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterRewardPool = /*#__PURE__*/ createUseReadContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'rewardPool',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"subscriptions"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterSubscriptions =
  /*#__PURE__*/ createUseReadContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'subscriptions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"tipComments"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterTipComments = /*#__PURE__*/ createUseReadContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'tipComments',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"tipCooldown"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useReadTipRouterTipCooldown = /*#__PURE__*/ createUseReadContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'tipCooldown',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouter = /*#__PURE__*/ createUseWriteContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"cancelSubscription"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterCancelSubscription =
  /*#__PURE__*/ createUseWriteContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'cancelSubscription',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"createSubscription"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterCreateSubscription =
  /*#__PURE__*/ createUseWriteContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'createSubscription',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"permitAndTip"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterPermitAndTip =
  /*#__PURE__*/ createUseWriteContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'permitAndTip',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"processSubscriptionPayment"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterProcessSubscriptionPayment =
  /*#__PURE__*/ createUseWriteContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'processSubscriptionPayment',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"setFeeBps"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterSetFeeBps = /*#__PURE__*/ createUseWriteContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'setFeeBps',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"setFeeTiers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterSetFeeTiers =
  /*#__PURE__*/ createUseWriteContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'setFeeTiers',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"setTipLimits"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterSetTipLimits =
  /*#__PURE__*/ createUseWriteContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'setTipLimits',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"tip"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterTip = /*#__PURE__*/ createUseWriteContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'tip',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"tipWithComment"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterTipWithComment =
  /*#__PURE__*/ createUseWriteContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'tipWithComment',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWriteTipRouterTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouter = /*#__PURE__*/ createUseSimulateContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"cancelSubscription"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterCancelSubscription =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'cancelSubscription',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"createSubscription"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterCreateSubscription =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'createSubscription',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"permitAndTip"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterPermitAndTip =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'permitAndTip',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"processSubscriptionPayment"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterProcessSubscriptionPayment =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'processSubscriptionPayment',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"setFeeBps"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterSetFeeBps =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'setFeeBps',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"setFeeTiers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterSetFeeTiers =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'setFeeTiers',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"setTipLimits"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterSetTipLimits =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'setTipLimits',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"tip"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterTip = /*#__PURE__*/ createUseSimulateContract({
  abi: tipRouterAbi,
  address: tipRouterAddress,
  functionName: 'tip',
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"tipWithComment"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterTipWithComment =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'tipWithComment',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link tipRouterAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useSimulateTipRouterTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link tipRouterAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWatchTipRouterEvent = /*#__PURE__*/ createUseWatchContractEvent(
  { abi: tipRouterAbi, address: tipRouterAddress },
)

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link tipRouterAbi}__ and `eventName` set to `"FeeTiersUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWatchTipRouterFeeTiersUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    eventName: 'FeeTiersUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link tipRouterAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWatchTipRouterOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link tipRouterAbi}__ and `eventName` set to `"SubscriptionCancelled"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWatchTipRouterSubscriptionCancelledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    eventName: 'SubscriptionCancelled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link tipRouterAbi}__ and `eventName` set to `"SubscriptionCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWatchTipRouterSubscriptionCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    eventName: 'SubscriptionCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link tipRouterAbi}__ and `eventName` set to `"SubscriptionPayment"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWatchTipRouterSubscriptionPaymentEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    eventName: 'SubscriptionPayment',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link tipRouterAbi}__ and `eventName` set to `"TipCommentAdded"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWatchTipRouterTipCommentAddedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    eventName: 'TipCommentAdded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link tipRouterAbi}__ and `eventName` set to `"TipLimitsUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWatchTipRouterTipLimitsUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    eventName: 'TipLimitsUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link tipRouterAbi}__ and `eventName` set to `"Tipped"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x755Fe81411c86019fff6033E0567A4D93b57281b)
 */
export const useWatchTipRouterTippedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: tipRouterAbi,
    address: tipRouterAddress,
    eventName: 'Tipped',
  })
