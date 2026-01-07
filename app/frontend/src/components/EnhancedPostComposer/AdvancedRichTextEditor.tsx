import React, { useCallback, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  ImageIcon,
  Link2,
  Video,
  Code,
  FileText
} from 'lucide-react';

// Import the unified image service for Cloudinary uploads
import { unifiedImageService } from '@/services/unifiedImageService';
import VideoEmbed from '@/components/VideoEmbed';
import { extractVideoUrls } from '@/utils/videoUtils';

interface AdvancedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const AdvancedRichTextEditor: React.FC<AdvancedRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Share your thoughts...',
  disabled = false,
  className = ''
}) => {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Extract video URLs from content
  const extractVideoLinks = useCallback((text: string) => {
    return extractVideoUrls(text);
  }, []);

  // Memoize video embeds
  const videoEmbeds = useMemo(() => {
    const videoInfos = extractVideoLinks(value);
    return videoInfos.map((videoInfo, index) => (
      <div key={index} className="my-3">
        <VideoEmbed url={videoInfo.url} width={560} height={315} />
      </div>
    ));
  }, [value, extractVideoLinks]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-2',
        },
      }),
      // Link extension is already included or causing duplicates
      // Link.configure({
      //   openOnClick: false,
      //   HTMLAttributes: {
      //     class: 'text-blue-500 hover:text-blue-700 underline',
      //   },
      // }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: {
          class: 'rounded-lg my-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes to editor
  React.useEffect(() => {
    if (editor && value !== editor.getHTML() && !isMarkdownMode) {
      editor.commands.setContent(value);
    }
  }, [value, editor, isMarkdownMode]);

  const toggleMarkdownMode = useCallback(async () => {
    if (isMarkdownMode) {
      // Switching from Markdown (Raw) to Visual
      // Convert Markdown to HTML for the editor
      try {
        // marked.parse can be sync or async depending on version/options
        // forcing string output
        const html = await marked.parse(value, { async: true });
        if (editor) {
          editor.commands.setContent(html);
        }
      } catch (error) {
        console.error('Error parsing markdown:', error);
        // Fallback to raw value
        if (editor) {
          editor.commands.setContent(value);
        }
      }
    }
    // Switching from Visual to Markdown does nothing special (value is already HTML)
    setIsMarkdownMode(!isMarkdownMode);
  }, [isMarkdownMode, value, editor]);

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageDialog(false);
      resetImageDialog();
    }
  }, [imageUrl, editor]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File size must be less than 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setSelectedFile(file);
    setUploadError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUploadImage = useCallback(async () => {
    if (!selectedFile || !editor) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Use unifiedImageService for Cloudinary upload instead of IPFS
      const result = await unifiedImageService.uploadImage(selectedFile, 'post');

      console.log('[RichTextEditor] Cloudinary upload result:', result);

      // Insert image into editor using the Cloudinary URL
      editor.chain().focus().setImage({ src: result.cdnUrl }).run();

      // Close dialog and reset
      setShowImageDialog(false);
      resetImageDialog();
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image to Cloudinary');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, editor]);

  const resetImageDialog = useCallback(() => {
    setImageUrl('');
    setSelectedFile(null);
    setImagePreview(null);
    setUploadProgress(0);
    setUploadError(null);
    setIsUploading(false);
  }, []);

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      if (linkText) {
        editor.chain().focus().insertContent({
          type: 'text',
          text: linkText,
          marks: [{ type: 'link', attrs: { href: linkUrl } }]
        }).run();
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      setLinkUrl('');
      setLinkText('');
      setShowLinkDialog(false);
    }
  }, [linkUrl, linkText, editor]);

  const addVideo = useCallback(() => {
    if (videoUrl && editor) {
      // For now, we'll insert the video URL as text and let the automatic detection handle it
      // This ensures compatibility with our multi-platform video embedding system
      editor.chain().focus().insertContent(` ${videoUrl} `).run();
      setVideoUrl('');
      setShowVideoDialog(false);
    }
  }, [videoUrl, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-gray-50 border-b px-3 py-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-300' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Bold"
        >
          <Bold size={18} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-300' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Italic"
        >
          <Italic size={18} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('code') ? 'bg-gray-300' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Code"
        >
          <Code size={18} />
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-300' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Bullet List"
        >
          <List size={18} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-300' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Numbered List"
        >
          <ListOrdered size={18} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-300' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Quote"
        >
          <Quote size={18} />
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => setShowImageDialog(true)}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          title="Insert Image"
        >
          <ImageIcon size={18} />
        </button>

        <button
          type="button"
          onClick={() => setShowLinkDialog(true)}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-300' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Insert Link"
        >
          <Link2 size={18} />
        </button>

        <button
          type="button"
          onClick={() => setShowVideoDialog(true)}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          title="Insert Video (YouTube, Vimeo, Twitch, TikTok, Instagram, Twitter, Facebook)"
        >
          <Video size={18} />
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
          className={`p-2 rounded hover:bg-gray-200 ${disabled || !editor.can().undo() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          title="Undo"
        >
          <Undo size={18} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
          className={`p-2 rounded hover:bg-gray-200 ${disabled || !editor.can().redo() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          title="Redo"
        >
          <Redo size={18} />
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        <button
          type="button"
          onClick={toggleMarkdownMode}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 ${isMarkdownMode ? 'bg-gray-300' : ''
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isMarkdownMode ? "Switch to Visual Editor (converts Markdown)" : "Switch to Markdown/Raw View"}
        >
          <FileText size={18} />
        </button>
      </div>

      {/* Editor Content */}
      {isMarkdownMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 min-h-[150px] focus:outline-none font-mono text-sm resize-y bg-transparent dark:text-gray-200"
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : (
        <EditorContent
          editor={editor}
          className="prose max-w-none p-3 min-h-[150px] focus:outline-none"
        />
      )}

      {/* Video Embeds */}
      {videoEmbeds}

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Insert Image</h3>

            {/* Tab-like interface */}
            <div className="space-y-4">
              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload from device
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900/30 dark:file:text-blue-400
                    dark:hover:file:bg-blue-900/50
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  JPEG, PNG, GIF, or WebP (max 10MB)
                </p>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full h-auto max-h-48 mx-auto rounded"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {selectedFile?.name} ({(selectedFile!.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                </div>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    or
                  </span>
                </div>
              </div>

              {/* URL Input Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Insert from URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={isUploading}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUploading) {
                      e.preventDefault();
                      addImage();
                    }
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowImageDialog(false);
                  resetImageDialog();
                }}
                disabled={isUploading}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              {selectedFile ? (
                <button
                  type="button"
                  onClick={handleUploadImage}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    'Upload & Insert'
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={addImage}
                  disabled={!imageUrl || isUploading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Insert from URL
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            <input
              type="text"
              placeholder="Enter link text (optional)"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <input
              type="text"
              placeholder="Enter URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLink();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addLink}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Dialog */}
      {showVideoDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Insert Video</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Enter a video URL from YouTube, Vimeo, Twitch, TikTok, Instagram, Twitter, or Facebook
            </p>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addVideo();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowVideoDialog(false);
                  setVideoUrl('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addVideo}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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

export default AdvancedRichTextEditor;
