import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
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
  Code
} from 'lucide-react';

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
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

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
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setShowImageDialog(false);
    }
  }, [imageUrl, editor]);

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
      editor.commands.setYoutubeVideo({
        src: videoUrl,
        width: 640,
        height: 360,
      });
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
          title="Insert Video"
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
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="prose max-w-none p-3 min-h-[150px] focus:outline-none"
      />

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
            <input
              type="text"
              placeholder="Enter image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addImage();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addImage}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Insert
              </button>
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
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Insert Video</h3>
            <p className="text-sm text-gray-600 mb-3">
              Enter a YouTube video URL
            </p>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
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
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addVideo}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
