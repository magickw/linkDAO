import React, { useState } from 'react';
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

  const updatePoll = (q: string, opts: string[]) => {
    onPollChange({
      question: q,
      options: opts.map((text, index) => ({
        id: `option-${index}`,
        text,
        votes: 0,
        tokenVotes: 0
      })),
      allowMultiple: false,
      tokenWeighted: false
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        type="text"
        value={question}
        onChange={handleQuestionChange}
        placeholder="Ask a question..."
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
      />
      
      {options.map((option, index) => (
        <div key={index} className="flex items-center space-x-2">
          <input
            type="text"
            value={option}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            placeholder={`Option ${index + 1}`}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
          {options.length > 2 && (
            <button
              onClick={() => removeOption(index)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            >
              ×
            </button>
          )}
        </div>
      ))}
      
      <button
        onClick={addOption}
        className="text-blue-500 hover:text-blue-600 text-sm font-medium"
      >
        + Add option
      </button>
    </div>
  );
};