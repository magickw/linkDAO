export const charityGovernanceABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_governanceToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_treasury",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ExecutionDelayExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidShortString",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "str",
        "type": "string"
      }
    ],
    "name": "StringTooLong",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "delegator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "fromDelegate",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "toDelegate",
        "type": "address"
      }
    ],
    "name": "DelegateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "previousBalance",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newBalance",
        "type": "uint256"
      }
    ],
    "name": "DelegateVotesChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "ProposalCanceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "ProposalExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "executionTime",
        "type": "uint256"
      }
    ],
    "name": "ProposalQueued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "proposer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startBlock",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endBlock",
        "type": "uint256"
      }
    ],
    "name": "ProposalCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "proposer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "charityRecipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "donationAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "charityName",
        "type": "string"
      }
    ],
    "name": "CharityProposalCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "voter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "proposalId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "support",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "votes",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "delegator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "delegate",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "votingPower",
        "type": "uint256"
      }
    ],
    "name": "DelegationUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "enum CharityGovernance.ProposalCategory",
        "name": "category",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quorum",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "threshold",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "requiresStaking",
        "type": "bool"
      }
    ],
    "name": "CategoryParametersUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "indexedUser",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newVotingPower",
        "type": "uint256"
      }
    ],
    "name": "VotingPowerUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "target",
        "type": "address"
      }
    ],
    "name": "TargetAuthorized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "target",
        "type": "address"
      }
    ],
    "name": "TargetRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalId",
            "type": "uint256"
          }
        ],
        "name": "cancel",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalId",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "support",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "reason",
            "type": "string"
          }
        ],
        "name": "castVote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalId",
            "type": "uint256"
          }
        ],
        "name": "execute",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalId",
            "type": "uint256"
          }
        ],
        "name": "queue",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "enum CharityGovernance.ProposalCategory",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "address[]",
            "name": "targets",
            "type": "address[]"
          },
          {
            "internalType": "uint256[]",
            "name": "values",
            "type": "uint256[]"
          },
          {
            "internalType": "string[]",
            "name": "signatures",
            "type": "string[]"
          },
          {
            "internalType": "bytes[]",
            "name": "calldatas",
            "type": "bytes[]"
          }
        ],
        "name": "propose",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "charityRecipient",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "donationAmount",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "charityName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "charityDescription",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "proofOfVerification",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "impactMetrics",
            "type": "string"
          }
        ],
        "name": "proposeCharityDonation",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "target",
            "type": "address"
          }
        ],
        "name": "authorizeTarget",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "target",
            "type": "address"
          }
        ],
        "name": "revokeTarget",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "enum CharityGovernance.ProposalCategory",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "quorum",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "threshold",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "requiresStaking",
            "type": "bool"
          }
        ],
        "name": "updateCategoryParameters",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "proposalCount",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "votingDelay",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "votingPeriod",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "quorumVotes",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "proposalThreshold",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "executionDelay",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "proposals",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "proposer",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "startBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "forVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "againstVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "abstainVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "quorum",
            "type": "uint256"
          },
          {
            "internalType": "enum CharityGovernance.ProposalState",
            "name": "state",
            "type": "uint8"
          },
          {
            "internalType": "enum CharityGovernance.ProposalCategory",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "executionDelay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "queuedAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "requiresStaking",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "minStakeToVote",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "charityRecipient",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "donationAmount",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "charityName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "charityDescription",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "proofOfVerification",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isVerifiedCharity",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "impactMetrics",
            "type": "string"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "voter",
            "type": "address"
          }
        ],
        "name": "proposalVotes",
        "outputs": [
          {
            "internalType": "bool",
            "name": "hasVoted",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "support",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "votes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "stakingPower",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "votingPower",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "delegates",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "delegatedVotes",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "authorizedTargets",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "enum CharityGovernance.ProposalCategory",
            "name": "",
            "type": "uint8"
          }
        ],
        "name": "categoryQuorum",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "enum CharityGovernance.ProposalCategory",
            "name": "",
            "type": "uint8"
          }
        ],
        "name": "categoryThreshold",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "enum CharityGovernance.ProposalCategory",
            "name": "",
            "type": "uint8"
          }
        ],
        "name": "categoryRequiresStaking",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "governanceToken",
        "outputs": [
          {
            "internalType": "contract LDAOToken",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "treasury",
        "outputs": [
          {
            "internalType": "contract LDAOTreasury",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    "name": "getProposal",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "proposer",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "startBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "forVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "againstVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "abstainVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "quorum",
            "type": "uint256"
          },
          {
            "internalType": "enum CharityGovernance.ProposalState",
            "name": "state",
            "type": "uint8"
          },
          {
            "internalType": "enum CharityGovernance.ProposalCategory",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "address[]",
            "name": "targets",
            "type": "address[]"
          },
          {
            "internalType": "uint256[]",
            "name": "values",
            "type": "uint256[]"
          },
          {
            "internalType": "string[]",
            "name": "signatures",
            "type": "string[]"
          },
          {
            "internalType": "bytes[]",
            "name": "calldatas",
            "type": "bytes[]"
          },
          {
            "internalType": "uint256",
            "name": "executionDelay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "queuedAt",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "requiresStaking",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "minStakeToVote",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "charityRecipient",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "donationAmount",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "charityName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "charityDescription",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "proofOfVerification",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isVerifiedCharity",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "impactMetrics",
            "type": "string"
          }
        ],
        "internalType": "struct CharityGovernance.Proposal",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;