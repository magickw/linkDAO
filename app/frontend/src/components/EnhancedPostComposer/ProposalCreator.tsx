import React, { useState, useCallback, useEffect } from 'react';
import { ProposalData } from '../../types/enhancedPost';

interface ProposalCreatorProps {
  proposal: ProposalData | undefined;
  onProposalChange: (proposal: ProposalData | undefined) => void;
  disabled?: boolean;
  className?: string;
}

// Proposal templates
const PROPOSAL_TEMPLATES = {
  governance: {
    title: 'Governance Proposal: [Title]',
    description: `## Summary
Brief description of the proposal.

## Motivation
Why is this proposal necessary?

## Specification
Detailed technical specification of the changes.

## Implementation
How will this be implemented?

## Security Considerations
What are the security implications?

## Voting
- **For**: Support this proposal
- **Against**: Oppose this proposal
- **Abstain**: No preference`,
    type: 'governance' as const,
    votingPeriod: 7,
    quorum: 10,
    threshold: 50
  },
  funding: {
    title: 'Funding Request: [Project Name]',
    description: `## Project Overview
Description of the project requesting funding.

## Team
Who is working on this project?

## Budget Breakdown
- Development: [Amount]
- Marketing: [Amount]
- Operations: [Amount]
- Total: [Total Amount]

## Timeline
- Phase 1: [Timeline]
- Phase 2: [Timeline]
- Completion: [Timeline]

## Expected Outcomes
What will be delivered?

## Voting
- **For**: Approve funding
- **Against**: Reject funding
- **Abstain**: No preference`,
    type: 'funding' as const,
    votingPeriod: 14,
    quorum: 15,
    threshold: 60
  },
  parameter: {
    title: 'Parameter Change: [Parameter Name]',
    description: `## Current Value
Current parameter value: [Current Value]

## Proposed Value
New parameter value: [New Value]

## Rationale
Why should this parameter be changed?

## Impact Analysis
What are the expected effects of this change?

## Risk Assessment
What are the potential risks?

## Voting
- **For**: Approve parameter change
- **Against**: Keep current value
- **Abstain**: No preference`,
    type: 'parameter' as const,
    votingPeriod: 5,
    quorum: 5,
    threshold: 50
  },
  upgrade: {
    title: 'Protocol Upgrade: [Upgrade Name]',
    description: `## Upgrade Overview
Description of the protocol upgrade.

## Technical Changes
- Change 1: [Description]
- Change 2: [Description]
- Change 3: [Description]

## Benefits
What improvements does this upgrade provide?

## Risks
What are the potential risks and mitigation strategies?

## Testing
How has this upgrade been tested?

## Migration Plan
How will the upgrade be deployed?

## Voting
- **For**: Approve upgrade
- **Against**: Reject upgrade
- **Abstain**: No preference`,
    type: 'upgrade' as const,
    votingPeriod: 10,
    quorum: 20,
    threshold: 66
  }
};

const DEFAULT_PROPOSAL: ProposalData = {
  title: '',
  description: '',
  type: 'governance',
  votingPeriod: 7,
  quorum: 10,
  threshold: 50
};

export default function ProposalCreator({
  proposal,
  onProposalChange,
  disabled = false,
  className = ''
}: ProposalCreatorProps) {
  const [localProposal, setLocalProposal] = useState<ProposalData>(proposal || DEFAULT_PROPOSAL);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof PROPOSAL_TEMPLATES | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Sync with parent
  useEffect(() => {
    if (proposal) {
      setLocalProposal(proposal);
    }
  }, [proposal]);

  // Validate proposal data
  const validateProposal = useCallback((proposalData: ProposalData): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!proposalData.title.trim()) {
      newErrors.title = 'Proposal title is required';
    } else if (proposalData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    } else if (proposalData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!proposalData.description.trim()) {
      newErrors.description = 'Proposal description is required';
    } else if (proposalData.description.length < 100) {
      newErrors.description = 'Description must be at least 100 characters';
    }

    if (proposalData.votingPeriod < 1) {
      newErrors.votingPeriod = 'Voting period must be at least 1 day';
    } else if (proposalData.votingPeriod > 30) {
      newErrors.votingPeriod = 'Voting period cannot exceed 30 days';
    }

    if (proposalData.quorum < 1) {
      newErrors.quorum = 'Quorum must be at least 1%';
    } else if (proposalData.quorum > 100) {
      newErrors.quorum = 'Quorum cannot exceed 100%';
    }

    if (proposalData.threshold < 1) {
      newErrors.threshold = 'Threshold must be at least 1%';
    } else if (proposalData.threshold > 100) {
      newErrors.threshold = 'Threshold cannot exceed 100%';
    }

    if (proposalData.executionDelay !== undefined && proposalData.executionDelay < 0) {
      newErrors.executionDelay = 'Execution delay cannot be negative';
    }

    return newErrors;
  }, []);

  // Update proposal and notify parent
  const updateProposal = useCallback((updates: Partial<ProposalData>) => {
    const updatedProposal = { ...localProposal, ...updates };
    setLocalProposal(updatedProposal);
    
    const validationErrors = validateProposal(updatedProposal);
    setErrors(validationErrors);
    
    // Only notify parent if proposal is valid or if clearing
    if (Object.keys(validationErrors).length === 0 || !updates) {
      onProposalChange(updatedProposal);
    }
  }, [localProposal, validateProposal, onProposalChange]);

  // Apply template
  const applyTemplate = useCallback((templateKey: keyof typeof PROPOSAL_TEMPLATES) => {
    const template = PROPOSAL_TEMPLATES[templateKey];
    updateProposal(template);
    setSelectedTemplate(templateKey);
  }, [updateProposal]);

  // Handle field changes
  const handleFieldChange = useCallback((field: keyof ProposalData, value: any) => {
    updateProposal({ [field]: value });
  }, [updateProposal]);

  // Clear proposal
  const clearProposal = useCallback(() => {
    setLocalProposal(DEFAULT_PROPOSAL);
    setSelectedTemplate('');
    setErrors({});
    onProposalChange(undefined);
  }, [onProposalChange]);

  // Render markdown preview (simplified)
  const renderMarkdownPreview = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('## ')) {
          return <h3 key={index} className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={index} className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2">{line.slice(2)}</h2>;
        }
        if (line.startsWith('- ')) {
          return <li key={index} className="text-gray-700 dark:text-gray-300 ml-4">{line.slice(2)}</li>;
        }
        if (line.trim() === '') {
          return <br key={index} />;
        }
        return <p key={index} className="text-gray-700 dark:text-gray-300 mb-2">{line}</p>;
      });
  };

  return (
    <div className={`space-y-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🏛️</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Governance Proposal
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200"
            disabled={disabled}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={clearProposal}
            className="text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200"
            disabled={disabled}
          >
            Clear
          </button>
        </div>
      </div>

      {!showPreview ? (
        <>
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Use Template (Optional)
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => e.target.value && applyTemplate(e.target.value as keyof typeof PROPOSAL_TEMPLATES)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              disabled={disabled}
            >
              <option value="">Select a template...</option>
              <option value="governance">Governance Proposal</option>
              <option value="funding">Funding Request</option>
              <option value="parameter">Parameter Change</option>
              <option value="upgrade">Protocol Upgrade</option>
            </select>
          </div>

          {/* Proposal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Proposal Type *
            </label>
            <select
              value={localProposal.type}
              onChange={(e) => handleFieldChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              disabled={disabled}
            >
              <option value="governance">Governance</option>
              <option value="funding">Funding</option>
              <option value="parameter">Parameter Change</option>
              <option value="upgrade">Protocol Upgrade</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="proposal-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Proposal Title *
            </label>
            <input
              id="proposal-title"
              type="text"
              value={localProposal.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Enter a clear, descriptive title for your proposal"
              className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                errors.title ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={disabled}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {localProposal.title.length}/200 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="proposal-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Proposal Description *
            </label>
            <textarea
              id="proposal-description"
              value={localProposal.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Provide a detailed description of your proposal. You can use Markdown formatting."
              rows={12}
              className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 font-mono text-sm ${
                errors.description ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={disabled}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {localProposal.description.length} characters • Markdown supported
            </p>
          </div>

          {/* Voting Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Voting Period */}
            <div>
              <label htmlFor="voting-period" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Voting Period (days) *
              </label>
              <input
                id="voting-period"
                type="number"
                min="1"
                max="30"
                value={localProposal.votingPeriod}
                onChange={(e) => handleFieldChange('votingPeriod', parseInt(e.target.value) || 1)}
                className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                  errors.votingPeriod ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={disabled}
              />
              {errors.votingPeriod && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.votingPeriod}</p>
              )}
            </div>

            {/* Quorum */}
            <div>
              <label htmlFor="quorum" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quorum (%) *
              </label>
              <input
                id="quorum"
                type="number"
                min="1"
                max="100"
                value={localProposal.quorum}
                onChange={(e) => handleFieldChange('quorum', parseInt(e.target.value) || 1)}
                className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                  errors.quorum ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={disabled}
              />
              {errors.quorum && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quorum}</p>
              )}
            </div>

            {/* Threshold */}
            <div>
              <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Approval Threshold (%) *
              </label>
              <input
                id="threshold"
                type="number"
                min="1"
                max="100"
                value={localProposal.threshold}
                onChange={(e) => handleFieldChange('threshold', parseInt(e.target.value) || 1)}
                className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                  errors.threshold ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={disabled}
              />
              {errors.threshold && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.threshold}</p>
              )}
            </div>

            {/* Execution Delay */}
            <div>
              <label htmlFor="execution-delay" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Execution Delay (days)
              </label>
              <input
                id="execution-delay"
                type="number"
                min="0"
                max="30"
                value={localProposal.executionDelay || 0}
                onChange={(e) => handleFieldChange('executionDelay', parseInt(e.target.value) || undefined)}
                className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                  errors.executionDelay ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={disabled}
              />
              {errors.executionDelay && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.executionDelay}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Optional delay before execution after approval
              </p>
            </div>
          </div>
        </>
      ) : (
        /* Preview Mode */
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full">
                {localProposal.type.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Voting Period: {localProposal.votingPeriod} days
              </span>
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {localProposal.title || 'Proposal Title'}
          </h2>
          
          <div className="prose dark:prose-invert max-w-none">
            {localProposal.description ? (
              renderMarkdownPreview(localProposal.description)
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                Proposal description will appear here
              </p>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Quorum:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {localProposal.quorum}%
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Threshold:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {localProposal.threshold}%
                </span>
              </div>
              {localProposal.executionDelay && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Execution Delay:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {localProposal.executionDelay} days
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}