import { defineConfig } from '@wagmi/cli';
import { react } from '@wagmi/cli/plugins';
import { profileRegistryABI } from './src/lib/abi/ProfileRegistryABI';
import { followModuleABI } from './src/lib/abi/FollowModuleABI';
import { paymentRouterABI } from './src/lib/abi/PaymentRouterABI';
import { governanceABI } from './src/lib/abi/GovernanceABI';

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
  ],
  plugins: [
    react(),
  ],
});