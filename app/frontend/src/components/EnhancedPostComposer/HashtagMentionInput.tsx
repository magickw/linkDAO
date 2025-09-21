import React, { useState } from 'react';

interface HashtagMentionInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onHashtagsChange: (hashtags: string[]) => void;
  onMentionsChange: (mentions: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const HashtagMentionInput: React.FC<HashtagMentionInputProps> = ({
  value,
  onChange,
  onHashtagsChange,
  onMentionsChange,
  placeholder = '',
  disabled = false,
  className = ''
}) => {
  const [input, setInput] = useState(value || '');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInput(newValue);
    if (onChange) {
      onChange(newValue);
    }

    // Extract hashtags and mentions
    const hashtags = newValue.match(/#\w+/g)?.map(tag => tag.slice(1)) || [];
    const mentions = newValue.match(/@\w+/g)?.map(mention => mention.slice(1)) || [];

    onHashtagsChange(hashtags);
    onMentionsChange(mentions);
  };

  return (
    <input
      type="text"
      value={value !== undefined ? value : input}
      onChange={handleInputChange}
      placeholder={placeholder || "Add hashtags (#) and mentions (@)"}
      disabled={disabled}
      className={`
        w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
        placeholder-gray-500 dark:placeholder-gray-400
        focus:ring-2 focus:ring-blue-500 focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    />
  );
};