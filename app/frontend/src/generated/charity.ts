import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// BaseSubDAO
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const baseSubDaoAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
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
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'region',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'description',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'creator',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'active',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'governanceToken',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'treasury',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'mainGovernance',
    outputs: [
      { name: '', internalType: 'contract CharityGovernance', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'members',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'admins',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalProposals',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalDonations',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '_name', internalType: 'string', type: 'string' },
      { name: '_region', internalType: 'string', type: 'string' },
      { name: '_description', internalType: 'string', type: 'string' },
      { name: '_creator', internalType: 'address', type: 'address' },
      { name: 'initialMembers', internalType: 'address[]', type: 'address[]' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newMember', internalType: 'address', type: 'address' }],
    name: 'addMember',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'memberToRemove', internalType: 'address', type: 'address' },
    ],
    name: 'removeMember',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newAdmin', internalType: 'address', type: 'address' }],
    name: 'addAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'adminToRemove', internalType: 'address', type: 'address' },
    ],
    name: 'removeAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'title', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'charityRecipient', internalType: 'address', type: 'address' },
      { name: 'donationAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'charityName', internalType: 'string', type: 'string' },
      { name: 'charityDescription', internalType: 'string', type: 'string' },
      { name: 'proofOfVerification', internalType: 'string', type: 'string' },
      { name: 'impactMetrics', internalType: 'string', type: 'string' },
    ],
    name: 'createCharityProposal',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newName', internalType: 'string', type: 'string' },
      { name: 'newRegion', internalType: 'string', type: 'string' },
      { name: 'newDescription', internalType: 'string', type: 'string' },
    ],
    name: 'updateConfig',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'deactivate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'reactivate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getName',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getRegion',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getDescription',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getCreator',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'isActive',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTotalMembers',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTotalProposals',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTotalDonations',
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
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const baseSubDaoAddress = {
  11155111: '0xAe798cAD6842673999F91150A036D5D5621D62A5',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const baseSubDaoConfig = {
  address: baseSubDaoAddress,
  abi: baseSubDaoAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// BurnToDonate
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const burnToDonateAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_ldaoToken', internalType: 'address', type: 'address' },
      { name: '_treasury', internalType: 'address', type: 'address' },
      {
        name: '_defaultCharityRecipient',
        internalType: 'address',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'AddressEmptyCode',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'AddressInsufficientBalance',
  },
  { type: 'error', inputs: [], name: 'FailedInnerCall' },
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
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldRatio',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newRatio',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'BurnToDonateRatioUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldLimit',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newLimit',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DailyBurnLimitUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldRecipient',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'newRecipient',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'DefaultCharityRecipientUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'minBurnAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'maxBurnAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'minDonationAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ConfigurationUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'burner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'burnAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'donationAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'recipient',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'TokensBurned',
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
    name: 'treasury',
    outputs: [
      {
        name: '',
        internalType: 'contract EnhancedLDAOTreasury',
        type: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'burnToDonateRatio',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minBurnAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxBurnAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'dailyBurnLimit',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'currentDayBurns',
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
    name: 'defaultCharityRecipient',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minDonationAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalTokensBurned',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalDonationsMade',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalBurnToDonateTransactions',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'userTotalBurned',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'userTotalDonationsReceived',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'userDailyBurns',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'userLastBurnDay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'burnAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'recipient', internalType: 'address', type: 'address' },
    ],
    name: 'burnToDonate',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'burnAmount', internalType: 'uint256', type: 'uint256' }],
    name: 'burnToDonateDefault',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newRatio', internalType: 'uint256', type: 'uint256' }],
    name: 'updateBurnToDonateRatio',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newLimit', internalType: 'uint256', type: 'uint256' }],
    name: 'updateDailyBurnLimit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newRecipient', internalType: 'address', type: 'address' },
    ],
    name: 'updateDefaultCharityRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newMinBurnAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'newMaxBurnAmount', internalType: 'uint256', type: 'uint256' },
      {
        name: 'newMinDonationAmount',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'updateConfiguration',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserStats',
    outputs: [
      { name: 'totalBurned', internalType: 'uint256', type: 'uint256' },
      {
        name: 'totalDonationsReceived',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'dailyBurns', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getContractStats',
    outputs: [
      { name: 'tokensBurned', internalType: 'uint256', type: 'uint256' },
      { name: 'donationsMade', internalType: 'uint256', type: 'uint256' },
      { name: 'transactions', internalType: 'uint256', type: 'uint256' },
      { name: 'dailyBurns', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'donationAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'isTreasurySufficient',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
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
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const burnToDonateAddress = {
  11155111: '0x675Ac1D60563b9D083Ad34E268861a7BA562705D',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const burnToDonateConfig = {
  address: burnToDonateAddress,
  abi: burnToDonateAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CharityProposal
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const charityProposalAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_governanceToken', internalType: 'address', type: 'address' },
      { name: '_treasury', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'AddressEmptyCode',
  },
  {
    type: 'error',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'AddressInsufficientBalance',
  },
  { type: 'error', inputs: [], name: 'FailedInnerCall' },
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
  {
    type: 'error',
    inputs: [{ name: 'token', internalType: 'address', type: 'address' }],
    name: 'SafeERC20FailedOperation',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'donor',
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
        name: 'totalAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DonationReceived',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'CampaignCompleted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'CampaignCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
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
    name: 'DonationReceiptVerified',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'charityId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'walletAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'registrant',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'CharityRegistered',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'charityId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'walletAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'verifier',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'CharityVerified',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'campaignId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'charityId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'proposer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'title', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'targetAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CampaignCreated',
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
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'campaigns',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'charityId', internalType: 'uint256', type: 'uint256' },
      { name: 'proposer', internalType: 'address', type: 'address' },
      { name: 'title', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'impactMetrics', internalType: 'string', type: 'string' },
      { name: 'targetAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'currentAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'startDate', internalType: 'uint256', type: 'uint256' },
      { name: 'endDate', internalType: 'uint256', type: 'uint256' },
      { name: 'proposalId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'status',
        internalType: 'enum CharityProposal.CampaignStatus',
        type: 'uint8',
      },
      { name: 'donationReceipt', internalType: 'string', type: 'string' },
      { name: 'isVerified', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'charities',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'walletAddress', internalType: 'address', type: 'address' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'website', internalType: 'string', type: 'string' },
      { name: 'registrationNumber', internalType: 'string', type: 'string' },
      { name: 'isVerified', internalType: 'bool', type: 'bool' },
      { name: 'registrationDate', internalType: 'uint256', type: 'uint256' },
      { name: 'verifier', internalType: 'address', type: 'address' },
      { name: 'verificationProof', internalType: 'string', type: 'string' },
      {
        name: 'totalDonationsReceived',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'totalCampaigns', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'charityCampaigns',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'charityAddressToId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'userCampaigns',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextCharityId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextCampaignId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'governanceToken',
    outputs: [
      { name: '', internalType: 'contract LDAOToken', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'treasury',
    outputs: [
      { name: '', internalType: 'contract LDAOTreasury', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minDonationAmount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxCampaignDuration',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'walletAddress', internalType: 'address', type: 'address' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'website', internalType: 'string', type: 'string' },
      { name: 'registrationNumber', internalType: 'string', type: 'string' },
    ],
    name: 'registerCharity',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'charityId', internalType: 'uint256', type: 'uint256' },
      { name: 'verificationProof', internalType: 'string', type: 'string' },
    ],
    name: 'verifyCharity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'charityId', internalType: 'uint256', type: 'uint256' },
      { name: 'title', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'impactMetrics', internalType: 'string', type: 'string' },
      { name: 'targetAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'duration', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'createCharityCampaign',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'campaignId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'donateToCampaign',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'campaignId', internalType: 'uint256', type: 'uint256' },
      { name: 'receiptHash', internalType: 'string', type: 'string' },
    ],
    name: 'verifyDonationReceipt',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'campaignId', internalType: 'uint256', type: 'uint256' }],
    name: 'cancelCampaign',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newMinAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateMinDonationAmount',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newMaxDuration', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateMaxCampaignDuration',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'charityId', internalType: 'uint256', type: 'uint256' }],
    name: 'getCharityDetails',
    outputs: [
      {
        name: '',
        internalType: 'struct CharityProposal.CharityOrganization',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'walletAddress', internalType: 'address', type: 'address' },
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'website', internalType: 'string', type: 'string' },
          {
            name: 'registrationNumber',
            internalType: 'string',
            type: 'string',
          },
          { name: 'isVerified', internalType: 'bool', type: 'bool' },
          {
            name: 'registrationDate',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'verifier', internalType: 'address', type: 'address' },
          { name: 'verificationProof', internalType: 'string', type: 'string' },
          {
            name: 'totalDonationsReceived',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'totalCampaigns', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'campaignId', internalType: 'uint256', type: 'uint256' }],
    name: 'getCampaignDetails',
    outputs: [
      {
        name: '',
        internalType: 'struct CharityProposal.CharityCampaign',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'charityId', internalType: 'uint256', type: 'uint256' },
          { name: 'proposer', internalType: 'address', type: 'address' },
          { name: 'title', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'impactMetrics', internalType: 'string', type: 'string' },
          { name: 'targetAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'currentAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'startDate', internalType: 'uint256', type: 'uint256' },
          { name: 'endDate', internalType: 'uint256', type: 'uint256' },
          { name: 'proposalId', internalType: 'uint256', type: 'uint256' },
          {
            name: 'status',
            internalType: 'enum CharityProposal.CampaignStatus',
            type: 'uint8',
          },
          { name: 'donationReceipt', internalType: 'string', type: 'string' },
          { name: 'isVerified', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'charityId', internalType: 'uint256', type: 'uint256' }],
    name: 'getCharityCampaigns',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserCampaigns',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'charityId', internalType: 'uint256', type: 'uint256' }],
    name: 'isCharityVerified',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
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
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const charityProposalAddress = {
  11155111: '0x2777b61C59a46Af2e672580eDAf13D75124B112c',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const charityProposalConfig = {
  address: charityProposalAddress,
  abi: charityProposalAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CharitySubDAOFactory
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const charitySubDaoFactoryAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_subDAOImplementation',
        internalType: 'address',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [
      { name: 'implementation', internalType: 'address', type: 'address' },
    ],
    name: 'ERC1167FailedCreateClone',
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
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldStake',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newStake',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'MinCreationStakeUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldFee',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newFee',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'SubDAOFeeUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'oldImplementation',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newImplementation',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'SubDAOImplementationUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'subDAOId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'subDAOAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'SubDAOActivated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'subDAOId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'subDAOAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'SubDAODeactivated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'subDAOId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'subDAOAddress',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'name', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'region',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'creator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'SubDAOCreated',
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
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'subDAOs',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'subDAOAddress', internalType: 'address', type: 'address' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'region', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'creator', internalType: 'address', type: 'address' },
      { name: 'creationTimestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'isActive', internalType: 'bool', type: 'bool' },
      { name: 'totalMembers', internalType: 'uint256', type: 'uint256' },
      { name: 'totalProposals', internalType: 'uint256', type: 'uint256' },
      { name: 'totalDonations', internalType: 'uint256', type: 'uint256' },
      { name: 'governanceToken', internalType: 'address', type: 'address' },
      { name: 'treasury', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'subDAOIdByAddress',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'subDAOImplementation',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'subDAOCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minCreationStake',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'subDAOFee',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'region', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'initialMembers', internalType: 'address[]', type: 'address[]' },
      { name: 'initialStake', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'createSubDAO',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newImplementation', internalType: 'address', type: 'address' },
    ],
    name: 'updateSubDAOImplementation',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newStake', internalType: 'uint256', type: 'uint256' }],
    name: 'updateMinCreationStake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newFee', internalType: 'uint256', type: 'uint256' }],
    name: 'updateSubDAOFee',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'subDAOId', internalType: 'uint256', type: 'uint256' }],
    name: 'activateSubDAO',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'subDAOId', internalType: 'uint256', type: 'uint256' }],
    name: 'deactivateSubDAO',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'subDAOId', internalType: 'uint256', type: 'uint256' }],
    name: 'getSubDAOInfo',
    outputs: [
      {
        name: '',
        internalType: 'struct CharitySubDAOFactory.SubDAOInfo',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'subDAOAddress', internalType: 'address', type: 'address' },
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'region', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'creator', internalType: 'address', type: 'address' },
          {
            name: 'creationTimestamp',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'isActive', internalType: 'bool', type: 'bool' },
          { name: 'totalMembers', internalType: 'uint256', type: 'uint256' },
          { name: 'totalProposals', internalType: 'uint256', type: 'uint256' },
          { name: 'totalDonations', internalType: 'uint256', type: 'uint256' },
          { name: 'governanceToken', internalType: 'address', type: 'address' },
          { name: 'treasury', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'subDAOAddress', internalType: 'address', type: 'address' },
    ],
    name: 'getSubDAOId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'subDAOId', internalType: 'uint256', type: 'uint256' }],
    name: 'isSubDAOActive',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getTotalSubDAOs',
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
    inputs: [{ name: 'newOwner', internalType: 'address', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const charitySubDaoFactoryAddress = {
  11155111: '0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const charitySubDaoFactoryConfig = {
  address: charitySubDaoFactoryAddress,
  abi: charitySubDaoFactoryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CharityVerificationSystem
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const charityVerificationSystemAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_owner', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'charity', internalType: 'address', type: 'address' }],
    name: 'addCharity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'charity', internalType: 'address', type: 'address' }],
    name: 'approveCharity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'charities',
    outputs: [
      { name: 'walletAddress', internalType: 'address', type: 'address' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'documentation', internalType: 'string', type: 'string' },
      { name: 'isVerified', internalType: 'bool', type: 'bool' },
      { name: 'isActive', internalType: 'bool', type: 'bool' },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
      { name: 'verifier', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'charity', internalType: 'address', type: 'address' }],
    name: 'getCharity',
    outputs: [
      {
        name: '',
        internalType: 'struct CharityVerificationSystem.Charity',
        type: 'tuple',
        components: [
          { name: 'walletAddress', internalType: 'address', type: 'address' },
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'documentation', internalType: 'string', type: 'string' },
          { name: 'isVerified', internalType: 'bool', type: 'bool' },
          { name: 'isActive', internalType: 'bool', type: 'bool' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'verifier', internalType: 'address', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'charity', internalType: 'address', type: 'address' }],
    name: 'isCharityVerified',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'charity', internalType: 'address', type: 'address' }],
    name: 'rejectCharity',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'charity', internalType: 'address', type: 'address' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'documentation', internalType: 'string', type: 'string' },
    ],
    name: 'updateCharity',
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
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'charity',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: 'name', internalType: 'string', type: 'string', indexed: false },
    ],
    name: 'CharityAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'charity',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'CharityApproved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'charity',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'CharityRejected',
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
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const charityVerificationSystemAddress = {
  11155111: '0x4e2F69c11897771e443A3EA03E207DC402496eb0',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const charityVerificationSystemConfig = {
  address: charityVerificationSystemAddress,
  abi: charityVerificationSystemAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ProofOfDonationNFT
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const proofOfDonationNftAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'symbol', internalType: 'string', type: 'string' },
      { name: '_governance', internalType: 'address', type: 'address' },
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
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'approved',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Approval',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'operator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'approved', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'ApprovalForAll',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_fromTokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: '_toTokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'BatchMetadataUpdate',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'donationId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'donor',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'charity',
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
      {
        name: 'impactStory',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'DonationRecorded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: '_tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'MetadataUpdate',
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
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
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
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'donor', internalType: 'address', type: 'address' },
      { name: 'charity', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'impactStory', internalType: 'string', type: 'string' },
    ],
    name: 'recordDonation',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
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
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'donations',
    outputs: [
      { name: 'donor', internalType: 'address', type: 'address' },
      { name: 'charity', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'impactStory', internalType: 'string', type: 'string' },
    ],
    stateMutability: 'view',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const proofOfDonationNftAddress = {
  11155111: '0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const proofOfDonationNftConfig = {
  address: proofOfDonationNftAddress,
  abi: proofOfDonationNftAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDao = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"name"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoName = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"region"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoRegion = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'region',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"description"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoDescription = /*#__PURE__*/ createUseReadContract(
  {
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'description',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"creator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoCreator = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'creator',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"active"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoActive = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'active',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"governanceToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoGovernanceToken =
  /*#__PURE__*/ createUseReadContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'governanceToken',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"treasury"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoTreasury = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'treasury',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"mainGovernance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoMainGovernance =
  /*#__PURE__*/ createUseReadContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'mainGovernance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"members"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoMembers = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'members',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"admins"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoAdmins = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'admins',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"totalProposals"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoTotalProposals =
  /*#__PURE__*/ createUseReadContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'totalProposals',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"totalDonations"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoTotalDonations =
  /*#__PURE__*/ createUseReadContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'totalDonations',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"getName"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoGetName = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'getName',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"getRegion"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoGetRegion = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'getRegion',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"getDescription"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoGetDescription =
  /*#__PURE__*/ createUseReadContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'getDescription',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"getCreator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoGetCreator = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'getCreator',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"isActive"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoIsActive = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'isActive',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"getTotalMembers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoGetTotalMembers =
  /*#__PURE__*/ createUseReadContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'getTotalMembers',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"getTotalProposals"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoGetTotalProposals =
  /*#__PURE__*/ createUseReadContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'getTotalProposals',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"getTotalDonations"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoGetTotalDonations =
  /*#__PURE__*/ createUseReadContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'getTotalDonations',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useReadBaseSubDaoOwner = /*#__PURE__*/ createUseReadContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDao = /*#__PURE__*/ createUseWriteContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"initialize"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoInitialize =
  /*#__PURE__*/ createUseWriteContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'initialize',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"addMember"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoAddMember = /*#__PURE__*/ createUseWriteContract(
  { abi: baseSubDaoAbi, address: baseSubDaoAddress, functionName: 'addMember' },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"removeMember"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoRemoveMember =
  /*#__PURE__*/ createUseWriteContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'removeMember',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"addAdmin"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoAddAdmin = /*#__PURE__*/ createUseWriteContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
  functionName: 'addAdmin',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"removeAdmin"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoRemoveAdmin =
  /*#__PURE__*/ createUseWriteContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'removeAdmin',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"createCharityProposal"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoCreateCharityProposal =
  /*#__PURE__*/ createUseWriteContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'createCharityProposal',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"updateConfig"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoUpdateConfig =
  /*#__PURE__*/ createUseWriteContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'updateConfig',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"deactivate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoDeactivate =
  /*#__PURE__*/ createUseWriteContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'deactivate',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"reactivate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoReactivate =
  /*#__PURE__*/ createUseWriteContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'reactivate',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWriteBaseSubDaoTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDao = /*#__PURE__*/ createUseSimulateContract({
  abi: baseSubDaoAbi,
  address: baseSubDaoAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"initialize"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoInitialize =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'initialize',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"addMember"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoAddMember =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'addMember',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"removeMember"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoRemoveMember =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'removeMember',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"addAdmin"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoAddAdmin =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'addAdmin',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"removeAdmin"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoRemoveAdmin =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'removeAdmin',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"createCharityProposal"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoCreateCharityProposal =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'createCharityProposal',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"updateConfig"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoUpdateConfig =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'updateConfig',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"deactivate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoDeactivate =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'deactivate',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"reactivate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoReactivate =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'reactivate',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link baseSubDaoAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useSimulateBaseSubDaoTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link baseSubDaoAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWatchBaseSubDaoEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link baseSubDaoAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xAe798cAD6842673999F91150A036D5D5621D62A5)
 */
export const useWatchBaseSubDaoOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: baseSubDaoAbi,
    address: baseSubDaoAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonate = /*#__PURE__*/ createUseReadContract({
  abi: burnToDonateAbi,
  address: burnToDonateAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"ldaoToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateLdaoToken = /*#__PURE__*/ createUseReadContract(
  {
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'ldaoToken',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"treasury"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateTreasury = /*#__PURE__*/ createUseReadContract({
  abi: burnToDonateAbi,
  address: burnToDonateAddress,
  functionName: 'treasury',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"burnToDonateRatio"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateBurnToDonateRatio =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'burnToDonateRatio',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"minBurnAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateMinBurnAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'minBurnAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"maxBurnAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateMaxBurnAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'maxBurnAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"dailyBurnLimit"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateDailyBurnLimit =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'dailyBurnLimit',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"currentDayBurns"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateCurrentDayBurns =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'currentDayBurns',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"lastResetDay"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateLastResetDay =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'lastResetDay',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"defaultCharityRecipient"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateDefaultCharityRecipient =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'defaultCharityRecipient',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"minDonationAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateMinDonationAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'minDonationAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"totalTokensBurned"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateTotalTokensBurned =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'totalTokensBurned',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"totalDonationsMade"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateTotalDonationsMade =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'totalDonationsMade',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"totalBurnToDonateTransactions"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateTotalBurnToDonateTransactions =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'totalBurnToDonateTransactions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"userTotalBurned"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateUserTotalBurned =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'userTotalBurned',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"userTotalDonationsReceived"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateUserTotalDonationsReceived =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'userTotalDonationsReceived',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"userDailyBurns"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateUserDailyBurns =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'userDailyBurns',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"userLastBurnDay"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateUserLastBurnDay =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'userLastBurnDay',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"getUserStats"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateGetUserStats =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'getUserStats',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"getContractStats"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateGetContractStats =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'getContractStats',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"isTreasurySufficient"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateIsTreasurySufficient =
  /*#__PURE__*/ createUseReadContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'isTreasurySufficient',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useReadBurnToDonateOwner = /*#__PURE__*/ createUseReadContract({
  abi: burnToDonateAbi,
  address: burnToDonateAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link burnToDonateAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWriteBurnToDonate = /*#__PURE__*/ createUseWriteContract({
  abi: burnToDonateAbi,
  address: burnToDonateAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"burnToDonate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWriteBurnToDonateBurnToDonate =
  /*#__PURE__*/ createUseWriteContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'burnToDonate',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"burnToDonateDefault"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWriteBurnToDonateBurnToDonateDefault =
  /*#__PURE__*/ createUseWriteContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'burnToDonateDefault',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"updateBurnToDonateRatio"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWriteBurnToDonateUpdateBurnToDonateRatio =
  /*#__PURE__*/ createUseWriteContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'updateBurnToDonateRatio',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"updateDailyBurnLimit"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWriteBurnToDonateUpdateDailyBurnLimit =
  /*#__PURE__*/ createUseWriteContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'updateDailyBurnLimit',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"updateDefaultCharityRecipient"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWriteBurnToDonateUpdateDefaultCharityRecipient =
  /*#__PURE__*/ createUseWriteContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'updateDefaultCharityRecipient',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"updateConfiguration"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWriteBurnToDonateUpdateConfiguration =
  /*#__PURE__*/ createUseWriteContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'updateConfiguration',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWriteBurnToDonateTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link burnToDonateAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useSimulateBurnToDonate = /*#__PURE__*/ createUseSimulateContract({
  abi: burnToDonateAbi,
  address: burnToDonateAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"burnToDonate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useSimulateBurnToDonateBurnToDonate =
  /*#__PURE__*/ createUseSimulateContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'burnToDonate',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"burnToDonateDefault"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useSimulateBurnToDonateBurnToDonateDefault =
  /*#__PURE__*/ createUseSimulateContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'burnToDonateDefault',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"updateBurnToDonateRatio"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useSimulateBurnToDonateUpdateBurnToDonateRatio =
  /*#__PURE__*/ createUseSimulateContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'updateBurnToDonateRatio',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"updateDailyBurnLimit"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useSimulateBurnToDonateUpdateDailyBurnLimit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'updateDailyBurnLimit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"updateDefaultCharityRecipient"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useSimulateBurnToDonateUpdateDefaultCharityRecipient =
  /*#__PURE__*/ createUseSimulateContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'updateDefaultCharityRecipient',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"updateConfiguration"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useSimulateBurnToDonateUpdateConfiguration =
  /*#__PURE__*/ createUseSimulateContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'updateConfiguration',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link burnToDonateAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useSimulateBurnToDonateTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link burnToDonateAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWatchBurnToDonateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link burnToDonateAbi}__ and `eventName` set to `"BurnToDonateRatioUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWatchBurnToDonateBurnToDonateRatioUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    eventName: 'BurnToDonateRatioUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link burnToDonateAbi}__ and `eventName` set to `"DailyBurnLimitUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWatchBurnToDonateDailyBurnLimitUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    eventName: 'DailyBurnLimitUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link burnToDonateAbi}__ and `eventName` set to `"DefaultCharityRecipientUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWatchBurnToDonateDefaultCharityRecipientUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    eventName: 'DefaultCharityRecipientUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link burnToDonateAbi}__ and `eventName` set to `"ConfigurationUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWatchBurnToDonateConfigurationUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    eventName: 'ConfigurationUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link burnToDonateAbi}__ and `eventName` set to `"TokensBurned"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWatchBurnToDonateTokensBurnedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    eventName: 'TokensBurned',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link burnToDonateAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x675Ac1D60563b9D083Ad34E268861a7BA562705D)
 */
export const useWatchBurnToDonateOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: burnToDonateAbi,
    address: burnToDonateAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposal = /*#__PURE__*/ createUseReadContract({
  abi: charityProposalAbi,
  address: charityProposalAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"campaigns"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalCampaigns =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'campaigns',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"charities"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalCharities =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'charities',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"charityCampaigns"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalCharityCampaigns =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'charityCampaigns',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"charityAddressToId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalCharityAddressToId =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'charityAddressToId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"userCampaigns"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalUserCampaigns =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'userCampaigns',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"nextCharityId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalNextCharityId =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'nextCharityId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"nextCampaignId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalNextCampaignId =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'nextCampaignId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"governanceToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalGovernanceToken =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'governanceToken',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"treasury"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalTreasury =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'treasury',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"minDonationAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalMinDonationAmount =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'minDonationAmount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"maxCampaignDuration"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalMaxCampaignDuration =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'maxCampaignDuration',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"getCharityDetails"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalGetCharityDetails =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'getCharityDetails',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"getCampaignDetails"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalGetCampaignDetails =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'getCampaignDetails',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"getCharityCampaigns"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalGetCharityCampaigns =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'getCharityCampaigns',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"getUserCampaigns"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalGetUserCampaigns =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'getUserCampaigns',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"isCharityVerified"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalIsCharityVerified =
  /*#__PURE__*/ createUseReadContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'isCharityVerified',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useReadCharityProposalOwner = /*#__PURE__*/ createUseReadContract({
  abi: charityProposalAbi,
  address: charityProposalAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposal = /*#__PURE__*/ createUseWriteContract({
  abi: charityProposalAbi,
  address: charityProposalAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"registerCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposalRegisterCharity =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'registerCharity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"verifyCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposalVerifyCharity =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'verifyCharity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"createCharityCampaign"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposalCreateCharityCampaign =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'createCharityCampaign',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"donateToCampaign"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposalDonateToCampaign =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'donateToCampaign',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"verifyDonationReceipt"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposalVerifyDonationReceipt =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'verifyDonationReceipt',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"cancelCampaign"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposalCancelCampaign =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'cancelCampaign',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"updateMinDonationAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposalUpdateMinDonationAmount =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'updateMinDonationAmount',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"updateMaxCampaignDuration"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposalUpdateMaxCampaignDuration =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'updateMaxCampaignDuration',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWriteCharityProposalTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposal =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"registerCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposalRegisterCharity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'registerCharity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"verifyCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposalVerifyCharity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'verifyCharity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"createCharityCampaign"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposalCreateCharityCampaign =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'createCharityCampaign',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"donateToCampaign"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposalDonateToCampaign =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'donateToCampaign',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"verifyDonationReceipt"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposalVerifyDonationReceipt =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'verifyDonationReceipt',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"cancelCampaign"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposalCancelCampaign =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'cancelCampaign',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"updateMinDonationAmount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposalUpdateMinDonationAmount =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'updateMinDonationAmount',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"updateMaxCampaignDuration"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposalUpdateMaxCampaignDuration =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'updateMaxCampaignDuration',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityProposalAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useSimulateCharityProposalTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityProposalAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWatchCharityProposalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityProposalAbi,
    address: charityProposalAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityProposalAbi}__ and `eventName` set to `"DonationReceived"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWatchCharityProposalDonationReceivedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    eventName: 'DonationReceived',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityProposalAbi}__ and `eventName` set to `"CampaignCompleted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWatchCharityProposalCampaignCompletedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    eventName: 'CampaignCompleted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityProposalAbi}__ and `eventName` set to `"CampaignCancelled"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWatchCharityProposalCampaignCancelledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    eventName: 'CampaignCancelled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityProposalAbi}__ and `eventName` set to `"DonationReceiptVerified"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWatchCharityProposalDonationReceiptVerifiedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    eventName: 'DonationReceiptVerified',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityProposalAbi}__ and `eventName` set to `"CharityRegistered"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWatchCharityProposalCharityRegisteredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    eventName: 'CharityRegistered',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityProposalAbi}__ and `eventName` set to `"CharityVerified"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWatchCharityProposalCharityVerifiedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    eventName: 'CharityVerified',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityProposalAbi}__ and `eventName` set to `"CampaignCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWatchCharityProposalCampaignCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    eventName: 'CampaignCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityProposalAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x2777b61C59a46Af2e672580eDAf13D75124B112c)
 */
export const useWatchCharityProposalOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityProposalAbi,
    address: charityProposalAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactory = /*#__PURE__*/ createUseReadContract({
  abi: charitySubDaoFactoryAbi,
  address: charitySubDaoFactoryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"subDAOs"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactorySubDaOs =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'subDAOs',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"subDAOIdByAddress"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactorySubDaoIdByAddress =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'subDAOIdByAddress',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"subDAOImplementation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactorySubDaoImplementation =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'subDAOImplementation',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"subDAOCount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactorySubDaoCount =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'subDAOCount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"minCreationStake"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactoryMinCreationStake =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'minCreationStake',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"subDAOFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactorySubDaoFee =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'subDAOFee',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"getSubDAOInfo"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactoryGetSubDaoInfo =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'getSubDAOInfo',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"getSubDAOId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactoryGetSubDaoId =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'getSubDAOId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"isSubDAOActive"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactoryIsSubDaoActive =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'isSubDAOActive',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"getTotalSubDAOs"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactoryGetTotalSubDaOs =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'getTotalSubDAOs',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useReadCharitySubDaoFactoryOwner =
  /*#__PURE__*/ createUseReadContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'owner',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWriteCharitySubDaoFactory =
  /*#__PURE__*/ createUseWriteContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"createSubDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWriteCharitySubDaoFactoryCreateSubDao =
  /*#__PURE__*/ createUseWriteContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'createSubDAO',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"updateSubDAOImplementation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWriteCharitySubDaoFactoryUpdateSubDaoImplementation =
  /*#__PURE__*/ createUseWriteContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'updateSubDAOImplementation',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"updateMinCreationStake"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWriteCharitySubDaoFactoryUpdateMinCreationStake =
  /*#__PURE__*/ createUseWriteContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'updateMinCreationStake',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"updateSubDAOFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWriteCharitySubDaoFactoryUpdateSubDaoFee =
  /*#__PURE__*/ createUseWriteContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'updateSubDAOFee',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"activateSubDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWriteCharitySubDaoFactoryActivateSubDao =
  /*#__PURE__*/ createUseWriteContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'activateSubDAO',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"deactivateSubDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWriteCharitySubDaoFactoryDeactivateSubDao =
  /*#__PURE__*/ createUseWriteContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'deactivateSubDAO',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWriteCharitySubDaoFactoryTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useSimulateCharitySubDaoFactory =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"createSubDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useSimulateCharitySubDaoFactoryCreateSubDao =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'createSubDAO',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"updateSubDAOImplementation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useSimulateCharitySubDaoFactoryUpdateSubDaoImplementation =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'updateSubDAOImplementation',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"updateMinCreationStake"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useSimulateCharitySubDaoFactoryUpdateMinCreationStake =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'updateMinCreationStake',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"updateSubDAOFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useSimulateCharitySubDaoFactoryUpdateSubDaoFee =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'updateSubDAOFee',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"activateSubDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useSimulateCharitySubDaoFactoryActivateSubDao =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'activateSubDAO',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"deactivateSubDAO"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useSimulateCharitySubDaoFactoryDeactivateSubDao =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'deactivateSubDAO',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useSimulateCharitySubDaoFactoryTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWatchCharitySubDaoFactoryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `eventName` set to `"MinCreationStakeUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWatchCharitySubDaoFactoryMinCreationStakeUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    eventName: 'MinCreationStakeUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `eventName` set to `"SubDAOFeeUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWatchCharitySubDaoFactorySubDaoFeeUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    eventName: 'SubDAOFeeUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `eventName` set to `"SubDAOImplementationUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWatchCharitySubDaoFactorySubDaoImplementationUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    eventName: 'SubDAOImplementationUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `eventName` set to `"SubDAOActivated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWatchCharitySubDaoFactorySubDaoActivatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    eventName: 'SubDAOActivated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `eventName` set to `"SubDAODeactivated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWatchCharitySubDaoFactorySubDaoDeactivatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    eventName: 'SubDAODeactivated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `eventName` set to `"SubDAOCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWatchCharitySubDaoFactorySubDaoCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    eventName: 'SubDAOCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charitySubDaoFactoryAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3)
 */
export const useWatchCharitySubDaoFactoryOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charitySubDaoFactoryAbi,
    address: charitySubDaoFactoryAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useReadCharityVerificationSystem =
  /*#__PURE__*/ createUseReadContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"charities"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useReadCharityVerificationSystemCharities =
  /*#__PURE__*/ createUseReadContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'charities',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"getCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useReadCharityVerificationSystemGetCharity =
  /*#__PURE__*/ createUseReadContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'getCharity',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"isCharityVerified"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useReadCharityVerificationSystemIsCharityVerified =
  /*#__PURE__*/ createUseReadContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'isCharityVerified',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWriteCharityVerificationSystem =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"addCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWriteCharityVerificationSystemAddCharity =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'addCharity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"approveCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWriteCharityVerificationSystemApproveCharity =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'approveCharity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"rejectCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWriteCharityVerificationSystemRejectCharity =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'rejectCharity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"updateCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWriteCharityVerificationSystemUpdateCharity =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'updateCharity',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWriteCharityVerificationSystemTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useSimulateCharityVerificationSystem =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"addCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useSimulateCharityVerificationSystemAddCharity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'addCharity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"approveCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useSimulateCharityVerificationSystemApproveCharity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'approveCharity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"rejectCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useSimulateCharityVerificationSystemRejectCharity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'rejectCharity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"updateCharity"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useSimulateCharityVerificationSystemUpdateCharity =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'updateCharity',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useSimulateCharityVerificationSystemTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityVerificationSystemAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWatchCharityVerificationSystemEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `eventName` set to `"CharityAdded"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWatchCharityVerificationSystemCharityAddedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    eventName: 'CharityAdded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `eventName` set to `"CharityApproved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWatchCharityVerificationSystemCharityApprovedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    eventName: 'CharityApproved',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `eventName` set to `"CharityRejected"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWatchCharityVerificationSystemCharityRejectedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    eventName: 'CharityRejected',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityVerificationSystemAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x4e2F69c11897771e443A3EA03E207DC402496eb0)
 */
export const useWatchCharityVerificationSystemOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityVerificationSystemAbi,
    address: charityVerificationSystemAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNft = /*#__PURE__*/ createUseReadContract({
  abi: proofOfDonationNftAbi,
  address: proofOfDonationNftAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"balanceOf"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"getApproved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftGetApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'getApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"name"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftName =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'name',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftOwner =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'owner',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"ownerOf"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftOwnerOf =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'ownerOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"symbol"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftSymbol =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'symbol',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"tokenURI"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftTokenUri =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'tokenURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"donations"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useReadProofOfDonationNftDonations =
  /*#__PURE__*/ createUseReadContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'donations',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWriteProofOfDonationNft = /*#__PURE__*/ createUseWriteContract({
  abi: proofOfDonationNftAbi,
  address: proofOfDonationNftAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"approve"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWriteProofOfDonationNftApprove =
  /*#__PURE__*/ createUseWriteContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"recordDonation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWriteProofOfDonationNftRecordDonation =
  /*#__PURE__*/ createUseWriteContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'recordDonation',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWriteProofOfDonationNftRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWriteProofOfDonationNftSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWriteProofOfDonationNftSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"transferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWriteProofOfDonationNftTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWriteProofOfDonationNftTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useSimulateProofOfDonationNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"approve"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useSimulateProofOfDonationNftApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"recordDonation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useSimulateProofOfDonationNftRecordDonation =
  /*#__PURE__*/ createUseSimulateContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'recordDonation',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useSimulateProofOfDonationNftRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useSimulateProofOfDonationNftSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useSimulateProofOfDonationNftSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"transferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useSimulateProofOfDonationNftTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useSimulateProofOfDonationNftTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link proofOfDonationNftAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWatchProofOfDonationNftEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `eventName` set to `"Approval"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWatchProofOfDonationNftApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `eventName` set to `"ApprovalForAll"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWatchProofOfDonationNftApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `eventName` set to `"BatchMetadataUpdate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWatchProofOfDonationNftBatchMetadataUpdateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    eventName: 'BatchMetadataUpdate',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `eventName` set to `"DonationRecorded"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWatchProofOfDonationNftDonationRecordedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    eventName: 'DonationRecorded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `eventName` set to `"MetadataUpdate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWatchProofOfDonationNftMetadataUpdateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    eventName: 'MetadataUpdate',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWatchProofOfDonationNftOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link proofOfDonationNftAbi}__ and `eventName` set to `"Transfer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4)
 */
export const useWatchProofOfDonationNftTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: proofOfDonationNftAbi,
    address: proofOfDonationNftAddress,
    eventName: 'Transfer',
  })
