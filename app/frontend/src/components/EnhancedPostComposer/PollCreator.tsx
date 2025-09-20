import React, { useState, useCallback, useEffect } from 'react';
import { PollData, PollOption } from '../../types/enhancedPost';

interface PollCreatorProps {
  poll: PollData | undefined;
  onPollChange: (poll: PollData | undefined) => void;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_POLL: PollData = {
  question: '',
  options: [
    { id: 'option_1', text: '', votes: 0, tokenVotes: 0 },
    { id: 'option_2', text: '', votes: 0, tokenVotes: 0 }
  ],
  allowMultiple: false,
  tokenWeighted: true,
  minTokens: 1
};

export default function PollCreator({
  poll,
  onPollChange,
  disabled = false,
  className = ''
}: PollCreatorProps) {
  const [localPoll, setLocalPoll] = useState<PollData>(poll || DEFAULT_POLL);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync with parent
  useEffect(() => {
    if (poll) {
      setLocalPoll(poll);
    }
  }, [poll]);

  // Generate unique option ID
  const generateOptionId = () => `option_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Validate poll data
  const validatePoll = useCallback((pollData: PollData): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!pollData.question.trim()) {
      newErrors.question = 'Poll question is required';
    }

    if (pollData.options.length < 2) {
      newErrors.options = 'At least 2 options are required';
    }

    const validOptions = pollData.options.filter(opt => opt.text.trim());
    if (validOptions.length < 2) {
      newErrors.options = 'At least 2 options must have text';
    }

    if (pollData.tokenWeighted && pollData.minTokens && pollData.minTokens < 1) {
      newErrors.minTokens = 'Minimum tokens must be at least 1';
    }

    if (pollData.endDate && pollData.endDate <= new Date()) {
      newErrors.endDate = 'End date must be in the future';
    }

    return newErrors;
  }, []);

  // Update poll and notify parent
  const updatePoll = useCallback((updates: Partial<PollData>) => {
    const updatedPoll = { ...localPoll, ...updates };
    setLocalPoll(updatedPoll);
    
    const validationErrors = validatePoll(updatedPoll);
    setErrors(validationErrors);
    
    // Only notify parent if poll is valid or if clearing
    if (Object.keys(validationErrors).length === 0 || !updates) {
      onPollChange(updatedPoll);
    }
  }, [localPoll, validatePoll, onPollChange]);

  // Handle question change
  const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updatePoll({ question: e.target.value });
  }, [updatePoll]);

  // Handle option text change
  const handleOptionChange = useCallback((optionId: string, text: string) => {
    const updatedOptions = localPoll.options.map(opt =>
      opt.id === optionId ? { ...opt, text } : opt
    );
    updatePoll({ options: updatedOptions });
  }, [localPoll.options, updatePoll]);

  // Add new option
  const addOption = useCallback(() => {
    if (localPoll.options.length >= 10) return; // Max 10 options
    
    const newOption: PollOption = {
      id: generateOptionId(),
      text: '',
      votes: 0,
      tokenVotes: 0
    };
    
    updatePoll({ options: [...localPoll.options, newOption] });
  }, [localPoll.options, updatePoll]);

  // Remove option
  const removeOption = useCallback((optionId: string) => {
    if (localPoll.options.length <= 2) return; // Keep at least 2 options
    
    const updatedOptions = localPoll.options.filter(opt => opt.id !== optionId);
    updatePoll({ options: updatedOptions });
  }, [localPoll.options, updatePoll]);

  // Handle settings change
  const handleSettingChange = useCallback((setting: keyof PollData, value: any) => {
    updatePoll({ [setting]: value });
  }, [updatePoll]);

  // Clear poll
  const clearPoll = useCallback(() => {
    setLocalPoll(DEFAULT_POLL);
    setErrors({});
    onPollChange(undefined);
  }, [onPollChange]);

  // Format date for input
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
  };

  // Parse date from input
  const parseDateFromInput = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    return new Date(dateString);
  };

  return (
    <div className={`space-y-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📊</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Poll
          </h3>
        </div>
        <button
          onClick={clearPoll}
          className="text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200"
          disabled={disabled}
        >
          Clear Poll
        </button>
      </div>

      {/* Poll Question */}
      <div>
        <label htmlFor="poll-question" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Poll Question *
        </label>
        <input
          id="poll-question"
          type="text"
          value={localPoll.question}
          onChange={handleQuestionChange}
          placeholder="What would you like to ask the community?"
          className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
            errors.question ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
          }`}
          disabled={disabled}
        />
        {errors.question && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.question}</p>
        )}
      </div>

      {/* Poll Options */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Options *
          </label>
          <button
            onClick={addOption}
            disabled={disabled || localPoll.options.length >= 10}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            + Add Option
          </button>
        </div>
        
        <div className="space-y-3">
          {localPoll.options.map((option, index) => (
            <div key={option.id} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {String.fromCharCode(65 + index)}
                </span>
              </div>
              <input
                type="text"
                value={option.text}
                onChange={(e) => handleOptionChange(option.id, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                disabled={disabled}
              />
              {localPoll.options.length > 2 && (
                <button
                  onClick={() => removeOption(option.id)}
                  disabled={disabled}
                  className="flex-shrink-0 w-8 h-8 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        
        {errors.options && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.options}</p>
        )}
      </div>

      {/* Poll Settings */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Poll Settings</h4>
        
        {/* Multiple Choice */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Allow Multiple Choices
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Let users select more than one option
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSettingChange('allowMultiple', !localPoll.allowMultiple)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              localPoll.allowMultiple ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                localPoll.allowMultiple ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Token Weighted */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Token-Weighted Voting
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Votes are weighted by token holdings
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSettingChange('tokenWeighted', !localPoll.tokenWeighted)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              localPoll.tokenWeighted ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                localPoll.tokenWeighted ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Minimum Tokens */}
        {localPoll.tokenWeighted && (
          <div>
            <label htmlFor="min-tokens" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Tokens Required
            </label>
            <input
              id="min-tokens"
              type="number"
              min="1"
              max="1000000"
              value={localPoll.minTokens || 1}
              onChange={(e) => handleSettingChange('minTokens', parseInt(e.target.value) || 1)}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
                errors.minTokens ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={disabled}
            />
            {errors.minTokens && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.minTokens}</p>
            )}
          </div>
        )}

        {/* End Date */}
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Poll End Date (Optional)
          </label>
          <input
            id="end-date"
            type="datetime-local"
            value={formatDateForInput(localPoll.endDate)}
            onChange={(e) => handleSettingChange('endDate', parseDateFromInput(e.target.value))}
            min={new Date().toISOString().slice(0, 16)}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
              errors.endDate ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
            disabled={disabled}
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Leave empty for polls that never expire
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preview</h4>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h5 className="font-medium text-gray-900 dark:text-white mb-3">
            {localPoll.question || 'Your poll question will appear here'}
          </h5>
          <div className="space-y-2">
            {localPoll.options.map((option, index) => (
              <div key={option.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex-shrink-0">
                  {localPoll.allowMultiple ? (
                    <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                  )}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {option.text || `Option ${index + 1}`}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              {localPoll.tokenWeighted && (
                <span>🪙 Token-weighted</span>
              )}
              {localPoll.allowMultiple && (
                <span>☑️ Multiple choice</span>
              )}
            </div>
            {localPoll.endDate && (
              <span>Ends {localPoll.endDate.toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}