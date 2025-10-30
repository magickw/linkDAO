/**
 * Contract Service
 * Provides access to deployed contract addresses
 */

// Deployed contract addresses for Sepolia testnet
export const deployedAddresses = {
  network: "sepolia",
  chainId: 11155111,
  deployer: "0xEe034b53D4cCb101b2a4faec27708be507197350",
  deployedAt: "2025-10-22T00:48:05.128Z",
  multiSigAddress: "",
  contracts: {
    LDAOToken: {
      address: "0xc9F690B45e33ca909bB9ab97836091673232611B",
      owner: "0xEe034b53D4cCb101b2a4faec27708be507197350",
      deploymentTx: "0xc3105b2b5c899b763748fa2728f7cc8564126de99f668a4e29ca5fd8877ce549"
    },
    LDAOTreasury: {
      address: "0xeF85C8CcC03320dA32371940b315D563be2585e5",
      owner: "0xEe034b53D4cCb101b2a4faec27708be507197350",
      deploymentTx: "0x57c6090b2760861c2f5efcedc6c669541edbdd8874e5c72adc890832cbec67be"
    },
    // Other contracts...
    Governance: {
      address: "0x27a78A860445DFFD9073aFd7065dd421487c0F8A",
      owner: "0xEe034b53D4cCb101b2a4faec27708be507197350",
      deploymentTx: "0x73a71cc28ac42948498a589f61f95a582fdd02ee5d6c77742aff7d4dcd2aa529"
    }
  }
} as const;

/**
 * Get the LDAO token address
 * @returns The LDAO token contract address
 */
export function getLDAOTokenAddress(): string {
  return deployedAddresses.contracts.LDAOToken?.address || '0x0000000000000000000000000000000000000000';
}

/**
 * Get the LDAO treasury address
 * @returns The LDAO treasury contract address
 */
export function getLDAOTreasuryAddress(): string {
  return deployedAddresses.contracts.LDAOTreasury?.address || '0x0000000000000000000000000000000000000000';
}

/**
 * Get the governance contract address
 * @returns The governance contract address
 */
export function getGovernanceAddress(): string {
  return deployedAddresses.contracts.Governance?.address || '0x0000000000000000000000000000000000000000';
}

export default {
  getLDAOTokenAddress,
  getLDAOTreasuryAddress,
  getGovernanceAddress
};