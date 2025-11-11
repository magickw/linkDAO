# LinkDAO Charity Governance System

This directory contains the smart contracts for the LinkDAO Charity Governance system. These contracts enable decentralized charitable giving through blockchain technology.

## Overview

The charity governance system allows community members to propose, vote on, and execute charitable donations while maintaining transparency and accountability. The system consists of several interconnected contracts that work together to facilitate charitable giving.

## Contracts

### Core Contracts

1. **CharityGovernance.sol** - Main governance contract for creating and managing charity proposals
2. **CharityVerificationSystem.sol** - System for verifying charitable organizations
3. **ProofOfDonationNFT.sol** - NFT-based proof of donation system
4. **CharityProposal.sol** - Contract for managing charity campaigns
5. **BurnToDonate.sol** - Mechanism for burning tokens to trigger donations
6. **CharitySubDAOFactory.sol** - Factory for creating regional charity SubDAOs
7. **BaseSubDAO.sol** - Base implementation for regional charity SubDAOs

## Deployment

The contracts have been deployed to the Sepolia testnet with the following addresses:

- CharityGovernance: `0x25b39592AA8da0be424734E0F143E5371396dd61`
- CharityVerificationSystem: `0x4e2F69c11897771e443A3EA03E207DC402496eb0`
- ProofOfDonationNFT: `0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4`
- CharityProposal: `0x2777b61C59a46Af2e672580eDAf13D75124B112c`
- BurnToDonate: `0x675Ac1D60563b9D083Ad34E268861a7BA562705D`
- CharitySubDAOFactory: `0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3`
- BaseSubDAO: `0xAe798cAD6842673999F91150A036D5D5621D62A5`

## Testing

To run tests for the charity governance contracts:

```bash
npx hardhat test test/charity-governance/*.test.ts
```

## Auditing

These contracts have been designed with security in mind, but they have not yet been audited by a third-party security firm. Please use caution when interacting with them on mainnet.

## License

MIT