import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showPreview?: boolean;
  disabled?: boolean;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Share your thoughts...',
  showPreview = false,
  disabled = false,
  className = ''
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(showPreview);
  const [isFocused, setIsFocused] = useState(false);
  const [renderedContent, setRenderedContent] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update textarea height to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Render markdown when value changes
  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        const rawHtml = await marked(value, { breaks: true, gfm: true });
        const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img'],
          ALLOWED_ATTR: ['href', 'title', 'target', 'src', 'alt', 'width', 'height']
        });
        setRenderedContent(sanitizedHtml);
      } catch (error) {
        setRenderedContent(value);
      }
    };

    if (isPreviewMode) {
      renderMarkdown();
    }
  }, [value, isPreviewMode]);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    onChange(target.value);
  };

  const insertMarkdown = (syntax: string, wrap: boolean = false, placeholderText: string = '') => {
    if (!textareaRef.current || disabled) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let newText = '';
    let newCursorPos = start;

    if (wrap) {
      const textToWrap = selectedText || placeholderText;
      newText = `${value.substring(0, start)}${syntax}${textToWrap}${syntax}${value.substring(end)}`;
      newCursorPos = start + syntax.length + textToWrap.length + syntax.length;
    } else {
      newText = `${value.substring(0, start)}${syntax}${value.substring(end)}`;
      newCursorPos = start + syntax.length;
    }

    onChange(newText);
    
    // Restore cursor position after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const openLinkModal = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const selectedText = value.substring(textarea.selectionStart, textarea.selectionEnd);
    setLinkText(selectedText);
    setLinkUrl('');
    setShowLinkModal(true);
  };

  const insertLink = () => {
    if (linkUrl.trim()) {
      const linkMarkdown = `[${linkText || linkUrl}](${linkUrl})`;
      insertMarkdown(linkMarkdown, false);
    }
    setShowLinkModal(false);
    setLinkText('');
    setLinkUrl('');
  };

  const openImageModal = () => {
    setImageUrl('');
    setImageAlt('');
    setShowImageModal(true);
  };

  const insertImage = () => {
    if (imageUrl.trim()) {
      const imageMarkdown = `![${imageAlt}](${imageUrl})`;
      insertMarkdown(imageMarkdown, false);
    }
    setShowImageModal(false);
    setImageUrl('');
    setImageAlt('');
  };

  const insertHorizontalRule = () => {
    insertMarkdown('\n\n---\n\n', false);
  };

  const insertCodeBlock = () => {
    insertMarkdown('\n```\n\n```\n', false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Toolbar */}
      {!isPreviewMode && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
          <button
            type="button"
            onClick={() => insertMarkdown('**', true)}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Bold"
            disabled={disabled}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('*', true)}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Italic"
            disabled={disabled}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('~~', true)}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Strikethrough"
            disabled={disabled}
          >
            <span className="line-through">S</span>
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            type="button"
            onClick={openLinkModal}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Insert Link"
            disabled={disabled}
          >
            <span className="underline">Link</span>
          </button>
          <button
            type="button"
            onClick={openImageModal}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Insert Image"
            disabled={disabled}
          >
            <span>📷</span>
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            type="button"
            onClick={() => insertMarkdown('# ')}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Heading 1"
            disabled={disabled}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('## ')}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Heading 2"
            disabled={disabled}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('### ')}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Heading 3"
            disabled={disabled}
          >
            H3
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            type="button"
            onClick={() => insertMarkdown('- ')}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Bullet List"
            disabled={disabled}
          >
            <span>•</span>
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('1. ')}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Numbered List"
            disabled={disabled}
          >
            <span>1.</span>
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            type="button"
            onClick={() => insertMarkdown('> ')}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Quote"
            disabled={disabled}
          >
            <span>❝</span>
          </button>
          <button
            type="button"
            onClick={() => insertMarkdown('`', true)}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Inline Code"
            disabled={disabled}
          >
            <span className="font-mono">{'</>'}</span>
          </button>
          <button
            type="button"
            onClick={insertCodeBlock}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Code Block"
            disabled={disabled}
          >
            <span className="font-mono">{'{}'}</span>
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            type="button"
            onClick={insertHorizontalRule}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Horizontal Rule"
            disabled={disabled}
          >
            <span>—</span>
          </button>
        </div>
      )}

      {/* Editor Area */}
      <div 
        className={`min-h-[150px] rounded-b-lg ${
          isFocused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'
        } ${isPreviewMode ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}`}
      >
        {isPreviewMode ? (
          <div 
            className="p-4 prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full p-4 bg-transparent border-none outline-none resize-none min-h-[150px] dark:text-white"
            aria-label="Post content"
            data-testid="rich-text-editor"
          />
        )}
      </div>

      {/* Preview Toggle */}
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          disabled={disabled}
        >
          {isPreviewMode ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Link text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Insert Image</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Description of image"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertImage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;