import {
  createUseReadContract,
  createUseWatchContractEvent,
  createUseWriteContract,
  createUseSimulateContract,
} from 'wagmi/codegen'

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
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
