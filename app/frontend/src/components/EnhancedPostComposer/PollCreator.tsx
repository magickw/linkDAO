import React, { useState, useEffect } from 'react';
import { PollData } from '@/types/enhancedPost';

interface PollCreatorProps {
  poll?: PollData;
  onPollChange: (poll: PollData) => void;
  disabled?: boolean;
  className?: string;
}

export const PollCreator: React.FC<PollCreatorProps> = ({
  poll,
  onPollChange,
  disabled = false,
  className = ''
}) => {
  const [question, setQuestion] = useState(poll?.question || '');
  const [options, setOptions] = useState(poll?.options?.map(opt => opt.text) || ['', '']);
  const [allowMultiple, setAllowMultiple] = useState(poll?.allowMultiple || false);
  const [tokenWeighted, setTokenWeighted] = useState(poll?.tokenWeighted || false);
  const [minTokens, setMinTokens] = useState(poll?.minTokens || 0);
  const [expiresAt, setExpiresAt] = useState(
    poll?.endDate ? poll.endDate.toISOString().slice(0, 16) : ''
  );

  // Sync state with prop changes to prevent stale data
  useEffect(() => {
    if (poll) {
      setQuestion(poll.question || '');
      setOptions(poll.options?.map(opt => opt.text) || ['', '']);
      setAllowMultiple(poll.allowMultiple || false);
      setTokenWeighted(poll.tokenWeighted || false);
      setMinTokens(poll.minTokens || 0);
      setExpiresAt(poll.endDate ? poll.endDate.toISOString().slice(0, 16) : '');
    }
  }, [poll]);

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
    updatePoll(e.target.value, options);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    updatePoll(question, newOptions);
  };

  const addOption = () => {
    const newOptions = [...options, ''];
    setOptions(newOptions);
    updatePoll(question, newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    updatePoll(question, newOptions);
  };

  const handleAllowMultipleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAllowMultiple(e.target.checked);
    updatePoll(question, options);
  };

  const handleTokenWeightedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTokenWeighted(e.target.checked);
    updatePoll(question, options);
  };

  const handleMinTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    setMinTokens(value);
    updatePoll(question, options);
  };

  const handleExpiresAtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiresAt(e.target.value);
    updatePoll(question, options);
  };

  const updatePoll = (q: string, opts: string[]) => {
    onPollChange({
      question: q,
      options: opts.map((text, index) => ({
        id: `option-${index}`,
        text,
        votes: 0,
        tokenVotes: 0
      })),
      allowMultiple,
      tokenWeighted,
      minTokens,
      endDate: expiresAt ? new Date(expiresAt) : undefined
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Poll Question */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Poll Question
        </label>
        <input
          type="text"
          value={question}
          onChange={handleQuestionChange}
          placeholder="Ask a question..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          disabled={disabled}
        />
      </div>

      {/* Poll Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Options
        </label>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={disabled}
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(index)}
                  disabled={disabled}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        
        {options.length < 10 && (
          <button
            onClick={addOption}
            disabled={disabled}
            className="mt-2 text-blue-500 hover:text-blue-600 text-sm font-medium disabled:opacity-50"
          >
            + Add option
          </button>
        )}
      </div>

      {/* Poll Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Multiple Choice */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allowMultiple"
            checked={allowMultiple}
            onChange={handleAllowMultipleChange}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="allowMultiple" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Allow multiple selections
          </label>
        </div>

        {/* Token Weighted */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="tokenWeighted"
            checked={tokenWeighted}
            onChange={handleTokenWeightedChange}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="tokenWeighted" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Token-weighted voting
          </label>
        </div>
      </div>

      {/* Token Requirements */}
      {tokenWeighted && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Minimum Tokens Required
          </label>
          <input
            type="number"
            min="0"
            value={minTokens}
            onChange={handleMinTokensChange}
            className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            disabled={disabled}
          />
        </div>
      )}

      {/* Expiration Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Expiration Date (Optional)
        </label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={handleExpiresAtChange}
          min={new Date().toISOString().slice(0, 16)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          disabled={disabled}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Leave empty for polls that never expire
        </p>
      </div>
    </div>
  );
};