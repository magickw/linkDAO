import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

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
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
