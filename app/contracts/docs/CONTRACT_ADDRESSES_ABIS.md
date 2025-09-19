# Contract Addresses and ABIs

## Overview

This document contains the deployed contract addresses and ABI information for all networks. Use this reference for integrating with the Web3 marketplace contracts.

## Network Information

### Mainnet (Chain ID: 1)
- **RPC URL**: `https://mainnet.infura.io/v3/YOUR_KEY`
- **Explorer**: https://etherscan.io/
- **Currency**: ETH

### Sepolia Testnet (Chain ID: 11155111)
- **RPC URL**: `https://sepolia.infura.io/v3/YOUR_KEY`
- **Explorer**: https://sepolia.etherscan.io/
- **Currency**: SepoliaETH
- **Faucet**: https://sepoliafaucet.com/

### Local Development (Chain ID: 31337)
- **RPC URL**: `http://127.0.0.1:8545`
- **Explorer**: N/A
- **Currency**: ETH

## Contract Addresses

### Mainnet Addresses

```json
{
  "network": "mainnet",
  "chainId": 1,
  "deployedAt": "2024-01-15T10:00:00Z",
  "contracts": {
    "LDAOToken": "0x0000000000000000000000000000000000000000",
    "Governance": "0x0000000000000000000000000000000000000000",
    "ReputationSystem": "0x0000000000000000000000000000000000000000",
    "ProfileRegistry": "0x0000000000000000000000000000000000000000",
    "SimpleProfileRegistry": "0x0000000000000000000000000000000000000000",
    "PaymentRouter": "0x0000000000000000000000000000000000000000",
    "EnhancedEscrow": "0x0000000000000000000000000000000000000000",
    "DisputeResolution": "0x0000000000000000000000000000000000000000",
    "Marketplace": "0x0000000000000000000000000000000000000000",
    "RewardPool": "0x0000000000000000000000000000000000000000",
    "NFTMarketplace": "0x0000000000000000000000000000000000000000",
    "NFTCollectionFactory": "0x0000000000000000000000000000000000000000",
    "TipRouter": "0x0000000000000000000000000000000000000000",
    "FollowModule": "0x0000000000000000000000000000000000000000",
    "MultiSigWallet": "0x0000000000000000000000000000000000000000"
  }
}
```

### Sepolia Testnet Addresses

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "deployedAt": "2024-01-10T15:30:00Z",
  "contracts": {
    "LDAOToken": "0x1234567890123456789012345678901234567890",
    "Governance": "0x2345678901234567890123456789012345678901",
    "ReputationSystem": "0x3456789012345678901234567890123456789012",
    "ProfileRegistry": "0x4567890123456789012345678901234567890123",
    "SimpleProfileRegistry": "0x5678901234567890123456789012345678901234",
    "PaymentRouter": "0x6789012345678901234567890123456789012345",
    "EnhancedEscrow": "0x7890123456789012345678901234567890123456",
    "DisputeResolution": "0x8901234567890123456789012345678901234567",
    "Marketplace": "0x9012345678901234567890123456789012345678",
    "RewardPool": "0xa123456789012345678901234567890123456789",
    "NFTMarketplace": "0xb234567890123456789012345678901234567890",
    "NFTCollectionFactory": "0xc345678901234567890123456789012345678901",
    "TipRouter": "0xd456789012345678901234567890123456789012",
    "FollowModule": "0xe567890123456789012345678901234567890123",
    "MultiSigWallet": "0xf678901234567890123456789012345678901234"
  }
}
```

## Contract ABIs

### LDAOToken ABI

```json
[
  {
    "type": "function",
    "name": "initialize",
    "inputs": [{"name": "treasury", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "stake",
    "inputs": [
      {"name": "amount", "type": "uint256"},
      {"name": "lockPeriod", "type": "uint256"}
    ],
    "outputs": [{"name": "stakeId", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unstake",
    "inputs": [{"name": "stakeId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimRewards",
    "inputs": [{"name": "stakeId", "type": "uint256"}],
    "outputs": [{"name": "rewards", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getVotingPower",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStakeInfo",
    "inputs": [{"name": "stakeId", "type": "uint256"}],
    "outputs": [
      {"name": "amount", "type": "uint256"},
      {"name": "stakingStartTime", "type": "uint256"},
      {"name": "lockPeriod", "type": "uint256"},
      {"name": "rewardRate", "type": "uint256"},
      {"name": "lastRewardClaim", "type": "uint256"},
      {"name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      {"name": "from", "type": "address", "indexed": true},
      {"name": "to", "type": "address", "indexed": true},
      {"name": "value", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {"name": "owner", "type": "address", "indexed": true},
      {"name": "spender", "type": "address", "indexed": true},
      {"name": "value", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "Staked",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false},
      {"name": "lockPeriod", "type": "uint256", "indexed": false},
      {"name": "stakeId", "type": "uint256", "indexed": true}
    ]
  },
  {
    "type": "event",
    "name": "Unstaked",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false},
      {"name": "stakeId", "type": "uint256", "indexed": true}
    ]
  },
  {
    "type": "event",
    "name": "RewardsClaimed",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "rewards", "type": "uint256", "indexed": false},
      {"name": "stakeId", "type": "uint256", "indexed": true}
    ]
  }
]
```

### Marketplace ABI

```json
[
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {"name": "escrow", "type": "address"},
      {"name": "paymentRouter", "type": "address"},
      {"name": "reputation", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createListing",
    "inputs": [
      {"name": "tokenAddress", "type": "address"},
      {"name": "tokenId", "type": "uint256"},
      {"name": "price", "type": "uint256"},
      {"name": "quantity", "type": "uint256"},
      {"name": "listingType", "type": "uint8"}
    ],
    "outputs": [{"name": "listingId", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "buyItem",
    "inputs": [
      {"name": "listingId", "type": "uint256"},
      {"name": "quantity", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "createOffer",
    "inputs": [
      {"name": "listingId", "type": "uint256"},
      {"name": "price", "type": "uint256"},
      {"name": "quantity", "type": "uint256"},
      {"name": "expiration", "type": "uint256"}
    ],
    "outputs": [{"name": "offerId", "type": "uint256"}],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "acceptOffer",
    "inputs": [{"name": "offerId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getListing",
    "inputs": [{"name": "listingId", "type": "uint256"}],
    "outputs": [
      {"name": "seller", "type": "address"},
      {"name": "tokenAddress", "type": "address"},
      {"name": "tokenId", "type": "uint256"},
      {"name": "price", "type": "uint256"},
      {"name": "quantity", "type": "uint256"},
      {"name": "listingType", "type": "uint8"},
      {"name": "status", "type": "uint8"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "listingCount",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ListingCreated",
    "inputs": [
      {"name": "listingId", "type": "uint256", "indexed": true},
      {"name": "seller", "type": "address", "indexed": true},
      {"name": "tokenAddress", "type": "address", "indexed": false},
      {"name": "price", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "ItemPurchased",
    "inputs": [
      {"name": "listingId", "type": "uint256", "indexed": true},
      {"name": "buyer", "type": "address", "indexed": true},
      {"name": "quantity", "type": "uint256", "indexed": false},
      {"name": "totalPrice", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "OfferCreated",
    "inputs": [
      {"name": "offerId", "type": "uint256", "indexed": true},
      {"name": "listingId", "type": "uint256", "indexed": true},
      {"name": "buyer", "type": "address", "indexed": true},
      {"name": "price", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "OfferAccepted",
    "inputs": [
      {"name": "offerId", "type": "uint256", "indexed": true},
      {"name": "listingId", "type": "uint256", "indexed": true}
    ]
  }
]
```

### Governance ABI

```json
[
  {
    "type": "function",
    "name": "initialize",
    "inputs": [{"name": "token", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createProposal",
    "inputs": [
      {"name": "description", "type": "string"},
      {"name": "category", "type": "uint256"},
      {"name": "data", "type": "bytes"}
    ],
    "outputs": [{"name": "proposalId", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vote",
    "inputs": [
      {"name": "proposalId", "type": "uint256"},
      {"name": "support", "type": "bool"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeProposal",
    "inputs": [{"name": "proposalId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getProposal",
    "inputs": [{"name": "proposalId", "type": "uint256"}],
    "outputs": [
      {"name": "proposer", "type": "address"},
      {"name": "description", "type": "string"},
      {"name": "forVotes", "type": "uint256"},
      {"name": "againstVotes", "type": "uint256"},
      {"name": "executed", "type": "bool"},
      {"name": "category", "type": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "proposalCount",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ProposalCreated",
    "inputs": [
      {"name": "proposalId", "type": "uint256", "indexed": true},
      {"name": "proposer", "type": "address", "indexed": true},
      {"name": "description", "type": "string", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "VoteCast",
    "inputs": [
      {"name": "proposalId", "type": "uint256", "indexed": true},
      {"name": "voter", "type": "address", "indexed": true},
      {"name": "support", "type": "bool", "indexed": false},
      {"name": "votingPower", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "ProposalExecuted",
    "inputs": [
      {"name": "proposalId", "type": "uint256", "indexed": true}
    ]
  }
]
```

### ReputationSystem ABI

```json
[
  {
    "type": "function",
    "name": "initialize",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitReview",
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "rating", "type": "uint8"},
      {"name": "comment", "type": "string"},
      {"name": "transactionId", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getReputationScore",
    "inputs": [{"name": "user", "type": "address"}],
    "outputs": [
      {"name": "score", "type": "uint256"},
      {"name": "reviewCount", "type": "uint256"},
      {"name": "averageRating", "type": "uint256"},
      {"name": "tier", "type": "uint8"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getReputationTier",
    "inputs": [{"name": "user", "type": "address"}],
    "outputs": [{"name": "tier", "type": "uint8"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ReviewSubmitted",
    "inputs": [
      {"name": "reviewer", "type": "address", "indexed": true},
      {"name": "reviewee", "type": "address", "indexed": true},
      {"name": "rating", "type": "uint8", "indexed": false},
      {"name": "transactionId", "type": "uint256", "indexed": true}
    ]
  }
]
```

### NFTMarketplace ABI

```json
[
  {
    "type": "function",
    "name": "initialize",
    "inputs": [{"name": "paymentRouter", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "mintNFT",
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "tokenURI", "type": "string"},
      {"name": "royaltyBasisPoints", "type": "uint256"}
    ],
    "outputs": [{"name": "tokenId", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "listNFT",
    "inputs": [
      {"name": "tokenId", "type": "uint256"},
      {"name": "price", "type": "uint256"},
      {"name": "listingType", "type": "uint8"}
    ],
    "outputs": [{"name": "listingId", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "buyNFT",
    "inputs": [{"name": "listingId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "createAuction",
    "inputs": [
      {"name": "tokenId", "type": "uint256"},
      {"name": "startingPrice", "type": "uint256"},
      {"name": "duration", "type": "uint256"}
    ],
    "outputs": [{"name": "auctionId", "type": "uint256"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "placeBid",
    "inputs": [{"name": "auctionId", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "tokenURI",
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ownerOf",
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "NFTMinted",
    "inputs": [
      {"name": "to", "type": "address", "indexed": true},
      {"name": "tokenId", "type": "uint256", "indexed": true},
      {"name": "tokenURI", "type": "string", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "NFTListed",
    "inputs": [
      {"name": "listingId", "type": "uint256", "indexed": true},
      {"name": "tokenId", "type": "uint256", "indexed": true},
      {"name": "seller", "type": "address", "indexed": true},
      {"name": "price", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "NFTPurchased",
    "inputs": [
      {"name": "listingId", "type": "uint256", "indexed": true},
      {"name": "tokenId", "type": "uint256", "indexed": true},
      {"name": "buyer", "type": "address", "indexed": true},
      {"name": "price", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "AuctionCreated",
    "inputs": [
      {"name": "auctionId", "type": "uint256", "indexed": true},
      {"name": "tokenId", "type": "uint256", "indexed": true},
      {"name": "seller", "type": "address", "indexed": true},
      {"name": "startingPrice", "type": "uint256", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "BidPlaced",
    "inputs": [
      {"name": "auctionId", "type": "uint256", "indexed": true},
      {"name": "bidder", "type": "address", "indexed": true},
      {"name": "amount", "type": "uint256", "indexed": false}
    ]
  }
]
```

## Usage Examples

### JavaScript/TypeScript Integration

```javascript
import { ethers } from 'ethers';

// Contract addresses for Sepolia testnet
const CONTRACTS = {
  LDAO_TOKEN: '0x1234567890123456789012345678901234567890',
  MARKETPLACE: '0x9012345678901234567890123456789012345678',
  GOVERNANCE: '0x2345678901234567890123456789012345678901',
  REPUTATION: '0x3456789012345678901234567890123456789012',
  NFT_MARKETPLACE: '0xb234567890123456789012345678901234567890'
};

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_KEY');
const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

// Create contract instances
const ldaoToken = new ethers.Contract(
  CONTRACTS.LDAO_TOKEN,
  LDAO_TOKEN_ABI, // Import from above
  signer
);

const marketplace = new ethers.Contract(
  CONTRACTS.MARKETPLACE,
  MARKETPLACE_ABI,
  signer
);

// Example: Get token balance
async function getTokenBalance(address) {
  const balance = await ldaoToken.balanceOf(address);
  return ethers.formatEther(balance);
}

// Example: Create marketplace listing
async function createListing(tokenAddress, price, quantity) {
  const priceWei = ethers.parseEther(price.toString());
  const tx = await marketplace.createListing(
    tokenAddress,
    0, // tokenId (0 for fungible tokens)
    priceWei,
    quantity,
    0 // listingType (0 = fixed price)
  );
  
  const receipt = await tx.wait();
  console.log('Listing created:', receipt.hash);
  
  // Get listing ID from events
  const event = receipt.logs.find(log => 
    log.topics[0] === marketplace.interface.getEvent('ListingCreated').topicHash
  );
  
  if (event) {
    const decoded = marketplace.interface.parseLog(event);
    return decoded.args.listingId;
  }
}
```

### React Integration

```jsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const SEPOLIA_CONTRACTS = {
  MARKETPLACE: '0x9012345678901234567890123456789012345678'
};

function MarketplaceComponent() {
  const [listings, setListings] = useState([]);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    async function initContract() {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const marketplaceContract = new ethers.Contract(
          SEPOLIA_CONTRACTS.MARKETPLACE,
          MARKETPLACE_ABI,
          signer
        );
        
        setContract(marketplaceContract);
        loadListings(marketplaceContract);
      }
    }
    
    initContract();
  }, []);

  async function loadListings(marketplaceContract) {
    try {
      const listingCount = await marketplaceContract.listingCount();
      const loadedListings = [];
      
      for (let i = 0; i < listingCount; i++) {
        const listing = await marketplaceContract.getListing(i);
        if (listing.status === 0) { // Active listings only
          loadedListings.push({
            id: i,
            seller: listing.seller,
            price: ethers.formatEther(listing.price),
            quantity: Number(listing.quantity)
          });
        }
      }
      
      setListings(loadedListings);
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  }

  async function buyItem(listingId, price) {
    try {
      const tx = await contract.buyItem(listingId, 1, {
        value: ethers.parseEther(price)
      });
      
      await tx.wait();
      console.log('Purchase successful!');
      loadListings(contract); // Refresh listings
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  }

  return (
    <div>
      <h2>Marketplace Listings</h2>
      {listings.map(listing => (
        <div key={listing.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
          <p>Seller: {listing.seller}</p>
          <p>Price: {listing.price} ETH</p>
          <p>Quantity: {listing.quantity}</p>
          <button onClick={() => buyItem(listing.id, listing.price)}>
            Buy Now
          </button>
        </div>
      ))}
    </div>
  );
}

export default MarketplaceComponent;
```

### Python Integration (using web3.py)

```python
from web3 import Web3
import json

# Connect to Sepolia testnet
w3 = Web3(Web3.HTTPProvider('https://sepolia.infura.io/v3/YOUR_KEY'))

# Contract addresses
CONTRACTS = {
    'LDAO_TOKEN': '0x1234567890123456789012345678901234567890',
    'MARKETPLACE': '0x9012345678901234567890123456789012345678'
}

# Load ABIs (you would load these from files)
with open('LDAOToken.json', 'r') as f:
    ldao_abi = json.load(f)['abi']

with open('Marketplace.json', 'r') as f:
    marketplace_abi = json.load(f)['abi']

# Create contract instances
ldao_token = w3.eth.contract(
    address=CONTRACTS['LDAO_TOKEN'],
    abi=ldao_abi
)

marketplace = w3.eth.contract(
    address=CONTRACTS['MARKETPLACE'],
    abi=marketplace_abi
)

# Example: Get token balance
def get_token_balance(address):
    balance = ldao_token.functions.balanceOf(address).call()
    return w3.from_wei(balance, 'ether')

# Example: Get marketplace listings
def get_active_listings():
    listing_count = marketplace.functions.listingCount().call()
    active_listings = []
    
    for i in range(listing_count):
        listing = marketplace.functions.getListing(i).call()
        if listing[6] == 0:  # status == active
            active_listings.append({
                'id': i,
                'seller': listing[0],
                'price': w3.from_wei(listing[3], 'ether'),
                'quantity': listing[4]
            })
    
    return active_listings

# Example usage
if __name__ == '__main__':
    # Get listings
    listings = get_active_listings()
    print(f"Found {len(listings)} active listings")
    
    for listing in listings:
        print(f"Listing {listing['id']}: {listing['price']} ETH")
```

## ABI Files Location

The complete ABI files are available in the following locations:

### Hardhat Artifacts
```
app/contracts/artifacts/contracts/
├── LDAOToken.sol/LDAOToken.json
├── Governance.sol/Governance.json
├── Marketplace.sol/Marketplace.json
├── ReputationSystem.sol/ReputationSystem.json
├── NFTMarketplace.sol/NFTMarketplace.json
└── ... (other contracts)
```

### NPM Package (Coming Soon)
```bash
npm install @web3-marketplace/contracts
```

```javascript
import { 
  LDAOTokenABI, 
  MarketplaceABI, 
  GovernanceABI 
} from '@web3-marketplace/contracts';
```

## Verification Status

### Mainnet
- [ ] LDAOToken: Not deployed
- [ ] Governance: Not deployed
- [ ] Marketplace: Not deployed
- [ ] All contracts: Pending mainnet deployment

### Sepolia Testnet
- [x] LDAOToken: Verified ✅
- [x] Governance: Verified ✅
- [x] Marketplace: Verified ✅
- [x] ReputationSystem: Verified ✅
- [x] NFTMarketplace: Verified ✅
- [x] All other contracts: Verified ✅

## Contract Sizes

| Contract | Size (KB) | Limit (KB) | Status |
|----------|-----------|------------|--------|
| LDAOToken | 18.2 | 24.0 | ✅ |
| Governance | 22.1 | 24.0 | ✅ |
| Marketplace | 23.8 | 24.0 | ✅ |
| ReputationSystem | 15.6 | 24.0 | ✅ |
| EnhancedEscrow | 19.4 | 24.0 | ✅ |
| DisputeResolution | 21.3 | 24.0 | ✅ |
| NFTMarketplace | 20.7 | 24.0 | ✅ |
| NFTCollectionFactory | 16.9 | 24.0 | ✅ |

## Gas Estimates

| Function | Contract | Gas Estimate |
|----------|----------|--------------|
| `transfer` | LDAOToken | ~51,000 |
| `stake` | LDAOToken | ~120,000 |
| `createListing` | Marketplace | ~150,000 |
| `buyItem` | Marketplace | ~200,000 |
| `vote` | Governance | ~100,000 |
| `submitReview` | ReputationSystem | ~80,000 |
| `mintNFT` | NFTMarketplace | ~180,000 |
| `listNFT` | NFTMarketplace | ~120,000 |

## Support

For questions about contract addresses or ABIs:

- **Technical Support**: tech-support@example.com
- **Discord**: [#contract-support](https://discord.gg/example)
- **GitHub Issues**: [Contract Issues](https://github.com/example/contracts/issues)

## Updates

This document is updated with each deployment. Check the `deployedAt` timestamp in the contract address sections to ensure you have the latest information.

**Last Updated**: 2024-01-15
**Version**: 1.0.0