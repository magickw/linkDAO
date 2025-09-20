import React, { useState, useCallback, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showPreview?: boolean;
  className?: string;
}

interface ToolbarButton {
  icon: string;
  label: string;
  action: string;
  shortcut?: string;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { icon: '𝐁', label: 'Bold', action: 'bold', shortcut: 'Ctrl+B' },
  { icon: '𝐼', label: 'Italic', action: 'italic', shortcut: 'Ctrl+I' },
  { icon: '𝐔', label: 'Underline', action: 'underline', shortcut: 'Ctrl+U' },
  { icon: '~~', label: 'Strikethrough', action: 'strikethrough' },
  { icon: '`', label: 'Code', action: 'code', shortcut: 'Ctrl+`' },
  { icon: '🔗', label: 'Link', action: 'link', shortcut: 'Ctrl+K' },
  { icon: '📷', label: 'Image', action: 'image' },
  { icon: '📝', label: 'Quote', action: 'quote' },
  { icon: '📋', label: 'Code Block', action: 'codeblock' },
  { icon: '•', label: 'Bullet List', action: 'ul' },
  { icon: '1.', label: 'Numbered List', action: 'ol' },
  { icon: 'H1', label: 'Heading 1', action: 'h1' },
  { icon: 'H2', label: 'Heading 2', action: 'h2' },
  { icon: 'H3', label: 'Heading 3', action: 'h3' }
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  disabled = false,
  showPreview = false,
  className = ''
}: RichTextEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(showPreview);
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update selection info when text is selected
  const handleSelectionChange = useCallback(() => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selected = value.substring(start, end);
      
      setSelectionStart(start);
      setSelectionEnd(end);
      setSelectedText(selected);
    }
  }, [value]);

  // Handle text change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  }, [onChange]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  // Insert text at cursor position
  const insertText = useCallback((before: string, after: string = '', placeholder: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = selectionStart;
    const end = selectionEnd;
    const selectedText = value.substring(start, end);
    
    let replacement = '';
    if (selectedText) {
      replacement = before + selectedText + after;
    } else {
      replacement = before + placeholder + after;
    }
    
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);
    
    // Set cursor position
    setTimeout(() => {
      const newCursorPos = selectedText 
        ? start + replacement.length 
        : start + before.length + placeholder.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, selectionStart, selectionEnd, onChange]);

  // Handle toolbar actions
  const handleToolbarAction = useCallback((action: string) => {
    switch (action) {
      case 'bold':
        insertText('**', '**', 'bold text');
        break;
      case 'italic':
        insertText('*', '*', 'italic text');
        break;
      case 'underline':
        insertText('<u>', '</u>', 'underlined text');
        break;
      case 'strikethrough':
        insertText('~~', '~~', 'strikethrough text');
        break;
      case 'code':
        insertText('`', '`', 'code');
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          insertText('[', `](${url})`, 'link text');
        }
        break;
      case 'image':
        const imageUrl = prompt('Enter image URL:');
        if (imageUrl) {
          insertText('![', `](${imageUrl})`, 'alt text');
        }
        break;
      case 'quote':
        insertText('> ', '', 'quoted text');
        break;
      case 'codeblock':
        insertText('```\n', '\n```', 'code block');
        break;
      case 'ul':
        insertText('- ', '', 'list item');
        break;
      case 'ol':
        insertText('1. ', '', 'list item');
        break;
      case 'h1':
        insertText('# ', '', 'Heading 1');
        break;
      case 'h2':
        insertText('## ', '', 'Heading 2');
        break;
      case 'h3':
        insertText('### ', '', 'Heading 3');
        break;
    }
  }, [insertText]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          handleToolbarAction('bold');
          break;
        case 'i':
          e.preventDefault();
          handleToolbarAction('italic');
          break;
        case 'u':
          e.preventDefault();
          handleToolbarAction('underline');
          break;
        case '`':
          e.preventDefault();
          handleToolbarAction('code');
          break;
        case 'k':
          e.preventDefault();
          handleToolbarAction('link');
          break;
      }
    }
  }, [handleToolbarAction]);

  // Render markdown preview (simplified)
  const renderMarkdownPreview = useCallback((text: string) => {
    if (!text.trim()) {
      return <p className="text-gray-500 dark:text-gray-400 italic">Preview will appear here...</p>;
    }

    return text
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold text-gray-900 dark:text-white mt-4 mb-2">{line.slice(2)}</h1>;
        }
        
        // Lists
        if (line.match(/^\d+\. /)) {
          return <li key={index} className="text-gray-700 dark:text-gray-300 ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
        }
        if (line.startsWith('- ')) {
          return <li key={index} className="text-gray-700 dark:text-gray-300 ml-4 list-disc">{line.slice(2)}</li>;
        }
        
        // Quotes
        if (line.startsWith('> ')) {
          return (
            <blockquote key={index} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">
              {line.slice(2)}
            </blockquote>
          );
        }
        
        // Code blocks
        if (line.startsWith('```')) {
          return <div key={index} className="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono text-sm my-2">{line.slice(3)}</div>;
        }
        
        // Empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // Regular paragraphs with inline formatting
        let processedLine = line;
        
        // Bold
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Code
        processedLine = processedLine.replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">$1</code>');
        
        // Links
        processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-600 dark:text-primary-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Strikethrough
        processedLine = processedLine.replace(/~~(.*?)~~/g, '<del>$1</del>');
        
        return (
          <p 
            key={index} 
            className="text-gray-700 dark:text-gray-300 mb-2" 
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        );
      });
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 flex-wrap">
            {TOOLBAR_BUTTONS.map((button) => (
              <button
                key={button.action}
                type="button"
                onClick={() => handleToolbarAction(button.action)}
                disabled={disabled}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                title={`${button.label}${button.shortcut ? ` (${button.shortcut})` : ''}`}
              >
                {button.icon}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors duration-200 ${
                isPreviewMode
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              disabled={disabled}
            >
              {isPreviewMode ? 'Edit' : 'Preview'}
            </button>
          </div>
        </div>
      </div>

      {/* Editor/Preview Content */}
      <div className="min-h-[200px]">
        {!isPreviewMode ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelectionChange}
            onMouseUp={handleSelectionChange}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full p-4 border-none outline-none resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            style={{ minHeight: '200px' }}
          />
        ) : (
          <div className="p-4 prose dark:prose-invert max-w-none">
            {renderMarkdownPreview(value)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Markdown supported</span>
          {selectedText && (
            <span>{selectedText.length} characters selected</span>
          )}
        </div>
        <span>{value.length} characters</span>
      </div>
    </div>
  );
}