# LinkDAO Wallet Integration Guide

## Overview

This guide covers wallet integration for the LinkDAO platform, supporting both individual users and platform treasury operations.

## Supported Wallet Types

### 1. Individual User Wallets

#### MetaMask Integration
```javascript
// Connect to MetaMask
const connectWallet = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return signer;
    } catch (error) {
      console.error('User rejected connection');
    }
  } else {
    alert('Please install MetaMask');
  }
};
```

#### Hardware Wallet Support
```javascript
// Connect Ledger via MetaMask
const connectLedger = async () => {
  // User needs to enable "Connect Hardware Wallet" in MetaMask
  // Then follow standard MetaMask connection flow
};
```

#### WalletConnect v2 Integration
```javascript
import { WalletConnectModal } from '@walletconnect/modal';

const walletConnectModal = new WalletConnectModal({
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [8453], // Base mainnet
});

// Connect to mobile wallets (Rainbow, Trust Wallet, etc.)
```

### 2. Multi-Sig Treasury Integration

#### Gnosis Safe Integration
```javascript
// Check if address is a Gnosis Safe
const isGnosisSafe = async (address) => {
  const response = await fetch(`https://safe-client.safe.global/api/v1/safes/${address}`);
  return response.ok;
};

// Get Safe owners
const getSafeOwners = async (safeAddress) => {
  const response = await fetch(`https://safe-client.safe.global/api/v1/safes/${safeAddress}`);
  const safe = await response.json();
  return safe.owners;
};
```

## Network Configuration

### Base Mainnet Settings
```javascript
const baseMainnet = {
  chainId: '0x2105', // 8453 in hex
  chainName: 'Base',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

// Add network to MetaMask
const addBaseNetwork = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{ ...baseMainnet }],
    });
  } catch (error) {
    console.error('Error adding network:', error);
  }
};
```

## Contract Integration

### 1. LDAOToken Interactions
```javascript
// Token balance check
const getTokenBalance = async (userAddress) => {
  const tokenContract = new ethers.Contract(
    LDAO_TOKEN_ADDRESS,
    LDAOTokenABI,
    provider
  );
  const balance = await tokenContract.balanceOf(userAddress);
  return ethers.formatEther(balance);
};

// Approve token for staking
const approveStaking = async (amount) => {
  const tokenContract = new ethers.Contract(
    LDAO_TOKEN_ADDRESS,
    LDAOTokenABI,
    signer
  );
  const tx = await tokenContract.approve(STAKING_ADDRESS, amount);
  await tx.wait();
};
```

### 2. Staking Integration
```javascript
// Stake tokens
const stakeTokens = async (amount, tierId, autoCompound) => {
  const stakingContract = new ethers.Contract(
    STAKING_ADDRESS,
    StakingABI,
    signer
  );
  const tx = await stakingContract.stake(amount, tierId, autoCompound);
  await tx.wait();
};

// Get staking info
const getStakingInfo = async (userAddress) => {
  const stakingContract = new ethers.Contract(
    STAKING_ADDRESS,
    StakingABI,
    provider
  );
  const info = await stakingContract.getUserStakingInfo(userAddress);
  return {
    totalStaked: ethers.formatEther(info.totalStaked),
    totalRewards: ethers.formatEther(info.totalRewards),
    activePositions: info.activePositions,
    isPremiumMember: info.isPremiumMember,
  };
};
```

### 3. Multi-Sig Operations
```javascript
// Create multi-sig transaction
const createMultiSigTx = async (to, value, data, description) => {
  const multiSigContract = new ethers.Contract(
    MULTISIG_ADDRESS,
    MultiSigABI,
    signer
  );
  const tx = await multiSigContract.submitTransaction(to, value, data, description);
  await tx.wait();
};

// Confirm multi-sig transaction
const confirmMultiSigTx = async (txId) => {
  const multiSigContract = new ethers.Contract(
    MULTISIG_ADDRESS,
    MultiSigABI,
    signer
  );
  const tx = await multiSigContract.confirmTransaction(txId);
  await tx.wait();
};
```

## Frontend Integration

### React Component Example
```jsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const WalletConnect = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        const signer = await provider.getSigner();
        setSigner(signer);
      }
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setAccount(address);
        setProvider(provider);
        setSigner(signer);
      } catch (error) {
        console.error('Connection failed:', error);
      }
    }
  };

  return (
    <div>
      {account ? (
        <div>
          <p>Connected: {account}</p>
          <button onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={connectWallet}>
          Connect Wallet
        </button>
      )}
    </div>
  );
};
```

## Security Best Practices

### 1. Private Key Management
- Never store private keys in frontend code
- Use hardware wallets for large amounts
- Implement proper session management

### 2. Transaction Security
```javascript
// Verify transaction before signing
const verifyTransaction = async (tx) => {
  // Check recipient address
  if (!ethers.isAddress(tx.to)) {
    throw new Error('Invalid recipient address');
  }
  
  // Check value is reasonable
  if (tx.value > ethers.parseEther('1')) {
    // Show confirmation dialog for large amounts
    const confirmed = window.confirm(
      `Sending ${ethers.formatEther(tx.value)} ETH. Continue?`
    );
    if (!confirmed) throw new Error('Transaction cancelled');
  }
};
```

### 3. Multi-Sig Implementation
```javascript
// Require multiple signatures for large operations
const requireMultiSig = (amount) => {
  const threshold = ethers.parseEther('1000'); // 1000 ETH threshold
  return amount > threshold;
};
```

## Mobile Support

### Deep Link Handling
```javascript
// Handle wallet deep links
const handleWalletDeepLink = (walletType) => {
  const deepLinks = {
    metamask: 'https://metamask.app/dapp/',
    rainbow: 'rainbow://',
    trust: 'trust://',
  };
  
  if (deepLinks[walletType]) {
    window.location.href = deepLinks[walletType] + window.location.href;
  }
};
```

## Testing Integration

### Test with Local Network
```javascript
// Hardhat local network testing
const localNetwork = {
  chainId: '0x7a69', // 31337 in hex
  chainName: 'Hardhat Local',
  rpcUrls: ['http://127.0.0.1:8545'],
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};
```

## Troubleshooting

### Common Issues
1. **Network not added**: Use `wallet_addEthereumChain`
2. **Wrong chain ID**: Verify Base mainnet uses 8453
3. **Insufficient funds**: Check both ETH and LDAO balances
4. **Transaction failed**: Verify gas limit and approval status

### Debug Tools
```javascript
// Log transaction details
const debugTransaction = (tx) => {
  console.log('Transaction:', {
    to: tx.to,
    value: ethers.formatEther(tx.value),
    data: tx.data,
    gasLimit: tx.gasLimit,
    gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
  });
};
```

## Resources

- [MetaMask Documentation](https://docs.metamask.io/)
- [WalletConnect Protocol](https://walletconnect.com/)
- [Gnosis Safe Docs](https://docs.gnosis-safe.io/)
- [Base Network Docs](https://docs.base.org/)
- [Ethers.js Documentation](https://docs.ethers.org/)