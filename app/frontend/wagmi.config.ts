import { defineConfig } from '@wagmi/cli';
import { react } from '@wagmi/cli/plugins';
import { profileRegistryABI } from './src/lib/abi/ProfileRegistryABI';
import { followModuleABI } from './src/lib/abi/FollowModuleABI';
import { paymentRouterABI } from './src/lib/abi/PaymentRouterABI';
import { governanceABI } from './src/lib/abi/GovernanceABI';
import { charityGovernanceABI } from './src/lib/abi/CharityGovernanceABI';
import { charityVerificationSystemABI } from './src/lib/abi/CharityVerificationSystemABI';
import { proofOfDonationNFTABI } from './src/lib/abi/ProofOfDonationNFTABI';
import { charityProposalABI } from './src/lib/abi/CharityProposalABI';
import { burnToDonateABI } from './src/lib/abi/BurnToDonateABI';
import { charitySubDAOFactoryABI } from './src/lib/abi/CharitySubDAOFactoryABI';
import { baseSubDAOABI } from './src/lib/abi/BaseSubDAOABI';
import { ldaoTokenABI } from './src/lib/abi/LDAOTokenABI';
import { reputationSystemABI } from './src/lib/abi/ReputationSystemABI';
import { enhancedEscrowABI } from './src/lib/abi/EnhancedEscrowABI';
import { disputeResolutionABI } from './src/lib/abi/DisputeResolutionABI';
import { marketplaceABI } from './src/lib/abi/MarketplaceABI';
import { nftMarketplaceABI } from './src/lib/abi/NFTMarketplaceABI';
import { tipRouterABI } from './src/lib/abi/TipRouterABI';
import { ldaoTreasuryABI } from './src/lib/abi/LDAOTreasuryABI';
import { enhancedLdaoTreasuryABI } from './src/lib/abi/EnhancedLDAOTreasuryABI';

export default defineConfig({
  out: 'src/generated.ts',
  contracts: [
    {
      name: 'ProfileRegistry',
      abi: profileRegistryABI,
      address: {
        11155111: '0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD', // Sepolia testnet (DEPLOYED)
        8453: '0x1234567890123456789012345678901234567890', // Base mainnet (PLACEHOLDER - NOT DEPLOYED)
        84532: '0x1234567890123456789012345678901234567890', // Base testnet (PLACEHOLDER - NOT DEPLOYED)
      },
    },
    {
      name: 'FollowModule',
      abi: followModuleABI,
      address: {
        11155111: '0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439', // Sepolia testnet (DEPLOYED)
        8453: '0x2345678901234567890123456789012345678901', // Base mainnet (PLACEHOLDER - NOT DEPLOYED)
        84532: '0x2345678901234567890123456789012345678901', // Base testnet (PLACEHOLDER - NOT DEPLOYED)
      },
    },
    {
      name: 'PaymentRouter',
      abi: paymentRouterABI,
      address: {
        11155111: '0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50', // Sepolia testnet (DEPLOYED)
        8453: '0x3456789012345678901234567890123456789012', // Base mainnet (PLACEHOLDER - NOT DEPLOYED)
        84532: '0x3456789012345678901234567890123456789012', // Base Sepolia (PLACEHOLDER - NOT DEPLOYED)
      },
    },
    {
      name: 'Governance',
      abi: governanceABI,
      address: {
        11155111: '0x27a78A860445DFFD9073aFd7065dd421487c0F8A', // Sepolia testnet (DEPLOYED)
        8453: '0x4567890123456789012345678901234567890123', // Base mainnet (PLACEHOLDER - NOT DEPLOYED)
        84532: '0x4567890123456789012345678901234567890123', // Base testnet (PLACEHOLDER - NOT DEPLOYED)
      },
    },
    {
      name: 'CharityGovernance',
      abi: charityGovernanceABI,
      address: {
        11155111: '0x25b39592AA8da0be424734E0F143E5371396dd61', // Sepolia testnet
      },
    },
    {
      name: 'CharityVerificationSystem',
      abi: charityVerificationSystemABI,
      address: {
        11155111: '0x4e2F69c11897771e443A3EA03E207DC402496eb0', // Sepolia testnet
      },
    },
    {
      name: 'ProofOfDonationNFT',
      abi: proofOfDonationNFTABI,
      address: {
        11155111: '0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4', // Sepolia testnet
      },
    },
    {
      name: 'CharityProposal',
      abi: charityProposalABI,
      address: {
        11155111: '0x2777b61C59a46Af2e672580eDAf13D75124B112c', // Sepolia testnet
      },
    },
    {
      name: 'BurnToDonate',
      abi: burnToDonateABI,
      address: {
        11155111: '0x675Ac1D60563b9D083Ad34E268861a7BA562705D', // Sepolia testnet
      },
    },
    {
      name: 'CharitySubDAOFactory',
      abi: charitySubDAOFactoryABI,
      address: {
        11155111: '0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3', // Sepolia testnet
      },
    },
    {
      name: 'BaseSubDAO',
      abi: baseSubDAOABI,
      address: {
        11155111: '0xAe798cAD6842673999F91150A036D5D5621D62A5', // Sepolia testnet
      },
    },
    {
      name: 'LDAOToken',
      abi: ldaoTokenABI,
      address: {
        11155111: '0xc9F690B45e33ca909bB9ab97836091673232611B', // Sepolia testnet (DEPLOYED)
      },
    },
    {
      name: 'ReputationSystem',
      abi: reputationSystemABI,
      address: {
        11155111: '0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2', // Sepolia testnet (DEPLOYED)
      },
    },
    {
      name: 'EnhancedEscrow',
      abi: enhancedEscrowABI,
      address: {
        11155111: '0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1', // Sepolia testnet (DEPLOYED)
      },
    },
    {
      name: 'DisputeResolution',
      abi: disputeResolutionABI,
      address: {
        11155111: '0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a', // Sepolia testnet (DEPLOYED)
      },
    },
    {
      name: 'Marketplace',
      abi: marketplaceABI,
      address: {
        11155111: '0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A', // Sepolia testnet (DEPLOYED)
      },
    },
    {
      name: 'NFTMarketplace',
      abi: nftMarketplaceABI,
      address: {
        11155111: '0x012d3646Cd0D587183112fdD38f473FaA50D2A09', // Sepolia testnet (DEPLOYED)
      },
    },
    {
      name: 'TipRouter',
      abi: tipRouterABI,
      address: {
        11155111: '0x755Fe81411c86019fff6033E0567A4D93b57281b', // Sepolia testnet (DEPLOYED)
      },
    },
    {
      name: 'LDAOTreasury',
      abi: ldaoTreasuryABI,
      address: {
        11155111: '0xeF85C8CcC03320dA32371940b315D563be2585e5', // Sepolia testnet (DEPLOYED)
      },
    },
    {
      name: 'EnhancedLDAOTreasury',
      abi: enhancedLdaoTreasuryABI,
      address: {
        11155111: '0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5', // Sepolia testnet (DEPLOYED)
      },
    },
  ],
  plugins: [
    react(),
  ],
});