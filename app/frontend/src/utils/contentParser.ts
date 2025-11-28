import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import HTMLReactParser from 'html-react-parser';
import sanitizeHtml from 'sanitize-html';

// Sanitize HTML configuration
export const sanitizeConfig = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'strong', 'em', 'u', 'i', 'b',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'img',
    'div', 'span'
  ],
  allowedAttributes: {
    '*': ['className'],
    'a': ['href', 'target', 'rel'],
    'img': ['src', 'alt', 'width', 'height']
  }
};

// Custom markdown components with Tailwind styling
export const markdownComponents = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-3 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-gray-700 dark:text-gray-300 leading-relaxed my-2">{children}</p>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 my-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="text-gray-700 dark:text-gray-300">{children}</li>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-2 bg-gray-50 dark:bg-gray-800 rounded-r">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }: { inline?: boolean; children: React.ReactNode }) => (
    inline ? (
      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
        {children}
      </code>
    ) : (
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-2">
        <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{children}</code>
      </pre>
    )
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <img 
      src={src}
      alt={alt || ''}
      className="rounded-lg max-w-full h-auto my-2"
      loading="lazy"
    />
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
  )
};

/**
 * Process content based on type (HTML, markdown, or plain text)
 * @param content - The content to process
 * @param contentType - The type of content ('html', 'markdown', or 'text')
 * @returns Processed React node
 */
export const processContent = (content: string, contentType: string = 'text'): React.ReactNode => {
  if (!content) return null;

  switch (contentType) {
    case 'html':
      const sanitizedHtml = sanitizeHtml(content, sanitizeConfig);
      return HTMLReactParser(sanitizedHtml);
    case 'markdown':
      return <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{content}</ReactMarkdown>;
    default:
      // Auto-detect if content contains HTML tags
      if (/<[^>]+>/.test(content)) {
        const sanitizedHtml = sanitizeHtml(content, sanitizeConfig);
        return HTMLReactParser(sanitizedHtml);
      }
      // Treat as plain text with markdown support
      return <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{content}</ReactMarkdown>;
  }
};

/**
 * Check if content should be truncated
 * @param content - The content to check
 * @param maxLength - Maximum length before truncation
 * @param isExpanded - Whether content is currently expanded
 * @returns Whether content should be truncated
 */
export const shouldTruncateContent = (content: string, maxLength: number = 280, isExpanded: boolean = false): boolean => {
  return content.length > maxLength && !isExpanded;
};

/**
 * Get truncated content
 * @param content - The content to truncate
 * @param maxLength - Maximum length before truncation
 * @param isExpanded - Whether content is currently expanded
 * @returns Truncated content or full content
 */
export const getTruncatedContent = (content: string, maxLength: number = 280, isExpanded: boolean = false): string => {
  if (shouldTruncateContent(content, maxLength, isExpanded)) {
    return content.slice(0, maxLength) + '...';
  }
  return content;
};

/**
 * Format timestamp to relative time
 * @param timestamp - The timestamp to format
 * @returns Formatted relative time string
 */
export const formatTimestamp = (timestamp: Date | string): string => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};