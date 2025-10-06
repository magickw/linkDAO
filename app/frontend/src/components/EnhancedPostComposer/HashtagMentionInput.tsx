// Mock Hashtag Mention Input for testing
import React, { useEffect } from 'react';

interface HashtagMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onHashtagsChange: (hashtags: string[]) => void;
  onMentionsChange: (mentions: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const HashtagMentionInput: React.FC<HashtagMentionInputProps> = ({
  value,
  onChange,
  onHashtagsChange,
  onMentionsChange,
  disabled,
  placeholder
}) => {
  useEffect(() => {
    // Extract hashtags and mentions from content
    const hashtags = (value.match(/#\w+/g) || []).map(tag => tag.slice(1));
    const mentions = (value.match(/@\w+/g) || []).map(mention => mention.slice(1));
    
    onHashtagsChange(hashtags);
    onMentionsChange(mentions);
  }, [value, onHashtagsChange, onMentionsChange]);

  return null; // This is a utility component that doesn't render anything
};