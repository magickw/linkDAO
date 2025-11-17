import React, { useState, useEffect } from 'react';
import { ProposalData } from '@/types/enhancedPost';

interface ProposalCreatorProps {
  proposal?: ProposalData;
  onProposalChange: (proposal: ProposalData) => void;
  disabled?: boolean;
  className?: string;
}

export const ProposalCreator: React.FC<ProposalCreatorProps> = ({
  proposal,
  onProposalChange,
  disabled = false,
  className = ''
}) => {
  const [title, setTitle] = useState(proposal?.title || '');
  const [description, setDescription] = useState(proposal?.description || '');
  const [type, setType] = useState<'governance' | 'funding' | 'parameter' | 'upgrade'>(proposal?.type || 'governance');

  // Sync state with prop changes to prevent stale data
  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title || '');
      setDescription(proposal.description || '');
      setType(proposal.type || 'governance');
    }
  }, [proposal]);

  const updateProposal = (newTitle: string, newDescription: string, newType: typeof type) => {
    // Use proposal-specific parameters based on type, not hardcoded values
    const proposalParams = getProposalParameters(newType, proposal);
    
    onProposalChange({
      title: newTitle,
      description: newDescription,
      type: newType,
      ...proposalParams
    });
  };

  // Get appropriate parameters based on proposal type
  const getProposalParameters = (proposalType: typeof type, existingProposal?: ProposalData) => {
    if (existingProposal) {
      // Preserve existing parameters if available
      return {
        votingPeriod: existingProposal.votingPeriod ?? getDefaultVotingPeriod(proposalType),
        quorum: existingProposal.quorum ?? getDefaultQuorum(proposalType),
        threshold: existingProposal.threshold ?? getDefaultThreshold(proposalType)
      };
    }

    // Return type-specific defaults
    return {
      votingPeriod: getDefaultVotingPeriod(proposalType),
      quorum: getDefaultQuorum(proposalType),
      threshold: getDefaultThreshold(proposalType)
    };
  };

  const getDefaultVotingPeriod = (proposalType: typeof type): number => {
    switch (proposalType) {
      case 'governance': return 7;
      case 'funding': return 14;
      case 'parameter': return 5;
      case 'upgrade': return 21;
      default: return 7;
    }
  };

  const getDefaultQuorum = (proposalType: typeof type): number => {
    switch (proposalType) {
      case 'governance': return 10;
      case 'funding': return 15;
      case 'parameter': return 5;
      case 'upgrade': return 20;
      default: return 10;
    }
  };

  const getDefaultThreshold = (proposalType: typeof type): number => {
    switch (proposalType) {
      case 'governance': return 50;
      case 'funding': return 60;
      case 'parameter': return 40;
      case 'upgrade': return 70;
      default: return 50;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          updateProposal(e.target.value, description, type);
        }}
        placeholder="Proposal title..."
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />
      
      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          updateProposal(title, e.target.value, type);
        }}
        placeholder="Describe your proposal..."
        rows={4}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />
      
      <select
        value={type}
        onChange={(e) => {
          const newType = e.target.value as typeof type;
          setType(newType);
          updateProposal(title, description, newType);
        }}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <option value="governance">Governance</option>
        <option value="funding">Funding</option>
        <option value="parameter">Parameter Change</option>
        <option value="upgrade">Upgrade</option>
      </select>
    </div>
  );
};