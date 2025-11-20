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
// CharityGovernance
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const charityGovernanceAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_governanceToken', internalType: 'address', type: 'address' },
      { name: '_treasury', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'ExecutionDelayExceeded' },
  { type: 'error', inputs: [], name: 'InvalidShortString' },
  {
    type: 'error',
    inputs: [{ name: 'str', internalType: 'string', type: 'string' }],
    name: 'StringTooLong',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'fromDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'toDelegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'DelegateChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'previousBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newBalance',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DelegateVotesChanged',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'ProposalCanceled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'ProposalExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'executionTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ProposalQueued',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'proposer',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: 'title', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'description',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'startBlock',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'endBlock',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ProposalCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'proposer',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: 'title', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'charityRecipient',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'donationAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'charityName',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'CharityProposalCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'voter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'support', internalType: 'uint8', type: 'uint8', indexed: false },
      {
        name: 'votes',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reason',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'VoteCast',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'delegator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'delegate',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'votingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'DelegationUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'category',
        internalType: 'enum CharityGovernance.ProposalCategory',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'quorum',
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
      {
        name: 'requiresStaking',
        internalType: 'bool',
        type: 'bool',
        indexed: false,
      },
    ],
    name: 'CategoryParametersUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'indexedUser',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'newVotingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VotingPowerUpdated',
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
    ],
    name: 'TargetAuthorized',
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
    ],
    name: 'TargetRevoked',
  },
  {
    type: 'function',
    inputs: [
      { name: 'cancel', type: 'function' },
      { name: 'castVote', type: 'function' },
      { name: 'execute', type: 'function' },
      { name: 'queue', type: 'function' },
      { name: 'propose', type: 'function' },
      { name: 'proposeCharityDonation', type: 'function' },
      { name: 'authorizeTarget', type: 'function' },
      { name: 'revokeTarget', type: 'function' },
      { name: 'updateCategoryParameters', type: 'function' },
      { name: 'proposalCount', type: 'function' },
      { name: 'votingDelay', type: 'function' },
      { name: 'votingPeriod', type: 'function' },
      { name: 'quorumVotes', type: 'function' },
      { name: 'proposalThreshold', type: 'function' },
      { name: 'executionDelay', type: 'function' },
      { name: 'proposals', type: 'function' },
      { name: 'proposalVotes', type: 'function' },
      { name: 'votingPower', type: 'function' },
      { name: 'delegates', type: 'function' },
      { name: 'delegatedVotes', type: 'function' },
      { name: 'authorizedTargets', type: 'function' },
      { name: 'categoryQuorum', type: 'function' },
      { name: 'categoryThreshold', type: 'function' },
      { name: 'categoryRequiresStaking', type: 'function' },
      { name: 'governanceToken', type: 'function' },
      { name: 'treasury', type: 'function' },
    ],
    name: 'getProposal',
    outputs: [
      {
        name: '',
        internalType: 'struct CharityGovernance.Proposal',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'proposer', internalType: 'address', type: 'address' },
          { name: 'title', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'startBlock', internalType: 'uint256', type: 'uint256' },
          { name: 'endBlock', internalType: 'uint256', type: 'uint256' },
          { name: 'forVotes', internalType: 'uint256', type: 'uint256' },
          { name: 'againstVotes', internalType: 'uint256', type: 'uint256' },
          { name: 'abstainVotes', internalType: 'uint256', type: 'uint256' },
          { name: 'quorum', internalType: 'uint256', type: 'uint256' },
          {
            name: 'state',
            internalType: 'enum CharityGovernance.ProposalState',
            type: 'uint8',
          },
          {
            name: 'category',
            internalType: 'enum CharityGovernance.ProposalCategory',
            type: 'uint8',
          },
          { name: 'targets', internalType: 'address[]', type: 'address[]' },
          { name: 'values', internalType: 'uint256[]', type: 'uint256[]' },
          { name: 'signatures', internalType: 'string[]', type: 'string[]' },
          { name: 'calldatas', internalType: 'bytes[]', type: 'bytes[]' },
          { name: 'executionDelay', internalType: 'uint256', type: 'uint256' },
          { name: 'queuedAt', internalType: 'uint256', type: 'uint256' },
          { name: 'requiresStaking', internalType: 'bool', type: 'bool' },
          { name: 'minStakeToVote', internalType: 'uint256', type: 'uint256' },
          {
            name: 'charityRecipient',
            internalType: 'address',
            type: 'address',
          },
          { name: 'donationAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'charityName', internalType: 'string', type: 'string' },
          {
            name: 'charityDescription',
            internalType: 'string',
            type: 'string',
          },
          {
            name: 'proofOfVerification',
            internalType: 'string',
            type: 'string',
          },
          { name: 'isVerifiedCharity', internalType: 'bool', type: 'bool' },
          { name: 'impactMetrics', internalType: 'string', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const charityGovernanceAddress = {
  11155111: '0x25b39592AA8da0be424734E0F143E5371396dd61',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const charityGovernanceConfig = {
  address: charityGovernanceAddress,
  abi: charityGovernanceAbi,
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
// DisputeResolution
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const disputeResolutionAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_governance', internalType: 'address', type: 'address' },
      { name: '_reputationSystem', internalType: 'address', type: 'address' },
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
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'applicant',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'reputationScore',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ArbitratorApplicationSubmitted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'arbitrator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ArbitratorApproved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'disputeId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'arbitrator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ArbitratorAssigned',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'disputeId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'voter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'verdict',
        internalType: 'enum DisputeResolution.VerdictType',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'votingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'CommunityVoteCast',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'disputeId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'escrowId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'initiator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'respondent',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      {
        name: 'disputeType',
        internalType: 'enum DisputeResolution.DisputeType',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'DisputeCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'disputeId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'fromMethod',
        internalType: 'enum DisputeResolution.ResolutionMethod',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'toMethod',
        internalType: 'enum DisputeResolution.ResolutionMethod',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'DisputeEscalated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'disputeId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'verdict',
        internalType: 'enum DisputeResolution.VerdictType',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'refundAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'resolver',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'DisputeResolved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'disputeId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'submitter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'evidenceType',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'ipfsHash',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'EvidenceSubmitted',
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
    name: 'analytics',
    outputs: [
      { name: 'totalDisputes', internalType: 'uint256', type: 'uint256' },
      { name: 'resolvedDisputes', internalType: 'uint256', type: 'uint256' },
      {
        name: 'averageResolutionTime',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'qualifications', internalType: 'string', type: 'string' },
    ],
    name: 'applyForArbitrator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'applicant', internalType: 'address', type: 'address' }],
    name: 'approveArbitrator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'approvedArbitrators',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'arbitratorApplications',
    outputs: [
      { name: 'applicant', internalType: 'address', type: 'address' },
      { name: 'qualifications', internalType: 'string', type: 'string' },
      { name: 'reputationScore', internalType: 'uint256', type: 'uint256' },
      { name: 'casesHandled', internalType: 'uint256', type: 'uint256' },
      { name: 'successRate', internalType: 'uint256', type: 'uint256' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
      { name: 'appliedAt', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'arbitratorMinReputation',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'assignedArbitrators',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'disputeId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'verdict',
        internalType: 'enum DisputeResolution.VerdictType',
        type: 'uint8',
      },
      { name: 'reasoning', internalType: 'string', type: 'string' },
    ],
    name: 'castCommunityVote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'communityVotingPeriod',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'escrowId', internalType: 'uint256', type: 'uint256' },
      { name: 'respondent', internalType: 'address', type: 'address' },
      {
        name: 'disputeType',
        internalType: 'enum DisputeResolution.DisputeType',
        type: 'uint8',
      },
      { name: 'description', internalType: 'string', type: 'string' },
    ],
    name: 'createDispute',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'daoEscalationThreshold',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'disputeEvidence',
    outputs: [
      { name: 'disputeId', internalType: 'uint256', type: 'uint256' },
      { name: 'submitter', internalType: 'address', type: 'address' },
      { name: 'evidenceType', internalType: 'string', type: 'string' },
      { name: 'ipfsHash', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'verified', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'disputeVotes',
    outputs: [
      { name: 'voter', internalType: 'address', type: 'address' },
      {
        name: 'verdict',
        internalType: 'enum DisputeResolution.VerdictType',
        type: 'uint8',
      },
      { name: 'votingPower', internalType: 'uint256', type: 'uint256' },
      { name: 'reasoning', internalType: 'string', type: 'string' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'disputes',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'escrowId', internalType: 'uint256', type: 'uint256' },
      { name: 'initiator', internalType: 'address', type: 'address' },
      { name: 'respondent', internalType: 'address', type: 'address' },
      {
        name: 'disputeType',
        internalType: 'enum DisputeResolution.DisputeType',
        type: 'uint8',
      },
      { name: 'description', internalType: 'string', type: 'string' },
      {
        name: 'status',
        internalType: 'enum DisputeResolution.DisputeStatus',
        type: 'uint8',
      },
      {
        name: 'resolutionMethod',
        internalType: 'enum DisputeResolution.ResolutionMethod',
        type: 'uint8',
      },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
      { name: 'evidenceDeadline', internalType: 'uint256', type: 'uint256' },
      { name: 'votingDeadline', internalType: 'uint256', type: 'uint256' },
      { name: 'resolvedAt', internalType: 'uint256', type: 'uint256' },
      {
        name: 'verdict',
        internalType: 'enum DisputeResolution.VerdictType',
        type: 'uint8',
      },
      { name: 'refundAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'resolver', internalType: 'address', type: 'address' },
      { name: 'escalatedToDAO', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'evidenceSubmissionPeriod',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'disputeId', internalType: 'uint256', type: 'uint256' }],
    name: 'getDispute',
    outputs: [
      {
        name: '',
        internalType: 'struct DisputeResolution.Dispute',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'escrowId', internalType: 'uint256', type: 'uint256' },
          { name: 'initiator', internalType: 'address', type: 'address' },
          { name: 'respondent', internalType: 'address', type: 'address' },
          {
            name: 'disputeType',
            internalType: 'enum DisputeResolution.DisputeType',
            type: 'uint8',
          },
          { name: 'description', internalType: 'string', type: 'string' },
          {
            name: 'status',
            internalType: 'enum DisputeResolution.DisputeStatus',
            type: 'uint8',
          },
          {
            name: 'resolutionMethod',
            internalType: 'enum DisputeResolution.ResolutionMethod',
            type: 'uint8',
          },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          {
            name: 'evidenceDeadline',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'votingDeadline', internalType: 'uint256', type: 'uint256' },
          { name: 'resolvedAt', internalType: 'uint256', type: 'uint256' },
          {
            name: 'verdict',
            internalType: 'enum DisputeResolution.VerdictType',
            type: 'uint8',
          },
          { name: 'refundAmount', internalType: 'uint256', type: 'uint256' },
          { name: 'resolver', internalType: 'address', type: 'address' },
          { name: 'escalatedToDAO', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'getDisputeAnalytics',
    outputs: [
      { name: 'totalDisputes', internalType: 'uint256', type: 'uint256' },
      { name: 'resolvedDisputes', internalType: 'uint256', type: 'uint256' },
      {
        name: 'averageResolutionTime',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'disputeId', internalType: 'uint256', type: 'uint256' }],
    name: 'getDisputeEvidence',
    outputs: [
      {
        name: '',
        internalType: 'struct DisputeResolution.Evidence[]',
        type: 'tuple[]',
        components: [
          { name: 'disputeId', internalType: 'uint256', type: 'uint256' },
          { name: 'submitter', internalType: 'address', type: 'address' },
          { name: 'evidenceType', internalType: 'string', type: 'string' },
          { name: 'ipfsHash', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
          { name: 'verified', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'disputeId', internalType: 'uint256', type: 'uint256' }],
    name: 'getDisputeVotes',
    outputs: [
      {
        name: '',
        internalType: 'struct DisputeResolution.CommunityVote[]',
        type: 'tuple[]',
        components: [
          { name: 'voter', internalType: 'address', type: 'address' },
          {
            name: 'verdict',
            internalType: 'enum DisputeResolution.VerdictType',
            type: 'uint8',
          },
          { name: 'votingPower', internalType: 'uint256', type: 'uint256' },
          { name: 'reasoning', internalType: 'string', type: 'string' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
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
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'hasVoted',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minimumVotingPower',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextDisputeId',
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
    inputs: [{ name: 'disputeId', internalType: 'uint256', type: 'uint256' }],
    name: 'proceedToArbitration',
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
    name: 'reputationSystem',
    outputs: [
      { name: '', internalType: 'contract ReputationSystem', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'disputeId', internalType: 'uint256', type: 'uint256' },
      {
        name: 'verdict',
        internalType: 'enum DisputeResolution.VerdictType',
        type: 'uint8',
      },
      { name: 'refundAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'reasoning', internalType: 'string', type: 'string' },
    ],
    name: 'resolveAsArbitrator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'disputeId', internalType: 'uint256', type: 'uint256' },
      { name: 'evidenceType', internalType: 'string', type: 'string' },
      { name: 'ipfsHash', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
    ],
    name: 'submitEvidence',
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
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const disputeResolutionAddress = {
  11155111: '0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const disputeResolutionConfig = {
  address: disputeResolutionAddress,
  abi: disputeResolutionAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// EnhancedEscrow
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const enhancedEscrowAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_ldaoToken', internalType: 'address', type: 'address' },
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
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'escrowId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'arbitrator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ArbitratorAppointed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'escrowId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'deliveryInfo',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'DeliveryConfirmed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'escrowId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'method',
        internalType: 'enum EnhancedEscrow.DisputeResolutionMethod',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'DisputeOpened',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'escrowId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'buyer',
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
    ],
    name: 'EmergencyRefund',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'escrowId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'buyer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'seller',
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
    ],
    name: 'EscrowCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'escrowId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'resolution',
        internalType: 'enum EnhancedEscrow.EscrowStatus',
        type: 'uint8',
        indexed: false,
      },
      {
        name: 'winner',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
    ],
    name: 'EscrowResolved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'escrowId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'FundsLocked',
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
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'newScore',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newTier',
        internalType: 'enum EnhancedEscrow.ReputationTier',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'ReputationUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'reviewId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'reviewer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'reviewee',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'rating', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'ReviewSubmitted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'duration',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reason',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'UserSuspended',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'escrowId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'voter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'forBuyer', internalType: 'bool', type: 'bool', indexed: false },
      {
        name: 'votingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VoteCast',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_PLATFORM_FEE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MIN_VOTING_POWER',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'REPUTATION_DECAY_PERIOD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'VOTING_PERIOD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'arbitratorFees',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'arbitrator', internalType: 'address', type: 'address' },
      { name: 'authorized', internalType: 'bool', type: 'bool' },
    ],
    name: 'authorizeArbitrator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'authorizedArbitrators',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'calculateWeightedScore',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'reviewId', internalType: 'uint256', type: 'uint256' }],
    name: 'castHelpfulVote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'escrowId', internalType: 'uint256', type: 'uint256' },
      { name: 'forBuyer', internalType: 'bool', type: 'bool' },
    ],
    name: 'castVote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'escrowId', internalType: 'uint256', type: 'uint256' },
      { name: 'deliveryInfo', internalType: 'string', type: 'string' },
    ],
    name: 'confirmDelivery',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'listingId', internalType: 'uint256', type: 'uint256' },
      { name: 'seller', internalType: 'address', type: 'address' },
      { name: 'tokenAddress', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'deliveryDeadline', internalType: 'uint256', type: 'uint256' },
      {
        name: 'resolutionMethod',
        internalType: 'enum EnhancedEscrow.DisputeResolutionMethod',
        type: 'uint8',
      },
    ],
    name: 'createEscrow',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'detailedReputationScores',
    outputs: [
      { name: 'totalPoints', internalType: 'uint256', type: 'uint256' },
      { name: 'reviewCount', internalType: 'uint256', type: 'uint256' },
      { name: 'averageRating', internalType: 'uint256', type: 'uint256' },
      {
        name: 'successfulTransactions',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'disputesWon', internalType: 'uint256', type: 'uint256' },
      { name: 'disputesLost', internalType: 'uint256', type: 'uint256' },
      {
        name: 'tier',
        internalType: 'enum EnhancedEscrow.ReputationTier',
        type: 'uint8',
      },
      {
        name: 'lastActivityTimestamp',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'isSuspended', internalType: 'bool', type: 'bool' },
      { name: 'suspensionEndTime', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'escrows',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'listingId', internalType: 'uint256', type: 'uint256' },
      { name: 'buyer', internalType: 'address', type: 'address' },
      { name: 'seller', internalType: 'address', type: 'address' },
      { name: 'tokenAddress', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'feeAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'deliveryInfo', internalType: 'string', type: 'string' },
      { name: 'deliveryDeadline', internalType: 'uint256', type: 'uint256' },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
      { name: 'resolvedAt', internalType: 'uint256', type: 'uint256' },
      {
        name: 'status',
        internalType: 'enum EnhancedEscrow.EscrowStatus',
        type: 'uint8',
      },
      {
        name: 'resolutionMethod',
        internalType: 'enum EnhancedEscrow.DisputeResolutionMethod',
        type: 'uint8',
      },
      { name: 'votesForBuyer', internalType: 'uint256', type: 'uint256' },
      { name: 'votesForSeller', internalType: 'uint256', type: 'uint256' },
      { name: 'totalVotingPower', internalType: 'uint256', type: 'uint256' },
      { name: 'appointedArbitrator', internalType: 'address', type: 'address' },
      { name: 'evidenceSubmitted', internalType: 'string', type: 'string' },
      { name: 'requiresMultiSig', internalType: 'bool', type: 'bool' },
      { name: 'multiSigThreshold', internalType: 'uint256', type: 'uint256' },
      { name: 'signatureCount', internalType: 'uint256', type: 'uint256' },
      { name: 'timeLockExpiry', internalType: 'uint256', type: 'uint256' },
      { name: 'emergencyRefundEnabled', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'escrowId', internalType: 'uint256', type: 'uint256' }],
    name: 'executeEmergencyRefund',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getDetailedReputation',
    outputs: [
      {
        name: '',
        internalType: 'struct EnhancedEscrow.DetailedReputationScore',
        type: 'tuple',
        components: [
          { name: 'totalPoints', internalType: 'uint256', type: 'uint256' },
          { name: 'reviewCount', internalType: 'uint256', type: 'uint256' },
          { name: 'averageRating', internalType: 'uint256', type: 'uint256' },
          {
            name: 'successfulTransactions',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'disputesWon', internalType: 'uint256', type: 'uint256' },
          { name: 'disputesLost', internalType: 'uint256', type: 'uint256' },
          {
            name: 'tier',
            internalType: 'enum EnhancedEscrow.ReputationTier',
            type: 'uint8',
          },
          {
            name: 'lastActivityTimestamp',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'isSuspended', internalType: 'bool', type: 'bool' },
          {
            name: 'suspensionEndTime',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getReputationTier',
    outputs: [
      {
        name: '',
        internalType: 'enum EnhancedEscrow.ReputationTier',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'limit', internalType: 'uint256', type: 'uint256' }],
    name: 'getTopSellers',
    outputs: [
      { name: 'sellers', internalType: 'address[]', type: 'address[]' },
      { name: 'scores', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserReviews',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
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
    inputs: [],
    name: 'ldaoToken',
    outputs: [
      { name: '', internalType: 'contract LDAOToken', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'escrowId', internalType: 'uint256', type: 'uint256' }],
    name: 'lockFunds',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextEscrowId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextReviewId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'escrowId', internalType: 'uint256', type: 'uint256' }],
    name: 'openDispute',
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'platformFeePercentage',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
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
      { name: 'escrowId', internalType: 'uint256', type: 'uint256' },
      { name: 'buyerWins', internalType: 'bool', type: 'bool' },
    ],
    name: 'resolveDisputeByArbitrator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'reviews',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'reviewer', internalType: 'address', type: 'address' },
      { name: 'reviewee', internalType: 'address', type: 'address' },
      { name: 'escrowId', internalType: 'uint256', type: 'uint256' },
      { name: 'rating', internalType: 'uint8', type: 'uint8' },
      { name: 'reviewText', internalType: 'string', type: 'string' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'isVerified', internalType: 'bool', type: 'bool' },
      { name: 'helpfulVotes', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'arbitrator', internalType: 'address', type: 'address' },
      { name: 'fee', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'setArbitratorFee',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newGovernance', internalType: 'address', type: 'address' },
    ],
    name: 'setGovernance',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newToken', internalType: 'address', type: 'address' }],
    name: 'setLDAOToken',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newFee', internalType: 'uint256', type: 'uint256' }],
    name: 'setPlatformFee',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'escrowId', internalType: 'uint256', type: 'uint256' },
      { name: 'reviewee', internalType: 'address', type: 'address' },
      { name: 'rating', internalType: 'uint8', type: 'uint8' },
      { name: 'reviewText', internalType: 'string', type: 'string' },
    ],
    name: 'submitMarketplaceReview',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'duration', internalType: 'uint256', type: 'uint256' },
      { name: 'reason', internalType: 'string', type: 'string' },
    ],
    name: 'suspendUser',
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
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'userEscrows',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'userReviews',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const enhancedEscrowAddress = {
  11155111: '0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const enhancedEscrowConfig = {
  address: enhancedEscrowAddress,
  abi: enhancedEscrowAbi,
} as const

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
// FollowModule
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const followModuleAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'follower',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'following',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Followed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'follower',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'following',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Unfollowed',
  },
  {
    type: 'function',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'follow',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'follower', internalType: 'address', type: 'address' },
      { name: 'following', internalType: 'address', type: 'address' },
    ],
    name: 'isFollowing',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'unfollow',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'follows',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'followerCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'followingCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const followModuleAddress = {
  8453: '0x2345678901234567890123456789012345678901',
  84532: '0x2345678901234567890123456789012345678901',
  11155111: '0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439',
} as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const followModuleConfig = {
  address: followModuleAddress,
  abi: followModuleAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Governance
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const governanceAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_governanceToken', internalType: 'address', type: 'address' },
      { name: '_votingDelay', internalType: 'uint256', type: 'uint256' },
      { name: '_votingPeriod', internalType: 'uint256', type: 'uint256' },
      { name: '_quorumVotes', internalType: 'uint256', type: 'uint256' },
      { name: '_proposalThreshold', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'ProposalCanceled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: false },
      {
        name: 'proposer',
        internalType: 'address',
        type: 'address',
        indexed: false,
      },
      { name: 'title', internalType: 'string', type: 'string', indexed: false },
      {
        name: 'description',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'startBlock',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'endBlock',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ProposalCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'ProposalExecuted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'voter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'proposalId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      { name: 'support', internalType: 'bool', type: 'bool', indexed: false },
      {
        name: 'votes',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reason',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'VoteCast',
  },
  {
    type: 'function',
    inputs: [],
    name: 'proposalCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'votingDelay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'votingPeriod',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'quorumVotes',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'proposalThreshold',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'proposals',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'proposer', internalType: 'address', type: 'address' },
      { name: 'title', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'startBlock', internalType: 'uint256', type: 'uint256' },
      { name: 'endBlock', internalType: 'uint256', type: 'uint256' },
      { name: 'forVotes', internalType: 'uint256', type: 'uint256' },
      { name: 'againstVotes', internalType: 'uint256', type: 'uint256' },
      { name: 'quorum', internalType: 'uint256', type: 'uint256' },
      {
        name: 'state',
        internalType: 'enum Governance.ProposalState',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'proposalId', internalType: 'uint256', type: 'uint256' }],
    name: 'state',
    outputs: [
      {
        name: '',
        internalType: 'enum Governance.ProposalState',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'title', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'targets', internalType: 'address[]', type: 'address[]' },
      { name: 'values', internalType: 'uint256[]', type: 'uint256[]' },
      { name: 'signatures', internalType: 'string[]', type: 'string[]' },
      { name: 'calldatas', internalType: 'bytes[]', type: 'bytes[]' },
    ],
    name: 'propose',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'proposalId', internalType: 'uint256', type: 'uint256' },
      { name: 'support', internalType: 'bool', type: 'bool' },
      { name: 'reason', internalType: 'string', type: 'string' },
    ],
    name: 'castVote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'proposalId', internalType: 'uint256', type: 'uint256' }],
    name: 'execute',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'proposalId', internalType: 'uint256', type: 'uint256' }],
    name: 'cancel',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newVotingDelay', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'setVotingDelay',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newVotingPeriod', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'setVotingPeriod',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newQuorumVotes', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'setQuorumVotes',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      {
        name: 'newProposalThreshold',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    name: 'setProposalThreshold',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'votingPower',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'proposalVotes',
    outputs: [
      { name: 'hasVoted', internalType: 'bool', type: 'bool' },
      { name: 'support', internalType: 'bool', type: 'bool' },
      { name: 'votes', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'governanceToken',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
] as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const governanceAddress = {
  8453: '0x4567890123456789012345678901234567890123',
  84532: '0x4567890123456789012345678901234567890123',
  11155111: '0x27a78A860445DFFD9073aFd7065dd421487c0F8A',
} as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const governanceConfig = {
  address: governanceAddress,
  abi: governanceAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// LDAOToken
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const ldaoTokenAbi = [
  {
    type: 'constructor',
    inputs: [{ name: 'treasury', internalType: 'address', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  { type: 'error', inputs: [], name: 'ECDSAInvalidSignature' },
  {
    type: 'error',
    inputs: [{ name: 'length', internalType: 'uint256', type: 'uint256' }],
    name: 'ECDSAInvalidSignatureLength',
  },
  {
    type: 'error',
    inputs: [{ name: 's', internalType: 'bytes32', type: 'bytes32' }],
    name: 'ECDSAInvalidSignatureS',
  },
  {
    type: 'error',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'allowance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC20InsufficientAllowance',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'balance', internalType: 'uint256', type: 'uint256' },
      { name: 'needed', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC20InsufficientBalance',
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidApprover',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidReceiver',
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSender',
  },
  {
    type: 'error',
    inputs: [{ name: 'spender', internalType: 'address', type: 'address' }],
    name: 'ERC20InvalidSpender',
  },
  {
    type: 'error',
    inputs: [{ name: 'deadline', internalType: 'uint256', type: 'uint256' }],
    name: 'ERC2612ExpiredSignature',
  },
  {
    type: 'error',
    inputs: [
      { name: 'signer', internalType: 'address', type: 'address' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'ERC2612InvalidSigner',
  },
  {
    type: 'error',
    inputs: [
      { name: 'account', internalType: 'address', type: 'address' },
      { name: 'currentNonce', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'InvalidAccountNonce',
  },
  { type: 'error', inputs: [], name: 'InvalidShortString' },
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
    type: 'error',
    inputs: [{ name: 'str', internalType: 'string', type: 'string' }],
    name: 'StringTooLong',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ActivityRewardClaimed',
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
        name: 'spender',
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
    ],
    name: 'Approval',
  },
  { type: 'event', anonymous: false, inputs: [], name: 'EIP712DomainChanged' },
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
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
    ],
    name: 'PremiumMembershipGranted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
    ],
    name: 'PremiumMembershipRevoked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'RewardsClaimed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'tierId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'stakeIndex',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Staked',
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
        name: 'lockPeriod',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'rewardRate',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'StakingTierCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'value',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'amount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'stakeIndex',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'Unstaked',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'newVotingPower',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'VotingPowerUpdated',
  },
  {
    type: 'function',
    inputs: [],
    name: 'ACTIVITY_REWARD_COOLDOWN',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'INITIAL_SUPPLY',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_DISCOUNT_TIER',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'PREMIUM_MEMBERSHIP_THRESHOLD',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'amount', internalType: 'uint256', type: 'uint256' }],
    name: 'addToRewardPool',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'spender', internalType: 'address', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'account', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'claimActivityReward',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'claimAllStakeRewards',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'stakeIndex', internalType: 'uint256', type: 'uint256' }],
    name: 'claimStakeRewards',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'lockPeriod', internalType: 'uint256', type: 'uint256' },
      { name: 'rewardRate', internalType: 'uint256', type: 'uint256' },
      { name: 'minStakeAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'createStakingTier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', internalType: 'uint8', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'discountTier',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      { name: 'fields', internalType: 'bytes1', type: 'bytes1' },
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'version', internalType: 'string', type: 'string' },
      { name: 'chainId', internalType: 'uint256', type: 'uint256' },
      { name: 'verifyingContract', internalType: 'address', type: 'address' },
      { name: 'salt', internalType: 'bytes32', type: 'bytes32' },
      { name: 'extensions', internalType: 'uint256[]', type: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getDiscountPercentage',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getDiscountTier',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getTotalStakeRewards',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserStakes',
    outputs: [
      {
        name: '',
        internalType: 'struct LDAOToken.StakeInfo[]',
        type: 'tuple[]',
        components: [
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          {
            name: 'stakingStartTime',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'lockPeriod', internalType: 'uint256', type: 'uint256' },
          { name: 'rewardRate', internalType: 'uint256', type: 'uint256' },
          { name: 'lastRewardClaim', internalType: 'uint256', type: 'uint256' },
          { name: 'isActive', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'hasPremiumMembership',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'lastActivityReward',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
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
    name: 'nextTierId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'nonces',
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
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'spender', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
      { name: 'deadline', internalType: 'uint256', type: 'uint256' },
      { name: 'v', internalType: 'uint8', type: 'uint8' },
      { name: 'r', internalType: 'bytes32', type: 'bytes32' },
      { name: 's', internalType: 'bytes32', type: 'bytes32' },
    ],
    name: 'permit',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'premiumMembers',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
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
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'stake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'stakingTiers',
    outputs: [
      { name: 'lockPeriod', internalType: 'uint256', type: 'uint256' },
      { name: 'rewardRate', internalType: 'uint256', type: 'uint256' },
      { name: 'minStakeAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'isActive', internalType: 'bool', type: 'bool' },
    ],
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
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'totalStaked',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalStakedSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'value', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
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
    inputs: [{ name: 'stakeIndex', internalType: 'uint256', type: 'uint256' }],
    name: 'unstake',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tierId', internalType: 'uint256', type: 'uint256' },
      { name: 'lockPeriod', internalType: 'uint256', type: 'uint256' },
      { name: 'rewardRate', internalType: 'uint256', type: 'uint256' },
      { name: 'minStakeAmount', internalType: 'uint256', type: 'uint256' },
      { name: 'isActive', internalType: 'bool', type: 'bool' },
    ],
    name: 'updateStakingTier',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'userStakes',
    outputs: [
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'stakingStartTime', internalType: 'uint256', type: 'uint256' },
      { name: 'lockPeriod', internalType: 'uint256', type: 'uint256' },
      { name: 'rewardRate', internalType: 'uint256', type: 'uint256' },
      { name: 'lastRewardClaim', internalType: 'uint256', type: 'uint256' },
      { name: 'isActive', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'votingPower',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const ldaoTokenAddress = {
  11155111: '0xc9F690B45e33ca909bB9ab97836091673232611B',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const ldaoTokenConfig = {
  address: ldaoTokenAddress,
  abi: ldaoTokenAbi,
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
// Marketplace
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const marketplaceAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_ldaoToken', internalType: 'address', type: 'address' }],
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
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'listingId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'winner',
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
    ],
    name: 'AuctionEnded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'listingId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'bidder',
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
    ],
    name: 'BidPlaced',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'disputeId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'orderId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'complainant',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'DisputeCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'disputeId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'resolution',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'DisputeResolved',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'listingId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'ListingCancelled',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'listingId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'seller',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'price',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'itemType',
        internalType: 'enum Marketplace.ItemType',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'ListingCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'listingId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'newPrice',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ListingUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'listingId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'OfferAccepted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'offerId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'listingId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'buyer',
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
    ],
    name: 'OfferMade',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'orderId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'listingId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'buyer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'OrderCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'orderId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'listingId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'buyer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'discountAmount',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'discountPercentage',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'OrderCreatedWithDiscount',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'orderId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'status',
        internalType: 'enum Marketplace.OrderStatus',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'OrderStatusUpdated',
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
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'newScore',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ReputationUpdated',
  },
  {
    type: 'function',
    inputs: [],
    name: 'AUCTION_EXTENSION_TIME',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'MAX_PLATFORM_FEE',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'listingId', internalType: 'uint256', type: 'uint256' }],
    name: 'acceptHighestBid',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'offerId', internalType: 'uint256', type: 'uint256' }],
    name: 'acceptOffer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'listingId', internalType: 'uint256', type: 'uint256' }],
    name: 'cancelListing',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenAddress', internalType: 'address', type: 'address' },
      { name: 'price', internalType: 'uint256', type: 'uint256' },
      { name: 'quantity', internalType: 'uint256', type: 'uint256' },
      {
        name: 'itemType',
        internalType: 'enum Marketplace.ItemType',
        type: 'uint8',
      },
      {
        name: 'listingType',
        internalType: 'enum Marketplace.ListingType',
        type: 'uint8',
      },
      { name: 'endTime', internalType: 'uint256', type: 'uint256' },
      { name: 'metadataURI', internalType: 'string', type: 'string' },
    ],
    name: 'createListing',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'daoApprovedVendors',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'disputes',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'orderId', internalType: 'uint256', type: 'uint256' },
      { name: 'complainant', internalType: 'address', type: 'address' },
      { name: 'respondent', internalType: 'address', type: 'address' },
      { name: 'reason', internalType: 'string', type: 'string' },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
      { name: 'resolved', internalType: 'bool', type: 'bool' },
      { name: 'resolver', internalType: 'address', type: 'address' },
      { name: 'resolution', internalType: 'string', type: 'string' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'escrowContract',
    outputs: [
      { name: '', internalType: 'contract EnhancedEscrow', type: 'address' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'start', internalType: 'uint256', type: 'uint256' },
      { name: 'count', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'getActiveListings',
    outputs: [
      {
        name: '',
        internalType: 'struct Marketplace.Listing[]',
        type: 'tuple[]',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'seller', internalType: 'address', type: 'address' },
          { name: 'tokenAddress', internalType: 'address', type: 'address' },
          { name: 'price', internalType: 'uint256', type: 'uint256' },
          { name: 'quantity', internalType: 'uint256', type: 'uint256' },
          {
            name: 'itemType',
            internalType: 'enum Marketplace.ItemType',
            type: 'uint8',
          },
          {
            name: 'listingType',
            internalType: 'enum Marketplace.ListingType',
            type: 'uint8',
          },
          {
            name: 'status',
            internalType: 'enum Marketplace.ListingStatus',
            type: 'uint8',
          },
          { name: 'startTime', internalType: 'uint256', type: 'uint256' },
          { name: 'endTime', internalType: 'uint256', type: 'uint256' },
          { name: 'highestBid', internalType: 'uint256', type: 'uint256' },
          { name: 'highestBidder', internalType: 'address', type: 'address' },
          { name: 'metadataURI', internalType: 'string', type: 'string' },
          { name: 'isEscrowed', internalType: 'bool', type: 'bool' },
          {
            name: 'nftStandard',
            internalType: 'enum Marketplace.NFTStandard',
            type: 'uint8',
          },
          { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
          { name: 'reservePrice', internalType: 'uint256', type: 'uint256' },
          { name: 'minIncrement', internalType: 'uint256', type: 'uint256' },
          { name: 'reserveMet', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'listingId', internalType: 'uint256', type: 'uint256' }],
    name: 'getBids',
    outputs: [
      {
        name: '',
        internalType: 'struct Marketplace.Bid[]',
        type: 'tuple[]',
        components: [
          { name: 'bidder', internalType: 'address', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'disputeId', internalType: 'uint256', type: 'uint256' }],
    name: 'getDispute',
    outputs: [
      {
        name: '',
        internalType: 'struct Marketplace.Dispute',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'orderId', internalType: 'uint256', type: 'uint256' },
          { name: 'complainant', internalType: 'address', type: 'address' },
          { name: 'respondent', internalType: 'address', type: 'address' },
          { name: 'reason', internalType: 'string', type: 'string' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'resolved', internalType: 'bool', type: 'bool' },
          { name: 'resolver', internalType: 'address', type: 'address' },
          { name: 'resolution', internalType: 'string', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'listingId', internalType: 'uint256', type: 'uint256' }],
    name: 'getOffers',
    outputs: [
      {
        name: '',
        internalType: 'struct Marketplace.Offer[]',
        type: 'tuple[]',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'listingId', internalType: 'uint256', type: 'uint256' },
          { name: 'buyer', internalType: 'address', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'accepted', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'orderId', internalType: 'uint256', type: 'uint256' }],
    name: 'getOrder',
    outputs: [
      {
        name: '',
        internalType: 'struct Marketplace.Order',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'listingId', internalType: 'uint256', type: 'uint256' },
          { name: 'buyer', internalType: 'address', type: 'address' },
          { name: 'seller', internalType: 'address', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'paymentToken', internalType: 'address', type: 'address' },
          {
            name: 'status',
            internalType: 'enum Marketplace.OrderStatus',
            type: 'uint8',
          },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'updatedAt', internalType: 'uint256', type: 'uint256' },
          { name: 'shippingInfo', internalType: 'string', type: 'string' },
          { name: 'trackingNumber', internalType: 'string', type: 'string' },
        ],
      },
    ],
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
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'listingBids',
    outputs: [
      { name: 'bidder', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'listingOffers',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'listingId', internalType: 'uint256', type: 'uint256' },
      { name: 'buyer', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
      { name: 'accepted', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'listings',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'seller', internalType: 'address', type: 'address' },
      { name: 'tokenAddress', internalType: 'address', type: 'address' },
      { name: 'price', internalType: 'uint256', type: 'uint256' },
      { name: 'quantity', internalType: 'uint256', type: 'uint256' },
      {
        name: 'itemType',
        internalType: 'enum Marketplace.ItemType',
        type: 'uint8',
      },
      {
        name: 'listingType',
        internalType: 'enum Marketplace.ListingType',
        type: 'uint8',
      },
      {
        name: 'status',
        internalType: 'enum Marketplace.ListingStatus',
        type: 'uint8',
      },
      { name: 'startTime', internalType: 'uint256', type: 'uint256' },
      { name: 'endTime', internalType: 'uint256', type: 'uint256' },
      { name: 'highestBid', internalType: 'uint256', type: 'uint256' },
      { name: 'highestBidder', internalType: 'address', type: 'address' },
      { name: 'metadataURI', internalType: 'string', type: 'string' },
      { name: 'isEscrowed', internalType: 'bool', type: 'bool' },
      {
        name: 'nftStandard',
        internalType: 'enum Marketplace.NFTStandard',
        type: 'uint8',
      },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'reservePrice', internalType: 'uint256', type: 'uint256' },
      { name: 'minIncrement', internalType: 'uint256', type: 'uint256' },
      { name: 'reserveMet', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'listingId', internalType: 'uint256', type: 'uint256' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'makeOffer',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minReputationScore',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextDisputeId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextListingId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextOfferId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextOrderId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'orders',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'listingId', internalType: 'uint256', type: 'uint256' },
      { name: 'buyer', internalType: 'address', type: 'address' },
      { name: 'seller', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'paymentToken', internalType: 'address', type: 'address' },
      {
        name: 'status',
        internalType: 'enum Marketplace.OrderStatus',
        type: 'uint8',
      },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
      { name: 'updatedAt', internalType: 'uint256', type: 'uint256' },
      { name: 'shippingInfo', internalType: 'string', type: 'string' },
      { name: 'trackingNumber', internalType: 'string', type: 'string' },
    ],
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
    inputs: [{ name: 'listingId', internalType: 'uint256', type: 'uint256' }],
    name: 'placeBid',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'platformFeePercentage',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'listingId', internalType: 'uint256', type: 'uint256' },
      { name: 'quantity', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'purchaseListing',
    outputs: [],
    stateMutability: 'payable',
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
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'reputationScores',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newTime', internalType: 'uint256', type: 'uint256' }],
    name: 'setAuctionExtensionTime',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'vendor', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setDAOApprovedVendor',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_escrowContract', internalType: 'address', type: 'address' },
    ],
    name: 'setEscrowContract',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newScore', internalType: 'uint256', type: 'uint256' }],
    name: 'setMinReputationScore',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newFee', internalType: 'uint256', type: 'uint256' }],
    name: 'setPlatformFee',
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
    inputs: [
      { name: 'listingId', internalType: 'uint256', type: 'uint256' },
      { name: 'newPrice', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateListingPrice',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'score', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'updateReputationScore',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'userListings',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'userOrders',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const marketplaceAddress = {
  11155111: '0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const marketplaceConfig = {
  address: marketplaceAddress,
  abi: marketplaceAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// NFTMarketplace
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const nftMarketplaceAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: '_usdcToken', internalType: 'address', type: 'address' },
      { name: '_usdtToken', internalType: 'address', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    inputs: [
      { name: 'numerator', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC2981InvalidDefaultRoyalty',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC2981InvalidDefaultRoyaltyReceiver',
  },
  {
    type: 'error',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'numerator', internalType: 'uint256', type: 'uint256' },
      { name: 'denominator', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC2981InvalidTokenRoyalty',
  },
  {
    type: 'error',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'receiver', internalType: 'address', type: 'address' },
    ],
    name: 'ERC2981InvalidTokenRoyaltyReceiver',
  },
  {
    type: 'error',
    inputs: [
      { name: 'sender', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'owner', internalType: 'address', type: 'address' },
    ],
    name: 'ERC721IncorrectOwner',
  },
  {
    type: 'error',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'ERC721InsufficientApproval',
  },
  {
    type: 'error',
    inputs: [{ name: 'approver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidApprover',
  },
  {
    type: 'error',
    inputs: [{ name: 'operator', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOperator',
  },
  {
    type: 'error',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidOwner',
  },
  {
    type: 'error',
    inputs: [{ name: 'receiver', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidReceiver',
  },
  {
    type: 'error',
    inputs: [{ name: 'sender', internalType: 'address', type: 'address' }],
    name: 'ERC721InvalidSender',
  },
  {
    type: 'error',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ERC721NonexistentToken',
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
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'seller',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'startingPrice',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reservePrice',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'endTime',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'AuctionCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'winner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'winningBid',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'AuctionEnded',
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
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'bidder',
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
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'BidPlaced',
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
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'seller',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'price',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'expiresAt',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'NFTListed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'creator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'tokenURI',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'royalty',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'NFTMinted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'seller',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'buyer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'price',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'NFTSold',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'seller',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'buyer',
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
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'OfferAccepted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'buyer',
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
        name: 'expiresAt',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'OfferMade',
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
      { name: 'usdc', internalType: 'address', type: 'address', indexed: true },
      { name: 'usdt', internalType: 'address', type: 'address', indexed: true },
    ],
    name: 'PaymentTokensSet',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
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
    ],
    name: 'RoyaltyPaid',
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
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'offerIndex', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'acceptOffer',
    outputs: [],
    stateMutability: 'nonpayable',
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
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'auctions',
    outputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'seller', internalType: 'address', type: 'address' },
      { name: 'startingPrice', internalType: 'uint256', type: 'uint256' },
      { name: 'reservePrice', internalType: 'uint256', type: 'uint256' },
      { name: 'currentBid', internalType: 'uint256', type: 'uint256' },
      { name: 'currentBidder', internalType: 'address', type: 'address' },
      { name: 'startTime', internalType: 'uint256', type: 'uint256' },
      { name: 'endTime', internalType: 'uint256', type: 'uint256' },
      { name: 'isActive', internalType: 'bool', type: 'bool' },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
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
    name: 'buyNFT',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'cancelListing',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'offerIndex', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'cancelOffer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'startingPrice', internalType: 'uint256', type: 'uint256' },
      { name: 'reservePrice', internalType: 'uint256', type: 'uint256' },
      { name: 'duration', internalType: 'uint256', type: 'uint256' },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
      },
    ],
    name: 'createAuction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'creatorNFTs',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'creatorRoyalties',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'endAuction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getActiveOffers',
    outputs: [
      {
        name: '',
        internalType: 'struct NFTMarketplace.Offer[]',
        type: 'tuple[]',
        components: [
          { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
          { name: 'buyer', internalType: 'address', type: 'address' },
          { name: 'amount', internalType: 'uint256', type: 'uint256' },
          { name: 'expiresAt', internalType: 'uint256', type: 'uint256' },
          { name: 'isActive', internalType: 'bool', type: 'bool' },
          {
            name: 'paymentMethod',
            internalType: 'enum NFTMarketplace.PaymentMethod',
            type: 'uint8',
          },
        ],
      },
    ],
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
    inputs: [{ name: 'creator', internalType: 'address', type: 'address' }],
    name: 'getCreatorNFTs',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getNFTMetadata',
    outputs: [
      {
        name: '',
        internalType: 'struct NFTMarketplace.NFTMetadata',
        type: 'tuple',
        components: [
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'image', internalType: 'string', type: 'string' },
          { name: 'animationUrl', internalType: 'string', type: 'string' },
          { name: 'externalUrl', internalType: 'string', type: 'string' },
          { name: 'attributes', internalType: 'string[]', type: 'string[]' },
          { name: 'creator', internalType: 'address', type: 'address' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'isVerified', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
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
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'price', internalType: 'uint256', type: 'uint256' },
      { name: 'duration', internalType: 'uint256', type: 'uint256' },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
      },
    ],
    name: 'listNFT',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'listings',
    outputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'seller', internalType: 'address', type: 'address' },
      { name: 'price', internalType: 'uint256', type: 'uint256' },
      { name: 'isActive', internalType: 'bool', type: 'bool' },
      { name: 'listedAt', internalType: 'uint256', type: 'uint256' },
      { name: 'expiresAt', internalType: 'uint256', type: 'uint256' },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'duration', internalType: 'uint256', type: 'uint256' },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
      },
      { name: 'tokenAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'makeOffer',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxRoyalty',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: '_tokenURI', internalType: 'string', type: 'string' },
      { name: 'royalty', internalType: 'uint256', type: 'uint256' },
      { name: 'contentHash', internalType: 'bytes32', type: 'bytes32' },
      {
        name: 'metadata',
        internalType: 'struct NFTMarketplace.NFTMetadata',
        type: 'tuple',
        components: [
          { name: 'name', internalType: 'string', type: 'string' },
          { name: 'description', internalType: 'string', type: 'string' },
          { name: 'image', internalType: 'string', type: 'string' },
          { name: 'animationUrl', internalType: 'string', type: 'string' },
          { name: 'externalUrl', internalType: 'string', type: 'string' },
          { name: 'attributes', internalType: 'string[]', type: 'string[]' },
          { name: 'creator', internalType: 'address', type: 'address' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
          { name: 'isVerified', internalType: 'bool', type: 'bool' },
        ],
      },
    ],
    name: 'mintNFT',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
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
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'nftMetadata',
    outputs: [
      { name: 'name', internalType: 'string', type: 'string' },
      { name: 'description', internalType: 'string', type: 'string' },
      { name: 'image', internalType: 'string', type: 'string' },
      { name: 'animationUrl', internalType: 'string', type: 'string' },
      { name: 'externalUrl', internalType: 'string', type: 'string' },
      { name: 'creator', internalType: 'address', type: 'address' },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
      { name: 'isVerified', internalType: 'bool', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'offers',
    outputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'buyer', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
      { name: 'expiresAt', internalType: 'uint256', type: 'uint256' },
      { name: 'isActive', internalType: 'bool', type: 'bool' },
      {
        name: 'paymentMethod',
        internalType: 'enum NFTMarketplace.PaymentMethod',
        type: 'uint8',
      },
    ],
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
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'tokenAmount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'placeBid',
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'platformFee',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'platformFeeRecipient',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
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
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'salePrice', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'royaltyInfo',
    outputs: [
      { name: 'receiver', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
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
    inputs: [
      { name: '_usdcToken', internalType: 'address', type: 'address' },
      { name: '_usdtToken', internalType: 'address', type: 'address' },
    ],
    name: 'setPaymentTokens',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '_platformFee', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'setPlatformFee',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '_recipient', internalType: 'address', type: 'address' }],
    name: 'setPlatformFeeRecipient',
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
    inputs: [],
    name: 'usdcToken',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'usdtToken',
    outputs: [{ name: '', internalType: 'contract IERC20', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'bytes32', type: 'bytes32' }],
    name: 'usedHashes',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'verifyNFT',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'offerIndex', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'withdrawExpiredOffer',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const nftMarketplaceAddress = {
  11155111: '0x012d3646Cd0D587183112fdD38f473FaA50D2A09',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const nftMarketplaceConfig = {
  address: nftMarketplaceAddress,
  abi: nftMarketplaceAbi,
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
// ProfileRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const profileRegistryAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
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
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'handle',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'createdAt',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ProfileCreated',
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
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'handle',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'avatarCid',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'bioCid',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'ProfileUpdated',
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
    inputs: [
      { name: 'handle', internalType: 'string', type: 'string' },
      { name: 'ens', internalType: 'string', type: 'string' },
      { name: 'avatarCid', internalType: 'string', type: 'string' },
      { name: 'bioCid', internalType: 'string', type: 'string' },
    ],
    name: 'createProfile',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
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
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getProfileByAddress',
    outputs: [
      {
        name: '',
        internalType: 'struct ProfileRegistry.Profile',
        type: 'tuple',
        components: [
          { name: 'handle', internalType: 'string', type: 'string' },
          { name: 'ens', internalType: 'string', type: 'string' },
          { name: 'avatarCid', internalType: 'string', type: 'string' },
          { name: 'bioCid', internalType: 'string', type: 'string' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'handle', internalType: 'string', type: 'string' }],
    name: 'getProfileByHandle',
    outputs: [
      {
        name: '',
        internalType: 'struct ProfileRegistry.Profile',
        type: 'tuple',
        components: [
          { name: 'handle', internalType: 'string', type: 'string' },
          { name: 'ens', internalType: 'string', type: 'string' },
          { name: 'avatarCid', internalType: 'string', type: 'string' },
          { name: 'bioCid', internalType: 'string', type: 'string' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
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
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
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
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'avatarCid', internalType: 'string', type: 'string' },
      { name: 'bioCid', internalType: 'string', type: 'string' },
    ],
    name: 'updateProfile',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'ens', internalType: 'string', type: 'string' },
    ],
    name: 'updateEns',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'addressToTokenId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'string', type: 'string' }],
    name: 'handleToTokenId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'profiles',
    outputs: [
      { name: 'handle', internalType: 'string', type: 'string' },
      { name: 'ens', internalType: 'string', type: 'string' },
      { name: 'avatarCid', internalType: 'string', type: 'string' },
      { name: 'bioCid', internalType: 'string', type: 'string' },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const profileRegistryAddress = {
  8453: '0x1234567890123456789012345678901234567890',
  84532: '0x1234567890123456789012345678901234567890',
  11155111: '0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD',
} as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const profileRegistryConfig = {
  address: profileRegistryAddress,
  abi: profileRegistryAbi,
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
// ReputationSystem
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const reputationSystemAbi = [
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
  { type: 'error', inputs: [], name: 'ReentrancyGuardReentrantCall' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'reviewId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'voter',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'isHelpful', internalType: 'bool', type: 'bool', indexed: false },
    ],
    name: 'HelpfulVoteCast',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'moderator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ModeratorAdded',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'moderator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ModeratorRemoved',
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
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'newScore',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'newTier',
        internalType: 'enum ReputationSystem.ReputationTier',
        type: 'uint8',
        indexed: false,
      },
    ],
    name: 'ReputationUpdated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'reviewId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'reviewer',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'reviewee',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      { name: 'rating', internalType: 'uint8', type: 'uint8', indexed: false },
    ],
    name: 'ReviewSubmitted',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'reviewId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'moderator',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'ReviewVerified',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'reason',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'SuspiciousActivityDetected',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'duration',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'reason',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'UserSuspended',
  },
  {
    type: 'function',
    inputs: [{ name: 'moderator', internalType: 'address', type: 'address' }],
    name: 'addModerator',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'calculateWeightedScore',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'reviewId', internalType: 'uint256', type: 'uint256' },
      { name: 'isHelpful', internalType: 'bool', type: 'bool' },
    ],
    name: 'castHelpfulVote',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getReputationScore',
    outputs: [
      {
        name: '',
        internalType: 'struct ReputationSystem.ReputationScore',
        type: 'tuple',
        components: [
          { name: 'totalPoints', internalType: 'uint256', type: 'uint256' },
          { name: 'reviewCount', internalType: 'uint256', type: 'uint256' },
          { name: 'averageRating', internalType: 'uint256', type: 'uint256' },
          { name: 'weightedScore', internalType: 'uint256', type: 'uint256' },
          { name: 'lastUpdated', internalType: 'uint256', type: 'uint256' },
          {
            name: 'tier',
            internalType: 'enum ReputationSystem.ReputationTier',
            type: 'uint8',
          },
          {
            name: 'suspiciousActivityCount',
            internalType: 'uint256',
            type: 'uint256',
          },
          {
            name: 'lastReviewTimestamp',
            internalType: 'uint256',
            type: 'uint256',
          },
          { name: 'isSuspended', internalType: 'bool', type: 'bool' },
          {
            name: 'suspensionEndTime',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'reviewId', internalType: 'uint256', type: 'uint256' }],
    name: 'getReview',
    outputs: [
      {
        name: '',
        internalType: 'struct ReputationSystem.Review',
        type: 'tuple',
        components: [
          { name: 'id', internalType: 'uint256', type: 'uint256' },
          { name: 'reviewer', internalType: 'address', type: 'address' },
          { name: 'reviewee', internalType: 'address', type: 'address' },
          { name: 'orderId', internalType: 'uint256', type: 'uint256' },
          { name: 'rating', internalType: 'uint8', type: 'uint8' },
          { name: 'ipfsHash', internalType: 'string', type: 'string' },
          { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
          {
            name: 'status',
            internalType: 'enum ReputationSystem.ReviewStatus',
            type: 'uint8',
          },
          { name: 'helpfulVotes', internalType: 'uint256', type: 'uint256' },
          { name: 'unhelpfulVotes', internalType: 'uint256', type: 'uint256' },
          { name: 'isVerifiedPurchase', internalType: 'bool', type: 'bool' },
          {
            name: 'reviewerReputationAtTime',
            internalType: 'uint256',
            type: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'limit', internalType: 'uint256', type: 'uint256' }],
    name: 'getTopSellers',
    outputs: [
      {
        name: '',
        internalType: 'struct ReputationSystem.SellerRanking[]',
        type: 'tuple[]',
        components: [
          { name: 'seller', internalType: 'address', type: 'address' },
          { name: 'score', internalType: 'uint256', type: 'uint256' },
          { name: 'salesCount', internalType: 'uint256', type: 'uint256' },
          { name: 'averageRating', internalType: 'uint256', type: 'uint256' },
          {
            name: 'tier',
            internalType: 'enum ReputationSystem.ReputationTier',
            type: 'uint8',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getUserReviews',
    outputs: [{ name: '', internalType: 'uint256[]', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'hasReviewed',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'helpfulVoteWeight',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'maxReviewsPerDay',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'minReviewInterval',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'moderatorMinReputation',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'moderatorReputationThreshold',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'nextReviewId',
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
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'amount', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'recordSuccessfulTransaction',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'moderator', internalType: 'address', type: 'address' }],
    name: 'removeModerator',
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
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'reputationScores',
    outputs: [
      { name: 'totalPoints', internalType: 'uint256', type: 'uint256' },
      { name: 'reviewCount', internalType: 'uint256', type: 'uint256' },
      { name: 'averageRating', internalType: 'uint256', type: 'uint256' },
      { name: 'weightedScore', internalType: 'uint256', type: 'uint256' },
      { name: 'lastUpdated', internalType: 'uint256', type: 'uint256' },
      {
        name: 'tier',
        internalType: 'enum ReputationSystem.ReputationTier',
        type: 'uint8',
      },
      {
        name: 'suspiciousActivityCount',
        internalType: 'uint256',
        type: 'uint256',
      },
      { name: 'lastReviewTimestamp', internalType: 'uint256', type: 'uint256' },
      { name: 'isSuspended', internalType: 'bool', type: 'bool' },
      { name: 'suspensionEndTime', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'responseTime',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'uint256', type: 'uint256' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'reviewHasVoted',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'reviewVerificationReward',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'reviews',
    outputs: [
      { name: 'id', internalType: 'uint256', type: 'uint256' },
      { name: 'reviewer', internalType: 'address', type: 'address' },
      { name: 'reviewee', internalType: 'address', type: 'address' },
      { name: 'orderId', internalType: 'uint256', type: 'uint256' },
      { name: 'rating', internalType: 'uint8', type: 'uint8' },
      { name: 'ipfsHash', internalType: 'string', type: 'string' },
      { name: 'timestamp', internalType: 'uint256', type: 'uint256' },
      {
        name: 'status',
        internalType: 'enum ReputationSystem.ReviewStatus',
        type: 'uint8',
      },
      { name: 'helpfulVotes', internalType: 'uint256', type: 'uint256' },
      { name: 'unhelpfulVotes', internalType: 'uint256', type: 'uint256' },
      { name: 'isVerifiedPurchase', internalType: 'bool', type: 'bool' },
      {
        name: 'reviewerReputationAtTime',
        internalType: 'uint256',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'newMax', internalType: 'uint256', type: 'uint256' }],
    name: 'setMaxReviewsPerDay',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newInterval', internalType: 'uint256', type: 'uint256' }],
    name: 'setMinReviewInterval',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'newMin', internalType: 'uint256', type: 'uint256' }],
    name: 'setModeratorMinReputation',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'newThreshold', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'setSuspiciousActivityThreshold',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'reviewee', internalType: 'address', type: 'address' },
      { name: 'orderId', internalType: 'uint256', type: 'uint256' },
      { name: 'rating', internalType: 'uint8', type: 'uint8' },
      { name: 'ipfsHash', internalType: 'string', type: 'string' },
      { name: 'isVerifiedPurchase', internalType: 'bool', type: 'bool' },
    ],
    name: 'submitReview',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'successfulTransactions',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'user', internalType: 'address', type: 'address' },
      { name: 'duration', internalType: 'uint256', type: 'uint256' },
      { name: 'reason', internalType: 'string', type: 'string' },
    ],
    name: 'suspendUser',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'suspiciousActivityThreshold',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'totalRevenue',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'totalReviews',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'totalSales',
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
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'userReviews',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'verifiedModerators',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'reviewId', internalType: 'uint256', type: 'uint256' }],
    name: 'verifyReview',
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const reputationSystemAddress = {
  11155111: '0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2',
} as const

/**
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const reputationSystemConfig = {
  address: reputationSystemAddress,
  abi: reputationSystemAbi,
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
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityGovernanceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useReadCharityGovernance = /*#__PURE__*/ createUseReadContract({
  abi: charityGovernanceAbi,
  address: charityGovernanceAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link charityGovernanceAbi}__ and `functionName` set to `"getProposal"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useReadCharityGovernanceGetProposal =
  /*#__PURE__*/ createUseReadContract({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    functionName: 'getProposal',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"DelegateChanged"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceDelegateChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'DelegateChanged',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"DelegateVotesChanged"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceDelegateVotesChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'DelegateVotesChanged',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"ProposalCanceled"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceProposalCanceledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'ProposalCanceled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"ProposalExecuted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceProposalExecutedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'ProposalExecuted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"ProposalQueued"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceProposalQueuedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'ProposalQueued',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"ProposalCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceProposalCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'ProposalCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"CharityProposalCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceCharityProposalCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'CharityProposalCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"VoteCast"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceVoteCastEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'VoteCast',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"DelegationUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceDelegationUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'DelegationUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"CategoryParametersUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceCategoryParametersUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'CategoryParametersUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"VotingPowerUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceVotingPowerUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'VotingPowerUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"TargetAuthorized"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceTargetAuthorizedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'TargetAuthorized',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link charityGovernanceAbi}__ and `eventName` set to `"TargetRevoked"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x25b39592AA8da0be424734E0F143E5371396dd61)
 */
export const useWatchCharityGovernanceTargetRevokedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: charityGovernanceAbi,
    address: charityGovernanceAddress,
    eventName: 'TargetRevoked',
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
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolution = /*#__PURE__*/ createUseReadContract({
  abi: disputeResolutionAbi,
  address: disputeResolutionAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"analytics"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionAnalytics =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'analytics',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"approvedArbitrators"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionApprovedArbitrators =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'approvedArbitrators',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"arbitratorApplications"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionArbitratorApplications =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'arbitratorApplications',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"arbitratorMinReputation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionArbitratorMinReputation =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'arbitratorMinReputation',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"assignedArbitrators"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionAssignedArbitrators =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'assignedArbitrators',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"communityVotingPeriod"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionCommunityVotingPeriod =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'communityVotingPeriod',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"daoEscalationThreshold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionDaoEscalationThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'daoEscalationThreshold',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"disputeEvidence"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionDisputeEvidence =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'disputeEvidence',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"disputeVotes"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionDisputeVotes =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'disputeVotes',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"disputes"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionDisputes =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'disputes',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"evidenceSubmissionPeriod"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionEvidenceSubmissionPeriod =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'evidenceSubmissionPeriod',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"getDispute"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionGetDispute =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'getDispute',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"getDisputeAnalytics"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionGetDisputeAnalytics =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'getDisputeAnalytics',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"getDisputeEvidence"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionGetDisputeEvidence =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'getDisputeEvidence',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"getDisputeVotes"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionGetDisputeVotes =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'getDisputeVotes',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"governance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionGovernance =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'governance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"hasVoted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionHasVoted =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'hasVoted',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"minimumVotingPower"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionMinimumVotingPower =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'minimumVotingPower',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"nextDisputeId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionNextDisputeId =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'nextDisputeId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionOwner =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'owner',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"reputationSystem"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useReadDisputeResolutionReputationSystem =
  /*#__PURE__*/ createUseReadContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'reputationSystem',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolution = /*#__PURE__*/ createUseWriteContract({
  abi: disputeResolutionAbi,
  address: disputeResolutionAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"applyForArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolutionApplyForArbitrator =
  /*#__PURE__*/ createUseWriteContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'applyForArbitrator',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"approveArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolutionApproveArbitrator =
  /*#__PURE__*/ createUseWriteContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'approveArbitrator',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"castCommunityVote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolutionCastCommunityVote =
  /*#__PURE__*/ createUseWriteContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'castCommunityVote',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"createDispute"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolutionCreateDispute =
  /*#__PURE__*/ createUseWriteContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'createDispute',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"proceedToArbitration"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolutionProceedToArbitration =
  /*#__PURE__*/ createUseWriteContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'proceedToArbitration',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolutionRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"resolveAsArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolutionResolveAsArbitrator =
  /*#__PURE__*/ createUseWriteContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'resolveAsArbitrator',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"submitEvidence"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolutionSubmitEvidence =
  /*#__PURE__*/ createUseWriteContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'submitEvidence',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWriteDisputeResolutionTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolution =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"applyForArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolutionApplyForArbitrator =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'applyForArbitrator',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"approveArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolutionApproveArbitrator =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'approveArbitrator',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"castCommunityVote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolutionCastCommunityVote =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'castCommunityVote',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"createDispute"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolutionCreateDispute =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'createDispute',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"proceedToArbitration"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolutionProceedToArbitration =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'proceedToArbitration',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolutionRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"resolveAsArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolutionResolveAsArbitrator =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'resolveAsArbitrator',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"submitEvidence"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolutionSubmitEvidence =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'submitEvidence',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link disputeResolutionAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useSimulateDisputeResolutionTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__ and `eventName` set to `"ArbitratorApplicationSubmitted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionArbitratorApplicationSubmittedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    eventName: 'ArbitratorApplicationSubmitted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__ and `eventName` set to `"ArbitratorApproved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionArbitratorApprovedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    eventName: 'ArbitratorApproved',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__ and `eventName` set to `"ArbitratorAssigned"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionArbitratorAssignedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    eventName: 'ArbitratorAssigned',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__ and `eventName` set to `"CommunityVoteCast"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionCommunityVoteCastEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    eventName: 'CommunityVoteCast',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__ and `eventName` set to `"DisputeCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionDisputeCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    eventName: 'DisputeCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__ and `eventName` set to `"DisputeEscalated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionDisputeEscalatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    eventName: 'DisputeEscalated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__ and `eventName` set to `"DisputeResolved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionDisputeResolvedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    eventName: 'DisputeResolved',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__ and `eventName` set to `"EvidenceSubmitted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionEvidenceSubmittedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    eventName: 'EvidenceSubmitted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link disputeResolutionAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a)
 */
export const useWatchDisputeResolutionOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: disputeResolutionAbi,
    address: disputeResolutionAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrow = /*#__PURE__*/ createUseReadContract({
  abi: enhancedEscrowAbi,
  address: enhancedEscrowAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"MAX_PLATFORM_FEE"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowMaxPlatformFee =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'MAX_PLATFORM_FEE',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"MIN_VOTING_POWER"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowMinVotingPower =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'MIN_VOTING_POWER',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"REPUTATION_DECAY_PERIOD"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowReputationDecayPeriod =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'REPUTATION_DECAY_PERIOD',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"VOTING_PERIOD"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowVotingPeriod =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'VOTING_PERIOD',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"arbitratorFees"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowArbitratorFees =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'arbitratorFees',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"authorizedArbitrators"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowAuthorizedArbitrators =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'authorizedArbitrators',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"calculateWeightedScore"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowCalculateWeightedScore =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'calculateWeightedScore',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"detailedReputationScores"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowDetailedReputationScores =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'detailedReputationScores',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"escrows"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowEscrows = /*#__PURE__*/ createUseReadContract(
  {
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'escrows',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"getDetailedReputation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowGetDetailedReputation =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'getDetailedReputation',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"getReputationTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowGetReputationTier =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'getReputationTier',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"getTopSellers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowGetTopSellers =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'getTopSellers',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"getUserReviews"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowGetUserReviews =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'getUserReviews',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"governance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowGovernance =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'governance',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"ldaoToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowLdaoToken =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'ldaoToken',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"nextEscrowId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowNextEscrowId =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'nextEscrowId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"nextReviewId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowNextReviewId =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'nextReviewId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowOwner = /*#__PURE__*/ createUseReadContract({
  abi: enhancedEscrowAbi,
  address: enhancedEscrowAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"platformFeePercentage"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowPlatformFeePercentage =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'platformFeePercentage',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"reviews"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowReviews = /*#__PURE__*/ createUseReadContract(
  {
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'reviews',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"userEscrows"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowUserEscrows =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'userEscrows',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"userReviews"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useReadEnhancedEscrowUserReviews =
  /*#__PURE__*/ createUseReadContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'userReviews',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrow = /*#__PURE__*/ createUseWriteContract({
  abi: enhancedEscrowAbi,
  address: enhancedEscrowAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"authorizeArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowAuthorizeArbitrator =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'authorizeArbitrator',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"castHelpfulVote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowCastHelpfulVote =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'castHelpfulVote',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"castVote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowCastVote =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'castVote',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"confirmDelivery"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowConfirmDelivery =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'confirmDelivery',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"createEscrow"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowCreateEscrow =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'createEscrow',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"executeEmergencyRefund"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowExecuteEmergencyRefund =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'executeEmergencyRefund',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"lockFunds"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowLockFunds =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'lockFunds',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"openDispute"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowOpenDispute =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'openDispute',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"resolveDisputeByArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowResolveDisputeByArbitrator =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'resolveDisputeByArbitrator',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"setArbitratorFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowSetArbitratorFee =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'setArbitratorFee',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"setGovernance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowSetGovernance =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'setGovernance',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"setLDAOToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowSetLdaoToken =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'setLDAOToken',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"setPlatformFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowSetPlatformFee =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'setPlatformFee',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"submitMarketplaceReview"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowSubmitMarketplaceReview =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'submitMarketplaceReview',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"suspendUser"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowSuspendUser =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'suspendUser',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWriteEnhancedEscrowTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrow =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"authorizeArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowAuthorizeArbitrator =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'authorizeArbitrator',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"castHelpfulVote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowCastHelpfulVote =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'castHelpfulVote',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"castVote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowCastVote =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'castVote',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"confirmDelivery"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowConfirmDelivery =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'confirmDelivery',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"createEscrow"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowCreateEscrow =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'createEscrow',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"executeEmergencyRefund"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowExecuteEmergencyRefund =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'executeEmergencyRefund',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"lockFunds"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowLockFunds =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'lockFunds',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"openDispute"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowOpenDispute =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'openDispute',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"resolveDisputeByArbitrator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowResolveDisputeByArbitrator =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'resolveDisputeByArbitrator',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"setArbitratorFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowSetArbitratorFee =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'setArbitratorFee',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"setGovernance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowSetGovernance =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'setGovernance',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"setLDAOToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowSetLdaoToken =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'setLDAOToken',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"setPlatformFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowSetPlatformFee =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'setPlatformFee',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"submitMarketplaceReview"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowSubmitMarketplaceReview =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'submitMarketplaceReview',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"suspendUser"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowSuspendUser =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'suspendUser',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useSimulateEnhancedEscrowTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"ArbitratorAppointed"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowArbitratorAppointedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'ArbitratorAppointed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"DeliveryConfirmed"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowDeliveryConfirmedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'DeliveryConfirmed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"DisputeOpened"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowDisputeOpenedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'DisputeOpened',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"EmergencyRefund"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowEmergencyRefundEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'EmergencyRefund',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"EscrowCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowEscrowCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'EscrowCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"EscrowResolved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowEscrowResolvedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'EscrowResolved',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"FundsLocked"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowFundsLockedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'FundsLocked',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"ReputationUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowReputationUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'ReputationUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"ReviewSubmitted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowReviewSubmittedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'ReviewSubmitted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"UserSuspended"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowUserSuspendedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'UserSuspended',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link enhancedEscrowAbi}__ and `eventName` set to `"VoteCast"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1)
 */
export const useWatchEnhancedEscrowVoteCastEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: enhancedEscrowAbi,
    address: enhancedEscrowAddress,
    eventName: 'VoteCast',
  })

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
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModule = /*#__PURE__*/ createUseReadContract({
  abi: followModuleAbi,
  address: followModuleAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"isFollowing"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModuleIsFollowing =
  /*#__PURE__*/ createUseReadContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'isFollowing',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"follows"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModuleFollows = /*#__PURE__*/ createUseReadContract({
  abi: followModuleAbi,
  address: followModuleAddress,
  functionName: 'follows',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"followerCount"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModuleFollowerCount =
  /*#__PURE__*/ createUseReadContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'followerCount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"followingCount"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModuleFollowingCount =
  /*#__PURE__*/ createUseReadContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'followingCount',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link followModuleAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWriteFollowModule = /*#__PURE__*/ createUseWriteContract({
  abi: followModuleAbi,
  address: followModuleAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"follow"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWriteFollowModuleFollow = /*#__PURE__*/ createUseWriteContract({
  abi: followModuleAbi,
  address: followModuleAddress,
  functionName: 'follow',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"unfollow"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWriteFollowModuleUnfollow =
  /*#__PURE__*/ createUseWriteContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'unfollow',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link followModuleAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useSimulateFollowModule = /*#__PURE__*/ createUseSimulateContract({
  abi: followModuleAbi,
  address: followModuleAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"follow"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useSimulateFollowModuleFollow =
  /*#__PURE__*/ createUseSimulateContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'follow',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"unfollow"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useSimulateFollowModuleUnfollow =
  /*#__PURE__*/ createUseSimulateContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'unfollow',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link followModuleAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWatchFollowModuleEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: followModuleAbi,
    address: followModuleAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link followModuleAbi}__ and `eventName` set to `"Followed"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWatchFollowModuleFollowedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: followModuleAbi,
    address: followModuleAddress,
    eventName: 'Followed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link followModuleAbi}__ and `eventName` set to `"Unfollowed"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWatchFollowModuleUnfollowedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: followModuleAbi,
    address: followModuleAddress,
    eventName: 'Unfollowed',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernance = /*#__PURE__*/ createUseReadContract({
  abi: governanceAbi,
  address: governanceAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"proposalCount"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceProposalCount =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'proposalCount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"votingDelay"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceVotingDelay = /*#__PURE__*/ createUseReadContract(
  {
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'votingDelay',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"votingPeriod"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceVotingPeriod =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'votingPeriod',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"quorumVotes"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceQuorumVotes = /*#__PURE__*/ createUseReadContract(
  {
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'quorumVotes',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"proposalThreshold"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceProposalThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'proposalThreshold',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"proposals"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceProposals = /*#__PURE__*/ createUseReadContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'proposals',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"state"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceState = /*#__PURE__*/ createUseReadContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'state',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"votingPower"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceVotingPower = /*#__PURE__*/ createUseReadContract(
  {
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'votingPower',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"proposalVotes"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceProposalVotes =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'proposalVotes',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"governanceToken"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useReadGovernanceGovernanceToken =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'governanceToken',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWriteGovernance = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"propose"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWriteGovernancePropose = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'propose',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"castVote"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWriteGovernanceCastVote = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'castVote',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"execute"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWriteGovernanceExecute = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'execute',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"cancel"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWriteGovernanceCancel = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'cancel',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setVotingDelay"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWriteGovernanceSetVotingDelay =
  /*#__PURE__*/ createUseWriteContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setVotingDelay',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setVotingPeriod"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWriteGovernanceSetVotingPeriod =
  /*#__PURE__*/ createUseWriteContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setVotingPeriod',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setQuorumVotes"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWriteGovernanceSetQuorumVotes =
  /*#__PURE__*/ createUseWriteContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setQuorumVotes',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setProposalThreshold"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWriteGovernanceSetProposalThreshold =
  /*#__PURE__*/ createUseWriteContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setProposalThreshold',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useSimulateGovernance = /*#__PURE__*/ createUseSimulateContract({
  abi: governanceAbi,
  address: governanceAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"propose"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useSimulateGovernancePropose =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'propose',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"castVote"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useSimulateGovernanceCastVote =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'castVote',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"execute"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useSimulateGovernanceExecute =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'execute',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"cancel"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useSimulateGovernanceCancel =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'cancel',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setVotingDelay"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useSimulateGovernanceSetVotingDelay =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setVotingDelay',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setVotingPeriod"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useSimulateGovernanceSetVotingPeriod =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setVotingPeriod',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setQuorumVotes"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useSimulateGovernanceSetQuorumVotes =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setQuorumVotes',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setProposalThreshold"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useSimulateGovernanceSetProposalThreshold =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setProposalThreshold',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWatchGovernanceEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__ and `eventName` set to `"ProposalCanceled"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWatchGovernanceProposalCanceledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
    eventName: 'ProposalCanceled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__ and `eventName` set to `"ProposalCreated"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWatchGovernanceProposalCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
    eventName: 'ProposalCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__ and `eventName` set to `"ProposalExecuted"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWatchGovernanceProposalExecutedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
    eventName: 'ProposalExecuted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__ and `eventName` set to `"VoteCast"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x4567890123456789012345678901234567890123)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x27a78A860445DFFD9073aFd7065dd421487c0F8A)
 */
export const useWatchGovernanceVoteCastEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
    eventName: 'VoteCast',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoToken = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"ACTIVITY_REWARD_COOLDOWN"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenActivityRewardCooldown =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'ACTIVITY_REWARD_COOLDOWN',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"DOMAIN_SEPARATOR"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenDomainSeparator =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'DOMAIN_SEPARATOR',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"INITIAL_SUPPLY"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenInitialSupply =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'INITIAL_SUPPLY',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"MAX_DISCOUNT_TIER"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenMaxDiscountTier =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'MAX_DISCOUNT_TIER',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"PREMIUM_MEMBERSHIP_THRESHOLD"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenPremiumMembershipThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'PREMIUM_MEMBERSHIP_THRESHOLD',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"allowance"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenAllowance = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'allowance',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"balanceOf"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenBalanceOf = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'balanceOf',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"decimals"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenDecimals = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'decimals',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"discountTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenDiscountTier = /*#__PURE__*/ createUseReadContract(
  {
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'discountTier',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"eip712Domain"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenEip712Domain = /*#__PURE__*/ createUseReadContract(
  {
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'eip712Domain',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"getDiscountPercentage"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenGetDiscountPercentage =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'getDiscountPercentage',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"getDiscountTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenGetDiscountTier =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'getDiscountTier',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"getTotalStakeRewards"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenGetTotalStakeRewards =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'getTotalStakeRewards',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"getUserStakes"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenGetUserStakes =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'getUserStakes',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"hasPremiumMembership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenHasPremiumMembership =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'hasPremiumMembership',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"lastActivityReward"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenLastActivityReward =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'lastActivityReward',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"name"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenName = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"nextTierId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenNextTierId = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'nextTierId',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"nonces"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenNonces = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'nonces',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenOwner = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"premiumMembers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenPremiumMembers =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'premiumMembers',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"rewardPool"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenRewardPool = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'rewardPool',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"stakingTiers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenStakingTiers = /*#__PURE__*/ createUseReadContract(
  {
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'stakingTiers',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"symbol"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenSymbol = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"totalStaked"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenTotalStaked = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'totalStaked',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"totalStakedSupply"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenTotalStakedSupply =
  /*#__PURE__*/ createUseReadContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'totalStakedSupply',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"totalSupply"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenTotalSupply = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'totalSupply',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"userStakes"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenUserStakes = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'userStakes',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"votingPower"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useReadLdaoTokenVotingPower = /*#__PURE__*/ createUseReadContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'votingPower',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoToken = /*#__PURE__*/ createUseWriteContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"addToRewardPool"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenAddToRewardPool =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'addToRewardPool',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"approve"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenApprove = /*#__PURE__*/ createUseWriteContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'approve',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"claimActivityReward"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenClaimActivityReward =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'claimActivityReward',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"claimAllStakeRewards"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenClaimAllStakeRewards =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'claimAllStakeRewards',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"claimStakeRewards"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenClaimStakeRewards =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'claimStakeRewards',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"createStakingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenCreateStakingTier =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'createStakingTier',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"permit"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenPermit = /*#__PURE__*/ createUseWriteContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'permit',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"stake"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenStake = /*#__PURE__*/ createUseWriteContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'stake',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"transfer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenTransfer = /*#__PURE__*/ createUseWriteContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'transfer',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"transferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"unstake"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenUnstake = /*#__PURE__*/ createUseWriteContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
  functionName: 'unstake',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"updateStakingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWriteLdaoTokenUpdateStakingTier =
  /*#__PURE__*/ createUseWriteContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'updateStakingTier',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoToken = /*#__PURE__*/ createUseSimulateContract({
  abi: ldaoTokenAbi,
  address: ldaoTokenAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"addToRewardPool"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenAddToRewardPool =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'addToRewardPool',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"approve"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"claimActivityReward"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenClaimActivityReward =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'claimActivityReward',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"claimAllStakeRewards"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenClaimAllStakeRewards =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'claimAllStakeRewards',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"claimStakeRewards"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenClaimStakeRewards =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'claimStakeRewards',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"createStakingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenCreateStakingTier =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'createStakingTier',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"permit"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenPermit =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'permit',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"stake"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenStake =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'stake',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"transfer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenTransfer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'transfer',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"transferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"unstake"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenUnstake =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'unstake',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link ldaoTokenAbi}__ and `functionName` set to `"updateStakingTier"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useSimulateLdaoTokenUpdateStakingTier =
  /*#__PURE__*/ createUseSimulateContract({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    functionName: 'updateStakingTier',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenEvent = /*#__PURE__*/ createUseWatchContractEvent(
  { abi: ldaoTokenAbi, address: ldaoTokenAddress },
)

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"ActivityRewardClaimed"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenActivityRewardClaimedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'ActivityRewardClaimed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"Approval"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"EIP712DomainChanged"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenEip712DomainChangedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'EIP712DomainChanged',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"PremiumMembershipGranted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenPremiumMembershipGrantedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'PremiumMembershipGranted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"PremiumMembershipRevoked"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenPremiumMembershipRevokedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'PremiumMembershipRevoked',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"RewardsClaimed"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenRewardsClaimedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'RewardsClaimed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"Staked"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenStakedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'Staked',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"StakingTierCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenStakingTierCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'StakingTierCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"Transfer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"Unstaked"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenUnstakedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'Unstaked',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link ldaoTokenAbi}__ and `eventName` set to `"VotingPowerUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xc9F690B45e33ca909bB9ab97836091673232611B)
 */
export const useWatchLdaoTokenVotingPowerUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: ldaoTokenAbi,
    address: ldaoTokenAddress,
    eventName: 'VotingPowerUpdated',
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
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplace = /*#__PURE__*/ createUseReadContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"AUCTION_EXTENSION_TIME"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceAuctionExtensionTime =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'AUCTION_EXTENSION_TIME',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"MAX_PLATFORM_FEE"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceMaxPlatformFee =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'MAX_PLATFORM_FEE',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"daoApprovedVendors"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceDaoApprovedVendors =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'daoApprovedVendors',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"disputes"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceDisputes = /*#__PURE__*/ createUseReadContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
  functionName: 'disputes',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"escrowContract"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceEscrowContract =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'escrowContract',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"getActiveListings"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceGetActiveListings =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'getActiveListings',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"getBids"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceGetBids = /*#__PURE__*/ createUseReadContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
  functionName: 'getBids',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"getDispute"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceGetDispute = /*#__PURE__*/ createUseReadContract(
  {
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'getDispute',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"getOffers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceGetOffers = /*#__PURE__*/ createUseReadContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
  functionName: 'getOffers',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"getOrder"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceGetOrder = /*#__PURE__*/ createUseReadContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
  functionName: 'getOrder',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"ldaoToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceLdaoToken = /*#__PURE__*/ createUseReadContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
  functionName: 'ldaoToken',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"listingBids"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceListingBids =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'listingBids',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"listingOffers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceListingOffers =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'listingOffers',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"listings"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceListings = /*#__PURE__*/ createUseReadContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
  functionName: 'listings',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"minReputationScore"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceMinReputationScore =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'minReputationScore',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"nextDisputeId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceNextDisputeId =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'nextDisputeId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"nextListingId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceNextListingId =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'nextListingId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"nextOfferId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceNextOfferId =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'nextOfferId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"nextOrderId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceNextOrderId =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'nextOrderId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"orders"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceOrders = /*#__PURE__*/ createUseReadContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
  functionName: 'orders',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceOwner = /*#__PURE__*/ createUseReadContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"platformFeePercentage"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplacePlatformFeePercentage =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'platformFeePercentage',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"reputationScores"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceReputationScores =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'reputationScores',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"userListings"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceUserListings =
  /*#__PURE__*/ createUseReadContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'userListings',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"userOrders"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useReadMarketplaceUserOrders = /*#__PURE__*/ createUseReadContract(
  {
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'userOrders',
  },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplace = /*#__PURE__*/ createUseWriteContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"acceptHighestBid"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceAcceptHighestBid =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'acceptHighestBid',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"acceptOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceAcceptOffer =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'acceptOffer',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"cancelListing"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceCancelListing =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'cancelListing',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"createListing"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceCreateListing =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'createListing',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"makeOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceMakeOffer =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'makeOffer',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"placeBid"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplacePlaceBid = /*#__PURE__*/ createUseWriteContract(
  {
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'placeBid',
  },
)

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"purchaseListing"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplacePurchaseListing =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'purchaseListing',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setAuctionExtensionTime"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceSetAuctionExtensionTime =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setAuctionExtensionTime',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setDAOApprovedVendor"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceSetDaoApprovedVendor =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setDAOApprovedVendor',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setEscrowContract"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceSetEscrowContract =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setEscrowContract',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setMinReputationScore"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceSetMinReputationScore =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setMinReputationScore',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setPlatformFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceSetPlatformFee =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setPlatformFee',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"updateListingPrice"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceUpdateListingPrice =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'updateListingPrice',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"updateReputationScore"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWriteMarketplaceUpdateReputationScore =
  /*#__PURE__*/ createUseWriteContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'updateReputationScore',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplace = /*#__PURE__*/ createUseSimulateContract({
  abi: marketplaceAbi,
  address: marketplaceAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"acceptHighestBid"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceAcceptHighestBid =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'acceptHighestBid',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"acceptOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceAcceptOffer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'acceptOffer',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"cancelListing"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceCancelListing =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'cancelListing',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"createListing"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceCreateListing =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'createListing',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"makeOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceMakeOffer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'makeOffer',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"placeBid"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplacePlaceBid =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'placeBid',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"purchaseListing"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplacePurchaseListing =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'purchaseListing',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setAuctionExtensionTime"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceSetAuctionExtensionTime =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setAuctionExtensionTime',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setDAOApprovedVendor"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceSetDaoApprovedVendor =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setDAOApprovedVendor',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setEscrowContract"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceSetEscrowContract =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setEscrowContract',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setMinReputationScore"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceSetMinReputationScore =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setMinReputationScore',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"setPlatformFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceSetPlatformFee =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'setPlatformFee',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"updateListingPrice"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceUpdateListingPrice =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'updateListingPrice',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link marketplaceAbi}__ and `functionName` set to `"updateReputationScore"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useSimulateMarketplaceUpdateReputationScore =
  /*#__PURE__*/ createUseSimulateContract({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    functionName: 'updateReputationScore',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"AuctionEnded"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceAuctionEndedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'AuctionEnded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"BidPlaced"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceBidPlacedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'BidPlaced',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"DisputeCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceDisputeCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'DisputeCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"DisputeResolved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceDisputeResolvedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'DisputeResolved',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"ListingCancelled"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceListingCancelledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'ListingCancelled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"ListingCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceListingCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'ListingCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"ListingUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceListingUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'ListingUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"OfferAccepted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceOfferAcceptedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'OfferAccepted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"OfferMade"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceOfferMadeEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'OfferMade',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"OrderCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceOrderCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'OrderCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"OrderCreatedWithDiscount"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceOrderCreatedWithDiscountEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'OrderCreatedWithDiscount',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"OrderStatusUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceOrderStatusUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'OrderStatusUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link marketplaceAbi}__ and `eventName` set to `"ReputationUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A)
 */
export const useWatchMarketplaceReputationUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: marketplaceAbi,
    address: marketplaceAddress,
    eventName: 'ReputationUpdated',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplace = /*#__PURE__*/ createUseReadContract({
  abi: nftMarketplaceAbi,
  address: nftMarketplaceAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"auctions"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceAuctions =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'auctions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"balanceOf"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"creatorNFTs"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceCreatorNfTs =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'creatorNFTs',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"creatorRoyalties"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceCreatorRoyalties =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'creatorRoyalties',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"getActiveOffers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceGetActiveOffers =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'getActiveOffers',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"getApproved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceGetApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'getApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"getCreatorNFTs"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceGetCreatorNfTs =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'getCreatorNFTs',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"getNFTMetadata"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceGetNftMetadata =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'getNFTMetadata',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"listings"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceListings =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'listings',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"maxRoyalty"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceMaxRoyalty =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'maxRoyalty',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"name"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceName = /*#__PURE__*/ createUseReadContract({
  abi: nftMarketplaceAbi,
  address: nftMarketplaceAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"nftMetadata"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceNftMetadata =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'nftMetadata',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"offers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceOffers = /*#__PURE__*/ createUseReadContract({
  abi: nftMarketplaceAbi,
  address: nftMarketplaceAddress,
  functionName: 'offers',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceOwner = /*#__PURE__*/ createUseReadContract({
  abi: nftMarketplaceAbi,
  address: nftMarketplaceAddress,
  functionName: 'owner',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"ownerOf"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceOwnerOf = /*#__PURE__*/ createUseReadContract(
  {
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'ownerOf',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"platformFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplacePlatformFee =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'platformFee',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"platformFeeRecipient"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplacePlatformFeeRecipient =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'platformFeeRecipient',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"royaltyInfo"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceRoyaltyInfo =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'royaltyInfo',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceSupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"symbol"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceSymbol = /*#__PURE__*/ createUseReadContract({
  abi: nftMarketplaceAbi,
  address: nftMarketplaceAddress,
  functionName: 'symbol',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"tokenURI"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceTokenUri =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'tokenURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"usdcToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceUsdcToken =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'usdcToken',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"usdtToken"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceUsdtToken =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'usdtToken',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"usedHashes"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useReadNftMarketplaceUsedHashes =
  /*#__PURE__*/ createUseReadContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'usedHashes',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplace = /*#__PURE__*/ createUseWriteContract({
  abi: nftMarketplaceAbi,
  address: nftMarketplaceAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"acceptOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceAcceptOffer =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'acceptOffer',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"approve"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceApprove =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"buyNFT"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceBuyNft =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'buyNFT',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"cancelListing"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceCancelListing =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'cancelListing',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"cancelOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceCancelOffer =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'cancelOffer',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"createAuction"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceCreateAuction =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'createAuction',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"endAuction"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceEndAuction =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'endAuction',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"listNFT"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceListNft =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'listNFT',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"makeOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceMakeOffer =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'makeOffer',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"mintNFT"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceMintNft =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'mintNFT',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"placeBid"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplacePlaceBid =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'placeBid',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceSafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceSetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"setPaymentTokens"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceSetPaymentTokens =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'setPaymentTokens',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"setPlatformFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceSetPlatformFee =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'setPlatformFee',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"setPlatformFeeRecipient"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceSetPlatformFeeRecipient =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'setPlatformFeeRecipient',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"transferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"verifyNFT"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceVerifyNft =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'verifyNFT',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"withdrawExpiredOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWriteNftMarketplaceWithdrawExpiredOffer =
  /*#__PURE__*/ createUseWriteContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'withdrawExpiredOffer',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplace =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"acceptOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceAcceptOffer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'acceptOffer',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"approve"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"buyNFT"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceBuyNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'buyNFT',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"cancelListing"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceCancelListing =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'cancelListing',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"cancelOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceCancelOffer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'cancelOffer',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"createAuction"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceCreateAuction =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'createAuction',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"endAuction"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceEndAuction =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'endAuction',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"listNFT"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceListNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'listNFT',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"makeOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceMakeOffer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'makeOffer',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"mintNFT"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceMintNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'mintNFT',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"placeBid"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplacePlaceBid =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'placeBid',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceSafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceSetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"setPaymentTokens"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceSetPaymentTokens =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'setPaymentTokens',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"setPlatformFee"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceSetPlatformFee =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'setPlatformFee',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"setPlatformFeeRecipient"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceSetPlatformFeeRecipient =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'setPlatformFeeRecipient',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"transferFrom"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"verifyNFT"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceVerifyNft =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'verifyNFT',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `functionName` set to `"withdrawExpiredOffer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useSimulateNftMarketplaceWithdrawExpiredOffer =
  /*#__PURE__*/ createUseSimulateContract({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    functionName: 'withdrawExpiredOffer',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"Approval"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceApprovalEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'Approval',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"ApprovalForAll"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceApprovalForAllEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'ApprovalForAll',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"AuctionCreated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceAuctionCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'AuctionCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"AuctionEnded"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceAuctionEndedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'AuctionEnded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"BatchMetadataUpdate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceBatchMetadataUpdateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'BatchMetadataUpdate',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"BidPlaced"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceBidPlacedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'BidPlaced',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"MetadataUpdate"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceMetadataUpdateEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'MetadataUpdate',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"NFTListed"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceNftListedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'NFTListed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"NFTMinted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceNftMintedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'NFTMinted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"NFTSold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceNftSoldEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'NFTSold',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"OfferAccepted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceOfferAcceptedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'OfferAccepted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"OfferMade"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceOfferMadeEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'OfferMade',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"PaymentTokensSet"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplacePaymentTokensSetEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'PaymentTokensSet',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"RoyaltyPaid"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceRoyaltyPaidEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'RoyaltyPaid',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link nftMarketplaceAbi}__ and `eventName` set to `"Transfer"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x012d3646Cd0D587183112fdD38f473FaA50D2A09)
 */
export const useWatchNftMarketplaceTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: nftMarketplaceAbi,
    address: nftMarketplaceAddress,
    eventName: 'Transfer',
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
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistry = /*#__PURE__*/ createUseReadContract({
  abi: profileRegistryAbi,
  address: profileRegistryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"balanceOf"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"getApproved"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryGetApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'getApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"getProfileByAddress"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryGetProfileByAddress =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'getProfileByAddress',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"getProfileByHandle"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryGetProfileByHandle =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'getProfileByHandle',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"name"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryName = /*#__PURE__*/ createUseReadContract({
  abi: profileRegistryAbi,
  address: profileRegistryAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"ownerOf"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryOwnerOf =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'ownerOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistrySupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"symbol"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistrySymbol = /*#__PURE__*/ createUseReadContract(
  {
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'symbol',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"tokenURI"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryTokenUri =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'tokenURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"addressToTokenId"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryAddressToTokenId =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'addressToTokenId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"handleToTokenId"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryHandleToTokenId =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'handleToTokenId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"profiles"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryProfiles =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'profiles',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistry = /*#__PURE__*/ createUseWriteContract({
  abi: profileRegistryAbi,
  address: profileRegistryAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryApprove =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"createProfile"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryCreateProfile =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'createProfile',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistrySafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistrySetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateProfile"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryUpdateProfile =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateProfile',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateEns"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryUpdateEns =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateEns',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistry =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"createProfile"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryCreateProfile =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'createProfile',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistrySafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistrySetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateProfile"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryUpdateProfile =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateProfile',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateEns"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryUpdateEns =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateEns',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWatchProfileRegistryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__ and `eventName` set to `"ProfileCreated"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWatchProfileRegistryProfileCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    eventName: 'ProfileCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__ and `eventName` set to `"Transfer"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWatchProfileRegistryTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__ and `eventName` set to `"ProfileUpdated"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWatchProfileRegistryProfileUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    eventName: 'ProfileUpdated',
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

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystem = /*#__PURE__*/ createUseReadContract({
  abi: reputationSystemAbi,
  address: reputationSystemAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"calculateWeightedScore"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemCalculateWeightedScore =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'calculateWeightedScore',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"getReputationScore"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemGetReputationScore =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'getReputationScore',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"getReview"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemGetReview =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'getReview',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"getTopSellers"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemGetTopSellers =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'getTopSellers',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"getUserReviews"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemGetUserReviews =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'getUserReviews',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"hasReviewed"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemHasReviewed =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'hasReviewed',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"helpfulVoteWeight"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemHelpfulVoteWeight =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'helpfulVoteWeight',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"maxReviewsPerDay"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemMaxReviewsPerDay =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'maxReviewsPerDay',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"minReviewInterval"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemMinReviewInterval =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'minReviewInterval',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"moderatorMinReputation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemModeratorMinReputation =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'moderatorMinReputation',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"moderatorReputationThreshold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemModeratorReputationThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'moderatorReputationThreshold',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"nextReviewId"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemNextReviewId =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'nextReviewId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"owner"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemOwner = /*#__PURE__*/ createUseReadContract(
  {
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'owner',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"reputationScores"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemReputationScores =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'reputationScores',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"responseTime"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemResponseTime =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'responseTime',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"reviewHasVoted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemReviewHasVoted =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'reviewHasVoted',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"reviewVerificationReward"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemReviewVerificationReward =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'reviewVerificationReward',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"reviews"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemReviews =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'reviews',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"successfulTransactions"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemSuccessfulTransactions =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'successfulTransactions',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"suspiciousActivityThreshold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemSuspiciousActivityThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'suspiciousActivityThreshold',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"totalRevenue"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemTotalRevenue =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'totalRevenue',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"totalReviews"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemTotalReviews =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'totalReviews',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"totalSales"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemTotalSales =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'totalSales',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"userReviews"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemUserReviews =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'userReviews',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"verifiedModerators"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useReadReputationSystemVerifiedModerators =
  /*#__PURE__*/ createUseReadContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'verifiedModerators',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystem = /*#__PURE__*/ createUseWriteContract({
  abi: reputationSystemAbi,
  address: reputationSystemAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"addModerator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemAddModerator =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'addModerator',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"castHelpfulVote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemCastHelpfulVote =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'castHelpfulVote',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"recordSuccessfulTransaction"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemRecordSuccessfulTransaction =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'recordSuccessfulTransaction',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"removeModerator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemRemoveModerator =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'removeModerator',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemRenounceOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"setMaxReviewsPerDay"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemSetMaxReviewsPerDay =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'setMaxReviewsPerDay',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"setMinReviewInterval"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemSetMinReviewInterval =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'setMinReviewInterval',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"setModeratorMinReputation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemSetModeratorMinReputation =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'setModeratorMinReputation',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"setSuspiciousActivityThreshold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemSetSuspiciousActivityThreshold =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'setSuspiciousActivityThreshold',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"submitReview"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemSubmitReview =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'submitReview',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"suspendUser"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemSuspendUser =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'suspendUser',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemTransferOwnership =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"verifyReview"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWriteReputationSystemVerifyReview =
  /*#__PURE__*/ createUseWriteContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'verifyReview',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystem =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"addModerator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemAddModerator =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'addModerator',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"castHelpfulVote"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemCastHelpfulVote =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'castHelpfulVote',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"recordSuccessfulTransaction"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemRecordSuccessfulTransaction =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'recordSuccessfulTransaction',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"removeModerator"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemRemoveModerator =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'removeModerator',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"renounceOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemRenounceOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'renounceOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"setMaxReviewsPerDay"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemSetMaxReviewsPerDay =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'setMaxReviewsPerDay',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"setMinReviewInterval"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemSetMinReviewInterval =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'setMinReviewInterval',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"setModeratorMinReputation"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemSetModeratorMinReputation =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'setModeratorMinReputation',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"setSuspiciousActivityThreshold"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemSetSuspiciousActivityThreshold =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'setSuspiciousActivityThreshold',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"submitReview"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemSubmitReview =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'submitReview',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"suspendUser"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemSuspendUser =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'suspendUser',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"transferOwnership"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemTransferOwnership =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'transferOwnership',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link reputationSystemAbi}__ and `functionName` set to `"verifyReview"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useSimulateReputationSystemVerifyReview =
  /*#__PURE__*/ createUseSimulateContract({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    functionName: 'verifyReview',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__ and `eventName` set to `"HelpfulVoteCast"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemHelpfulVoteCastEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    eventName: 'HelpfulVoteCast',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__ and `eventName` set to `"ModeratorAdded"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemModeratorAddedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    eventName: 'ModeratorAdded',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__ and `eventName` set to `"ModeratorRemoved"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemModeratorRemovedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    eventName: 'ModeratorRemoved',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__ and `eventName` set to `"OwnershipTransferred"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemOwnershipTransferredEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    eventName: 'OwnershipTransferred',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__ and `eventName` set to `"ReputationUpdated"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemReputationUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    eventName: 'ReputationUpdated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__ and `eventName` set to `"ReviewSubmitted"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemReviewSubmittedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    eventName: 'ReviewSubmitted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__ and `eventName` set to `"ReviewVerified"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemReviewVerifiedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    eventName: 'ReviewVerified',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__ and `eventName` set to `"SuspiciousActivityDetected"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemSuspiciousActivityDetectedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    eventName: 'SuspiciousActivityDetected',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link reputationSystemAbi}__ and `eventName` set to `"UserSuspended"`
 *
 * [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2)
 */
export const useWatchReputationSystemUserSuspendedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: reputationSystemAbi,
    address: reputationSystemAddress,
    eventName: 'UserSuspended',
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
