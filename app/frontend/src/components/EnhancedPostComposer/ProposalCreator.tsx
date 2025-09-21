import React, { useState } from 'react';
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

  const updateProposal = (newTitle: string, newDescription: string, newType: typeof type) => {
    onProposalChange({
      title: newTitle,
      description: newDescription,
      type: newType,
      votingPeriod: 7,
      quorum: 10,
      threshold: 50
    });
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
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
      />
      
      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          updateProposal(title, e.target.value, type);
        }}
        placeholder="Describe your proposal..."
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
      />
      
      <select
        value={type}
        onChange={(e) => {
          const newType = e.target.value as typeof type;
          setType(newType);
          updateProposal(title, description, newType);
        }}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
      >
        <option value="governance">Governance</option>
        <option value="funding">Funding</option>
        <option value="parameter">Parameter Change</option>
        <option value="upgrade">Upgrade</option>
      </select>
    </div>
  );
};