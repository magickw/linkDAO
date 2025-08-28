import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FollowModule
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

export const followModuleAddress =
  '0x2345678901234567890123456789012345678901' as const

export const followModuleConfig = {
  address: followModuleAddress,
  abi: followModuleAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Governance
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

export const governanceAddress =
  '0x4567890123456789012345678901234567890123' as const

export const governanceConfig = {
  address: governanceAddress,
  abi: governanceAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PaymentRouter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

export const paymentRouterAddress =
  '0x3456789012345678901234567890123456789012' as const

export const paymentRouterConfig = {
  address: paymentRouterAddress,
  abi: paymentRouterAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ProfileRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

export const profileRegistryAddress =
  '0x1234567890123456789012345678901234567890' as const

export const profileRegistryConfig = {
  address: profileRegistryAddress,
  abi: profileRegistryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__
 */
export const useReadFollowModule = /*#__PURE__*/ createUseReadContract({
  abi: followModuleAbi,
  address: followModuleAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"isFollowing"`
 */
export const useReadFollowModuleIsFollowing =
  /*#__PURE__*/ createUseReadContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'isFollowing',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"follows"`
 */
export const useReadFollowModuleFollows = /*#__PURE__*/ createUseReadContract({
  abi: followModuleAbi,
  address: followModuleAddress,
  functionName: 'follows',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"followerCount"`
 */
export const useReadFollowModuleFollowerCount =
  /*#__PURE__*/ createUseReadContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'followerCount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"followingCount"`
 */
export const useReadFollowModuleFollowingCount =
  /*#__PURE__*/ createUseReadContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'followingCount',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link followModuleAbi}__
 */
export const useWriteFollowModule = /*#__PURE__*/ createUseWriteContract({
  abi: followModuleAbi,
  address: followModuleAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"follow"`
 */
export const useWriteFollowModuleFollow = /*#__PURE__*/ createUseWriteContract({
  abi: followModuleAbi,
  address: followModuleAddress,
  functionName: 'follow',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"unfollow"`
 */
export const useWriteFollowModuleUnfollow =
  /*#__PURE__*/ createUseWriteContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'unfollow',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link followModuleAbi}__
 */
export const useSimulateFollowModule = /*#__PURE__*/ createUseSimulateContract({
  abi: followModuleAbi,
  address: followModuleAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"follow"`
 */
export const useSimulateFollowModuleFollow =
  /*#__PURE__*/ createUseSimulateContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'follow',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"unfollow"`
 */
export const useSimulateFollowModuleUnfollow =
  /*#__PURE__*/ createUseSimulateContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'unfollow',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link followModuleAbi}__
 */
export const useWatchFollowModuleEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: followModuleAbi,
    address: followModuleAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link followModuleAbi}__ and `eventName` set to `"Followed"`
 */
export const useWatchFollowModuleFollowedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: followModuleAbi,
    address: followModuleAddress,
    eventName: 'Followed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link followModuleAbi}__ and `eventName` set to `"Unfollowed"`
 */
export const useWatchFollowModuleUnfollowedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: followModuleAbi,
    address: followModuleAddress,
    eventName: 'Unfollowed',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__
 */
export const useReadGovernance = /*#__PURE__*/ createUseReadContract({
  abi: governanceAbi,
  address: governanceAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"proposalCount"`
 */
export const useReadGovernanceProposalCount =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'proposalCount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"votingDelay"`
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
 */
export const useReadGovernanceVotingPeriod =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'votingPeriod',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"quorumVotes"`
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
 */
export const useReadGovernanceProposalThreshold =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'proposalThreshold',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"proposals"`
 */
export const useReadGovernanceProposals = /*#__PURE__*/ createUseReadContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'proposals',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"state"`
 */
export const useReadGovernanceState = /*#__PURE__*/ createUseReadContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'state',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"votingPower"`
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
 */
export const useReadGovernanceProposalVotes =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'proposalVotes',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"governanceToken"`
 */
export const useReadGovernanceGovernanceToken =
  /*#__PURE__*/ createUseReadContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'governanceToken',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__
 */
export const useWriteGovernance = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"propose"`
 */
export const useWriteGovernancePropose = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'propose',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"castVote"`
 */
export const useWriteGovernanceCastVote = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'castVote',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"execute"`
 */
export const useWriteGovernanceExecute = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'execute',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"cancel"`
 */
export const useWriteGovernanceCancel = /*#__PURE__*/ createUseWriteContract({
  abi: governanceAbi,
  address: governanceAddress,
  functionName: 'cancel',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setVotingDelay"`
 */
export const useWriteGovernanceSetVotingDelay =
  /*#__PURE__*/ createUseWriteContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setVotingDelay',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setVotingPeriod"`
 */
export const useWriteGovernanceSetVotingPeriod =
  /*#__PURE__*/ createUseWriteContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setVotingPeriod',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setQuorumVotes"`
 */
export const useWriteGovernanceSetQuorumVotes =
  /*#__PURE__*/ createUseWriteContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setQuorumVotes',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setProposalThreshold"`
 */
export const useWriteGovernanceSetProposalThreshold =
  /*#__PURE__*/ createUseWriteContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setProposalThreshold',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__
 */
export const useSimulateGovernance = /*#__PURE__*/ createUseSimulateContract({
  abi: governanceAbi,
  address: governanceAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"propose"`
 */
export const useSimulateGovernancePropose =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'propose',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"castVote"`
 */
export const useSimulateGovernanceCastVote =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'castVote',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"execute"`
 */
export const useSimulateGovernanceExecute =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'execute',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"cancel"`
 */
export const useSimulateGovernanceCancel =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'cancel',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setVotingDelay"`
 */
export const useSimulateGovernanceSetVotingDelay =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setVotingDelay',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setVotingPeriod"`
 */
export const useSimulateGovernanceSetVotingPeriod =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setVotingPeriod',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setQuorumVotes"`
 */
export const useSimulateGovernanceSetQuorumVotes =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setQuorumVotes',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link governanceAbi}__ and `functionName` set to `"setProposalThreshold"`
 */
export const useSimulateGovernanceSetProposalThreshold =
  /*#__PURE__*/ createUseSimulateContract({
    abi: governanceAbi,
    address: governanceAddress,
    functionName: 'setProposalThreshold',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__
 */
export const useWatchGovernanceEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__ and `eventName` set to `"ProposalCanceled"`
 */
export const useWatchGovernanceProposalCanceledEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
    eventName: 'ProposalCanceled',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__ and `eventName` set to `"ProposalCreated"`
 */
export const useWatchGovernanceProposalCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
    eventName: 'ProposalCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__ and `eventName` set to `"ProposalExecuted"`
 */
export const useWatchGovernanceProposalExecutedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
    eventName: 'ProposalExecuted',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link governanceAbi}__ and `eventName` set to `"VoteCast"`
 */
export const useWatchGovernanceVoteCastEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: governanceAbi,
    address: governanceAddress,
    eventName: 'VoteCast',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link paymentRouterAbi}__
 */
export const useReadPaymentRouter = /*#__PURE__*/ createUseReadContract({
  abi: paymentRouterAbi,
  address: paymentRouterAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"supportedTokens"`
 */
export const useReadPaymentRouterSupportedTokens =
  /*#__PURE__*/ createUseReadContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'supportedTokens',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"feeBasisPoints"`
 */
export const useReadPaymentRouterFeeBasisPoints =
  /*#__PURE__*/ createUseReadContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'feeBasisPoints',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"feeCollector"`
 */
export const useReadPaymentRouterFeeCollector =
  /*#__PURE__*/ createUseReadContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'feeCollector',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__
 */
export const useWritePaymentRouter = /*#__PURE__*/ createUseWriteContract({
  abi: paymentRouterAbi,
  address: paymentRouterAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setTokenSupported"`
 */
export const useWritePaymentRouterSetTokenSupported =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setTokenSupported',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setFee"`
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
 */
export const useWritePaymentRouterSetFeeCollector =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setFeeCollector',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"sendEthPayment"`
 */
export const useWritePaymentRouterSendEthPayment =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'sendEthPayment',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"sendTokenPayment"`
 */
export const useWritePaymentRouterSendTokenPayment =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'sendTokenPayment',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"withdrawEth"`
 */
export const useWritePaymentRouterWithdrawEth =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'withdrawEth',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"withdrawToken"`
 */
export const useWritePaymentRouterWithdrawToken =
  /*#__PURE__*/ createUseWriteContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'withdrawToken',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__
 */
export const useSimulatePaymentRouter = /*#__PURE__*/ createUseSimulateContract(
  { abi: paymentRouterAbi, address: paymentRouterAddress },
)

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setTokenSupported"`
 */
export const useSimulatePaymentRouterSetTokenSupported =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setTokenSupported',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setFee"`
 */
export const useSimulatePaymentRouterSetFee =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setFee',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"setFeeCollector"`
 */
export const useSimulatePaymentRouterSetFeeCollector =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'setFeeCollector',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"sendEthPayment"`
 */
export const useSimulatePaymentRouterSendEthPayment =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'sendEthPayment',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"sendTokenPayment"`
 */
export const useSimulatePaymentRouterSendTokenPayment =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'sendTokenPayment',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"withdrawEth"`
 */
export const useSimulatePaymentRouterWithdrawEth =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'withdrawEth',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link paymentRouterAbi}__ and `functionName` set to `"withdrawToken"`
 */
export const useSimulatePaymentRouterWithdrawToken =
  /*#__PURE__*/ createUseSimulateContract({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    functionName: 'withdrawToken',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link paymentRouterAbi}__
 */
export const useWatchPaymentRouterEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link paymentRouterAbi}__ and `eventName` set to `"PaymentSent"`
 */
export const useWatchPaymentRouterPaymentSentEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    eventName: 'PaymentSent',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link paymentRouterAbi}__ and `eventName` set to `"TokenSupported"`
 */
export const useWatchPaymentRouterTokenSupportedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: paymentRouterAbi,
    address: paymentRouterAddress,
    eventName: 'TokenSupported',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__
 */
export const useReadProfileRegistry = /*#__PURE__*/ createUseReadContract({
  abi: profileRegistryAbi,
  address: profileRegistryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"balanceOf"`
 */
export const useReadProfileRegistryBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"getApproved"`
 */
export const useReadProfileRegistryGetApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'getApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"getProfileByAddress"`
 */
export const useReadProfileRegistryGetProfileByAddress =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'getProfileByAddress',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"getProfileByHandle"`
 */
export const useReadProfileRegistryGetProfileByHandle =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'getProfileByHandle',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"isApprovedForAll"`
 */
export const useReadProfileRegistryIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"name"`
 */
export const useReadProfileRegistryName = /*#__PURE__*/ createUseReadContract({
  abi: profileRegistryAbi,
  address: profileRegistryAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"ownerOf"`
 */
export const useReadProfileRegistryOwnerOf =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'ownerOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"supportsInterface"`
 */
export const useReadProfileRegistrySupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"symbol"`
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
 */
export const useReadProfileRegistryTokenUri =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'tokenURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"addressToTokenId"`
 */
export const useReadProfileRegistryAddressToTokenId =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'addressToTokenId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"handleToTokenId"`
 */
export const useReadProfileRegistryHandleToTokenId =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'handleToTokenId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"profiles"`
 */
export const useReadProfileRegistryProfiles =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'profiles',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__
 */
export const useWriteProfileRegistry = /*#__PURE__*/ createUseWriteContract({
  abi: profileRegistryAbi,
  address: profileRegistryAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"approve"`
 */
export const useWriteProfileRegistryApprove =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"createProfile"`
 */
export const useWriteProfileRegistryCreateProfile =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'createProfile',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useWriteProfileRegistrySafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useWriteProfileRegistrySetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useWriteProfileRegistryTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateProfile"`
 */
export const useWriteProfileRegistryUpdateProfile =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateProfile',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateEns"`
 */
export const useWriteProfileRegistryUpdateEns =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateEns',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__
 */
export const useSimulateProfileRegistry =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"approve"`
 */
export const useSimulateProfileRegistryApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"createProfile"`
 */
export const useSimulateProfileRegistryCreateProfile =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'createProfile',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"safeTransferFrom"`
 */
export const useSimulateProfileRegistrySafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"setApprovalForAll"`
 */
export const useSimulateProfileRegistrySetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"transferFrom"`
 */
export const useSimulateProfileRegistryTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateProfile"`
 */
export const useSimulateProfileRegistryUpdateProfile =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateProfile',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateEns"`
 */
export const useSimulateProfileRegistryUpdateEns =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateEns',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__
 */
export const useWatchProfileRegistryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__ and `eventName` set to `"ProfileCreated"`
 */
export const useWatchProfileRegistryProfileCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    eventName: 'ProfileCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__ and `eventName` set to `"Transfer"`
 */
export const useWatchProfileRegistryTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__ and `eventName` set to `"ProfileUpdated"`
 */
export const useWatchProfileRegistryProfileUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    eventName: 'ProfileUpdated',
  })
