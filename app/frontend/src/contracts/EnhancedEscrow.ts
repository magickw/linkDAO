export const enhancedEscrowABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_ldaoToken",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_governance",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "arbitrator",
          "type": "address"
        }
      ],
      "name": "ArbitratorAppointed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "deliveryInfo",
          "type": "string"
        }
      ],
      "name": "DeliveryConfirmed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum EnhancedEscrow.DisputeResolutionMethod",
          "name": "method",
          "type": "uint8"
        }
      ],
      "name": "DisputeOpened",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "EmergencyRefund",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "EscrowCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum EnhancedEscrow.EscrowStatus",
          "name": "resolution",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "winner",
          "type": "address"
        }
      ],
      "name": "EscrowResolved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "FundsLocked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newScore",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum EnhancedEscrow.ReputationTier",
          "name": "newTier",
          "type": "uint8"
        }
      ],
      "name": "ReputationUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "reviewId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "reviewer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "reviewee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "rating",
          "type": "uint8"
        }
      ],
      "name": "ReviewSubmitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "duration",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "UserSuspended",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "forBuyer",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "votingPower",
          "type": "uint256"
        }
      ],
      "name": "VoteCast",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "MAX_PLATFORM_FEE",
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
      "name": "MIN_VOTING_POWER",
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
      "name": "REPUTATION_DECAY_PERIOD",
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
      "name": "VOTING_PERIOD",
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
      "name": "arbitratorFees",
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
          "name": "arbitrator",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "authorized",
          "type": "bool"
        }
      ],
      "name": "authorizeArbitrator",
      "outputs": [],
      "stateMutability": "nonpayable",
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
      "name": "authorizedArbitrators",
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
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "calculateWeightedScore",
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
          "name": "reviewId",
          "type": "uint256"
        }
      ],
      "name": "castHelpfulVote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "forBuyer",
          "type": "bool"
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
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "deliveryInfo",
          "type": "string"
        }
      ],
      "name": "confirmDelivery",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "listingId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deliveryDeadline",
          "type": "uint256"
        },
        {
          "internalType": "enum EnhancedEscrow.DisputeResolutionMethod",
          "name": "resolutionMethod",
          "type": "uint8"
        }
      ],
      "name": "createEscrow",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "payable",
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
      "name": "detailedReputationScores",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalPoints",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "reviewCount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "averageRating",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "successfulTransactions",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "disputesWon",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "disputesLost",
          "type": "uint256"
        },
        {
          "internalType": "enum EnhancedEscrow.ReputationTier",
          "name": "tier",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "lastActivityTimestamp",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isSuspended",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "suspensionEndTime",
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
      "name": "escrows",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "listingId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "seller",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "feeAmount",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "deliveryInfo",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "deliveryDeadline",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "resolvedAt",
          "type": "uint256"
        },
        {
          "internalType": "enum EnhancedEscrow.EscrowStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "enum EnhancedEscrow.DisputeResolutionMethod",
          "name": "resolutionMethod",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "votesForBuyer",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "votesForSeller",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalVotingPower",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "appointedArbitrator",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "evidenceSubmitted",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "requiresMultiSig",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "multiSigThreshold",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "signatureCount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "timeLockExpiry",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "emergencyRefundEnabled",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        }
      ],
      "name": "executeEmergencyRefund",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getDetailedReputation",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "totalPoints",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "reviewCount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "averageRating",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "successfulTransactions",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "disputesWon",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "disputesLost",
              "type": "uint256"
            },
            {
              "internalType": "enum EnhancedEscrow.ReputationTier",
              "name": "tier",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "lastActivityTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "isSuspended",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "suspensionEndTime",
              "type": "uint256"
            }
          ],
          "internalType": "struct EnhancedEscrow.DetailedReputationScore",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getReputationTier",
      "outputs": [
        {
          "internalType": "enum EnhancedEscrow.ReputationTier",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "limit",
          "type": "uint256"
        }
      ],
      "name": "getTopSellers",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "sellers",
          "type": "address[]"
        },
        {
          "internalType": "uint256[]",
          "name": "scores",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserReviews",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "governance",
      "outputs": [
        {
          "internalType": "contract Governance",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "ldaoToken",
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
      "inputs": [
        {
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        }
      ],
      "name": "lockFunds",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextEscrowId",
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
      "name": "nextReviewId",
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
          "name": "escrowId",
          "type": "uint256"
        }
      ],
      "name": "openDispute",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
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
      "inputs": [],
      "name": "platformFeePercentage",
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
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "buyerWins",
          "type": "bool"
        }
      ],
      "name": "resolveDisputeByArbitrator",
      "outputs": [],
      "stateMutability": "nonpayable",
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
      "name": "reviews",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "reviewer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "reviewee",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "internalType": "uint8",
          "name": "rating",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "reviewText",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isVerified",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "helpfulVotes",
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
          "name": "arbitrator",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "fee",
          "type": "uint256"
        }
      ],
      "name": "setArbitratorFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newGovernance",
          "type": "address"
        }
      ],
      "name": "setGovernance",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newToken",
          "type": "address"
        }
      ],
      "name": "setLDAOToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newFee",
          "type": "uint256"
        }
      ],
      "name": "setPlatformFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "escrowId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "reviewee",
          "type": "address"
        },
        {
          "internalType": "uint8",
          "name": "rating",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "reviewText",
          "type": "string"
        }
      ],
      "name": "submitMarketplaceReview",
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
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "duration",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "suspendUser",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "userEscrows",
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
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "userReviews",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const;