import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import HTMLReactParser from 'html-react-parser';
import sanitizeHtml from 'sanitize-html';
import type { Components } from 'react-markdown';

// Sanitize HTML configuration
export const sanitizeConfig = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'strong', 'em', 'u', 'i', 'b', 's', 'del', 'ins', 'mark', 'sub', 'sup',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'img',
    'div', 'span',
    'iframe', // for YouTube embeds
    'hr', // horizontal rule
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td' // tables
  ],
  allowedAttributes: {
    '*': ['class', 'className', 'style', 'id', 'dir'],
    'a': ['href', 'target', 'rel', 'title'],
    'img': ['src', 'alt', 'width', 'height', 'class', 'loading', 'title'],
    'iframe': ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan']
  },
  allowedSchemes: ['http', 'https', 'data', 'ipfs'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowedStyles: {
    '*': {
      'color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i],
      'background-color': [/^#[0-9a-f]{3,6}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i, /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i],
      'font-size': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'font-weight': [/^(normal|bold|[1-9]00)$/],
      'font-style': [/^(normal|italic|oblique)$/],
      'text-decoration': [/^(none|underline|line-through)$/],
      'text-align': [/^(left|center|right|justify)$/],
      'line-height': [/^\d+(\.\d+)?(px|em|rem|%)?$/],
      'margin': [/^\d+(\.\d+)?(px|em|rem|%|auto)\s*(\d+(\.\d+)?(px|em|rem|%|auto)\s*){0,3}$/],
      'margin-top': [/^\d+(\.\d+)?(px|em|rem|%|auto)$/],
      'margin-bottom': [/^\d+(\.\d+)?(px|em|rem|%|auto)$/],
      'margin-left': [/^\d+(\.\d+)?(px|em|rem|%|auto)$/],
      'margin-right': [/^\d+(\.\d+)?(px|em|rem|%|auto)$/],
      'padding': [/^\d+(\.\d+)?(px|em|rem|%)\s*(\d+(\.\d+)?(px|em|rem|%)\s*){0,3}$/],
      'padding-top': [/^\d+(\.\d+)?(px|em|rem|%|auto)$/],
      'padding-bottom': [/^\d+(\.\d+)?(px|em|rem|%|auto)$/],
      'padding-left': [/^\d+(\.\d+)?(px|em|rem|%|auto)$/],
      'padding-right': [/^\d+(\.\d+)?(px|em|rem|%|auto)$/],
      'border': [/^\d+(\.\d+)?(px|em|rem)\s+(solid|dashed|dotted|double|none)\s+#[0-9a-f]{3,6}$/i],
      'border-radius': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'display': [/^(block|inline|inline-block|flex|none)$/],
      'text-align': [/^(left|center|right|justify)$/]
    }
  }
};

// Custom markdown components with Tailwind styling
export const markdownComponents: Components = {
  h1: ({ children }) =>
    React.createElement('h1', { className: 'text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2' }, children),
  h2: ({ children }) =>
    React.createElement('h2', { className: 'text-xl font-bold text-gray-900 dark:text-white mt-3 mb-2' }, children),
  h3: ({ children }) =>
    React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 dark:text-white mt-3 mb-1' }, children),
  p: ({ children }) =>
    React.createElement('p', { className: 'text-gray-700 dark:text-gray-300 leading-relaxed my-2 whitespace-pre-wrap' }, children),
  ul: ({ children }) =>
    React.createElement('ul', { className: 'list-disc list-inside text-gray-700 dark:text-gray-300 my-2 space-y-1' }, children),
  ol: ({ children }) =>
    React.createElement('ol', { className: 'list-decimal list-inside text-gray-700 dark:text-gray-300 my-2 space-y-1' }, children),
  li: ({ children }) =>
    React.createElement('li', { className: 'text-gray-700 dark:text-gray-300' }, children),
  blockquote: ({ children }) =>
    React.createElement('blockquote', { className: 'border-l-4 border-blue-500 pl-4 py-2 my-2 bg-gray-50 dark:bg-gray-800 rounded-r' }, children),
  code: ({ children, ...props }) => {
    // Check if we're inside a pre tag (block code) or not (inline code)
    const isInline = !props.className || !props.className.includes('language-');

    if (isInline) {
      return React.createElement('code', {
        className: 'bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200',
        ...props
      }, children);
    } else {
      // For block code, we wrap in a pre tag
      return React.createElement('pre', { className: 'bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-2' },
        React.createElement('code', {
          className: 'text-sm font-mono text-gray-800 dark:text-gray-200',
          ...props
        }, children)
      );
    }
  },
  a: ({ href, children, ...props }) =>
    React.createElement('a', {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline',
      ...props
    }, children),
  img: ({ src, alt, ...props }) =>
    React.createElement('img', {
      src,
      alt: alt || '',
      className: 'rounded-lg max-w-full h-auto my-2',
      loading: 'lazy',
      ...props
    }),
  strong: ({ children, ...props }) =>
    React.createElement('strong', { className: 'font-bold text-gray-900 dark:text-white', ...props }, children),
  em: ({ children, ...props }) =>
    React.createElement('em', { className: 'italic text-gray-700 dark:text-gray-300', ...props }, children)
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
      return React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], components: markdownComponents }, content);
    default:
      // Auto-detect if content contains HTML tags
      if (/<[^>]+>/.test(content)) {
        const sanitizedHtml = sanitizeHtml(content, sanitizeConfig);
        return HTMLReactParser(sanitizedHtml);
      }
      // Treat as plain text with markdown support
      return React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], components: markdownComponents }, content);
  }
};

/**
 * Truncate HTML content while preserving tag structure
 * @param html - The HTML content to truncate
 * @param maxLength - Maximum text length before truncation
 * @returns Truncated HTML with preserved structure
 */
export const truncateHTML = (html: string, maxLength: number): string => {
  if (!html || html.length <= maxLength) return html;

  // Check if content contains HTML tags
  if (!/<[^>]+>/.test(html)) {
    // Plain text - simple truncation
    return html.slice(0, maxLength) + '...';
  }

  // For browser environment - improved truncation that preserves HTML structure
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = html;

    let textLength = 0;
    let shouldTruncate = false;
    const openTags: string[] = [];

    const truncateNode = (node: Node): boolean => {
      if (shouldTruncate) {
        // Remove all nodes after truncation point
        node.remove();
        return true;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // Track opening tags for proper closing
        if (!['br', 'img', 'hr', 'input'].includes(tagName)) {
          openTags.push(tagName);
        }

        // Process children
        const childNodes = Array.from(node.childNodes);
        for (const child of childNodes) {
          if (truncateNode(child)) break;
        }

        // If we haven't truncated yet, pop the tag as we're closing it
        if (!shouldTruncate && !['br', 'img', 'hr', 'input'].includes(tagName)) {
          openTags.pop();
        }

        return shouldTruncate;
      } else if (node.nodeType === Node.TEXT_NODE) {
        const remaining = maxLength - textLength;

        if (node.textContent && node.textContent.length > remaining) {
          // Truncate this text node
          node.textContent = node.textContent.substring(0, remaining) + '...';
          textLength = maxLength;
          shouldTruncate = true;
          return true;
        }

        if (node.textContent) {
          textLength += node.textContent.length;
        }
      }

      return false;
    };

    truncateNode(div);

    // Close any unclosed tags
    if (openTags.length > 0) {
      const closingTags = openTags.reverse().map(tag => `</${tag}>`).join('');
      div.innerHTML = div.innerHTML + closingTags;
    }

    return div.innerHTML;
  }

  // Fallback for server-side rendering - improved simple truncation
  // Try to preserve basic HTML structure
  let result = '';
  let charCount = 0;
  let inTag = false;
  let tagBuffer = '';
  const openTags: string[] = [];

  for (let i = 0; i < html.length && charCount < maxLength; i++) {
    const char = html[i];

    if (char === '<') {
      inTag = true;
      tagBuffer = '<';
    } else if (char === '>') {
      inTag = false;
      tagBuffer += '>';

      // Check if it's a closing tag
      const tagMatch = tagBuffer.match(/<\/?([a-z0-9]+)/i);
      if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase();
        const isClosingTag = tagBuffer.startsWith('</');

        if (!isClosingTag && !['br', 'img', 'hr', 'input'].includes(tagName)) {
          openTags.push(tagName);
        } else if (isClosingTag) {
          const index = openTags.lastIndexOf(tagName);
          if (index !== -1) {
            openTags.splice(index, 1);
          }
        }
      }

      result += tagBuffer;
      tagBuffer = '';
    } else if (inTag) {
      tagBuffer += char;
    } else {
      // Regular text content
      result += char;
      charCount++;
    }
  }

  // Add ellipsis and close unclosed tags
  if (charCount >= maxLength) {
    result += '...';
    const closingTags = openTags.reverse().map(tag => `</${tag}>`).join('');
    result += closingTags;
  }

  return result;
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
    return truncateHTML(content, maxLength);
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