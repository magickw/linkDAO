import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

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
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
