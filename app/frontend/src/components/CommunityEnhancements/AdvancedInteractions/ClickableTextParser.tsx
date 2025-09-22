/**
 * Clickable Text Parser Component
 * Automatically detects and makes ENS/SNS names clickable in text content
 */

import React, { useMemo } from 'react';
import ClickableNameLink from './ClickableNameLink';
import { ResolvedName } from '../../../services/ensService';

export interface ClickableTextParserProps {
  text: string;
  className?: string;
  onNameClick?: (resolvedName: ResolvedName) => void;
  showMiniProfiles?: boolean;
  preserveWhitespace?: boolean;
}

interface TextSegment {
  type: 'text' | 'ens' | 'sns' | 'address';
  content: string;
  key: string;
}

const ClickableTextParser: React.FC<ClickableTextParserProps> = ({
  text,
  className = '',
  onNameClick,
  showMiniProfiles = true,
  preserveWhitespace = false,
}) => {
  // Parse text and identify clickable names
  const segments = useMemo(() => {
    if (!text || text.length === 0) {
      return [];
    }

    const segments: TextSegment[] = [];
    
    // Regular expressions for different name types
    const ensRegex = /\b[a-zA-Z0-9-]+\.eth\b/g;
    const snsRegex = /\b[a-zA-Z0-9-]+\.sol\b/g;
    const addressRegex = /\b0x[a-fA-F0-9]{40}\b/g;
    
    // Combine all patterns
    const combinedRegex = /(\b[a-zA-Z0-9-]+\.eth\b|\b[a-zA-Z0-9-]+\.sol\b|\b0x[a-fA-F0-9]{40}\b)/g;
    
    let lastIndex = 0;
    let match;
    let segmentIndex = 0;

    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const textContent = text.slice(lastIndex, match.index);
        if (textContent.length > 0) {
          segments.push({
            type: 'text',
            content: textContent,
            key: `text-${segmentIndex++}`,
          });
        }
      }

      // Determine the type of the matched name
      const matchedText = match[0];
      let type: 'ens' | 'sns' | 'address' = 'address';
      
      if (ensRegex.test(matchedText)) {
        type = 'ens';
      } else if (snsRegex.test(matchedText)) {
        type = 'sns';
      }

      // Add the clickable name segment
      segments.push({
        type,
        content: matchedText,
        key: `${type}-${segmentIndex++}`,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText.length > 0) {
        segments.push({
          type: 'text',
          content: remainingText,
          key: `text-${segmentIndex++}`,
        });
      }
    }

    // If no matches found, return the entire text as a single segment
    if (segments.length === 0) {
      segments.push({
        type: 'text',
        content: text,
        key: 'text-0',
      });
    }

    return segments;
  }, [text]);

  // Render segments
  const renderSegments = () => {
    return segments.map((segment) => {
      if (segment.type === 'text') {
        return (
          <span key={segment.key} className="ce-text-segment">
            {preserveWhitespace ? segment.content : segment.content.trim()}
          </span>
        );
      }

      return (
        <ClickableNameLink
          key={segment.key}
          name={segment.content}
          showMiniProfile={showMiniProfiles}
          onNameClick={onNameClick}
          className="ce-parsed-name"
        />
      );
    });
  };

  return (
    <span className={`ce-clickable-text-parser ${className}`}>
      {renderSegments()}
      
      <style jsx>{`
        .ce-clickable-text-parser {
          display: inline;
          word-break: break-word;
        }
        
        .ce-text-segment {
          display: inline;
        }
        
        .ce-parsed-name {
          display: inline;
        }
        
        /* Preserve whitespace if requested */
        ${preserveWhitespace ? `
          .ce-clickable-text-parser {
            white-space: pre-wrap;
          }
        ` : ''}
      `}</style>
    </span>
  );
};

export default ClickableTextParser;