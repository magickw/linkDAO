import { useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { governanceABI } from '@/lib/abi/GovernanceABI';

// Replace with actual contract address after deployment
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

export function useGovernance() {
  // Get proposal by ID
  const useProposal = (proposalId: bigint | undefined) => {
    return useContractRead({
      address: CONTRACT_ADDRESS,
      abi: governanceABI,
      functionName: 'proposals',
      args: [proposalId],
      enabled: !!proposalId,
    });
  };

  // Get proposal state
  const useProposalState = (proposalId: bigint | undefined) => {
    return useContractRead({
      address: CONTRACT_ADDRESS,
      abi: governanceABI,
      functionName: 'state',
      args: [proposalId],
      enabled: !!proposalId,
    });
  };

  // Prepare propose transaction
  const { config: proposeConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: governanceABI,
    functionName: 'propose',
    args: [
      '', // title
      '', // description
      [], // targets
      [], // values
      [], // signatures
      [], // calldatas
    ],
  });

  // Create proposal
  const {
    data: proposeData,
    isLoading: isProposing,
    isSuccess: isProposed,
    write: propose,
  } = useContractWrite(proposeConfig);

  // Prepare vote transaction
  const { config: voteConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: governanceABI,
    functionName: 'castVote',
    args: [
      0n, // proposalId
      false, // support
      '', // reason
    ],
  });

  // Cast vote
  const {
    data: voteData,
    isLoading: isVoting,
    isSuccess: isVoted,
    write: castVote,
  } = useContractWrite(voteConfig);

  // Prepare execute transaction
  const { config: executeConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: governanceABI,
    functionName: 'execute',
    args: [0n], // proposalId
  });

  // Execute proposal
  const {
    data: executeData,
    isLoading: isExecuting,
    isSuccess: isExecuted,
    write: execute,
  } = useContractWrite(executeConfig);

  // Get voting power
  const useVotingPower = (address: `0x${string}` | undefined) => {
    return useContractRead({
      address: CONTRACT_ADDRESS,
      abi: governanceABI,
      functionName: 'votingPower',
      args: [address],
      enabled: !!address,
    });
  };

  // Get proposal count
  const useProposalCount = () => {
    return useContractRead({
      address: CONTRACT_ADDRESS,
      abi: governanceABI,
      functionName: 'proposalCount',
    });
  };

  return {
    useProposal,
    useProposalState,
    propose,
    isProposing,
    isProposed,
    proposeData,
    castVote,
    isVoting,
    isVoted,
    voteData,
    execute,
    isExecuting,
    isExecuted,
    executeData,
    useVotingPower,
    useProposalCount,
  };
}