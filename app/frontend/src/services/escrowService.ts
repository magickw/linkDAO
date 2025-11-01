import { EscrowInfo, EscrowStatus } from '@/types/payment';
import { enhancedEscrowABI } from '../contracts/EnhancedEscrow';
import { PAYMENT_CONFIG } from '@/config/payment';
import { sepolia } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export const getEscrowInfo = async (escrowId: number): Promise<EscrowInfo> => {
  const escrowAddress = (PAYMENT_CONFIG.ESCROW_CONTRACT_ADDRESS as Record<number, string>)[sepolia.id];

  const escrow = await publicClient.readContract({
    address: escrowAddress as `0x${string}`,
    abi: enhancedEscrowABI,
    functionName: 'escrows',
    args: [BigInt(escrowId)],
    authorizationList: [],
  });

  // Map contract status (number) to frontend enum
  const statusMap: Record<number, EscrowStatus> = {
    0: EscrowStatus.CREATED,
    1: EscrowStatus.FUNDED,
    2: EscrowStatus.RELEASED,
    3: EscrowStatus.REFUNDED,
    4: EscrowStatus.DISPUTE,
  };

  return {
    escrowContractAddress: escrowAddress,
    arbiter: escrow[16], // appointedArbitrator is at index 16
    status: statusMap[Number(escrow[11])] || EscrowStatus.CREATED, // status is at index 11
    disputeResolver: 'Not implemented',
  };
};
