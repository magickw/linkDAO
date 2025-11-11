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

export default defineConfig({
  out: 'src/generated.ts',
  contracts: [
    {
      name: 'ProfileRegistry',
      abi: profileRegistryABI,
      address: {
        8453: '0x1234567890123456789012345678901234567890', // Base mainnet
        84532: '0x1234567890123456789012345678901234567890', // Base testnet
      },
    },
    {
      name: 'FollowModule',
      abi: followModuleABI,
      address: {
        8453: '0x2345678901234567890123456789012345678901',
        84532: '0x2345678901234567890123456789012345678901',
      },
    },
    {
      name: 'PaymentRouter',
      abi: paymentRouterABI,
      address: {
        8453: '0x3456789012345678901234567890123456789012',
        84532: '0x3456789012345678901234567890123456789012',
      },
    },
    {
      name: 'Governance',
      abi: governanceABI,
      address: {
        8453: '0x4567890123456789012345678901234567890123',
        84532: '0x4567890123456789012345678901234567890123',
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
  ],
  plugins: [
    react(),
  ],
});