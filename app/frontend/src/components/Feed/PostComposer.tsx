import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { useToast } from '../../context/ToastContext';
import RichTextEditor from '../EnhancedPostComposer/RichTextEditor';
import { MediaUploadZone } from '../EnhancedPostComposer/MediaUploadZone';
import { HashtagMentionInput } from '../EnhancedPostComposer/HashtagMentionInput';
import { Loader2, Send, X, Calendar, Image as ImageIcon, Hash, AtSign } from 'lucide-react';

interface PostComposerProps {
  onPost?: (postData: any) => Promise<void>;
  onCancel?: () => void;
  maxLength?: number;
  enableDrafts?: boolean;
  enableCommunitySelection?: boolean;
}

interface UserSuggestion {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
}

interface HashtagSuggestion {
  tag: string;
  count: number;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  onPost,
  onCancel,
  maxLength = 2000,
  enableDrafts = false,
  enableCommunitySelection = false
}) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [media, setMedia] = useState<File[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postingProgress, setPostingProgress] = useState(0);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>();
  const [showScheduler, setShowScheduler] = useState(false);

  // Mention and hashtag autocomplete states
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [hashtagStartIndex, setHashtagStartIndex] = useState(-1);

  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const objectUrlsRef = useRef<Map<number, string>>(new Map());

  const { isConnected } = useWeb3();
  const { addToast } = useToast();

  // Cleanup Object URLs on unmount and when files are removed
  useEffect(() => {
    return () => {
      // Revoke all Object URLs when component unmounts
      objectUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Failed to revoke Object URL:', error);
        }
      });
      objectUrlsRef.current.clear();
    };
  }, []);

  // Mock user suggestions (in production, fetch from API)
  const userSuggestions: UserSuggestion[] = [
    { id: '1', username: 'alice', displayName: 'Alice Johnson' },
    { id: '2', username: 'bob', displayName: 'Bob Smith' },
    { id: '3', username: 'charlie', displayName: 'Charlie Brown' },
    { id: '4', username: 'diana', displayName: 'Diana Prince' },
    { id: '5', username: 'evan', displayName: 'Evan Wright' },
  ];

  // Mock hashtag suggestions (in production, fetch from API)
  const hashtagSuggestions: HashtagSuggestion[] = [
    { tag: 'blockchain', count: 1234 },
    { tag: 'defi', count: 987 },
    { tag: 'nft', count: 856 },
    { tag: 'crypto', count: 2345 },
    { tag: 'web3', count: 1567 },
    { tag: 'dao', count: 654 },
    { tag: 'trading', count: 432 },
    { tag: 'investment', count: 321 },
  ];

  const filteredUserSuggestions = userSuggestions.filter(user =>
    user.handle.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const filteredHashtagSuggestions = hashtagSuggestions.filter(tag =>
    tag.tag.toLowerCase().includes(hashtagQuery.toLowerCase())
  );

  const remainingChars = maxLength - content.length;
  const canPost = isConnected && (content.trim() || media.length > 0) && remainingChars >= 0;

  // Handle content change with mention/hashtag detection
  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    
    // Find the cursor position (for textarea mode)
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      setCursorPosition(cursorPos);
      
      // Check for @ mention
      const textBeforeCursor = value.substring(0, cursorPos);
      const atMatch = textBeforeCursor.match(/@(\w*)$/);
      
      if (atMatch) {
        setMentionStartIndex(cursorPos - atMatch[0].length);
        setMentionQuery(atMatch[1]);
        setShowMentionSuggestions(true);
        setShowHashtagSuggestions(false);
      } else {
        setShowMentionSuggestions(false);
        setMentionQuery('');
      }
      
      // Check for # hashtag
      const hashMatch = textBeforeCursor.match(/#(\w*)$/);
      
      if (hashMatch) {
        setHashtagStartIndex(cursorPos - hashMatch[0].length);
        setHashtagQuery(hashMatch[1]);
        setShowHashtagSuggestions(true);
        setShowMentionSuggestions(false);
      } else {
        setShowHashtagSuggestions(false);
        setHashtagQuery('');
      }
    }
  }, []);

  // Handle mention selection
  const handleSelectMention = useCallback((user: UserSuggestion) => {
    const beforeMention = content.substring(0, mentionStartIndex);
    const afterMention = content.substring(cursorPosition);
    const newContent = beforeMention + `@${user.handle} ` + afterMention;

    setContent(newContent);
    setMentions([...mentions, user.handle]);
    setShowMentionSuggestions(false);
    setMentionQuery('');
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartIndex + user.handle.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [content, mentionStartIndex, cursorPosition, mentions]);

  // Handle hashtag selection
  const handleSelectHashtag = useCallback((tag: string) => {
    const beforeHashtag = content.substring(0, hashtagStartIndex);
    const afterHashtag = content.substring(cursorPosition);
    const newContent = beforeHashtag + `#${tag} ` + afterHashtag;
    
    setContent(newContent);
    setTags([...tags, tag]);
    setShowHashtagSuggestions(false);
    setHashtagQuery('');
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = hashtagStartIndex + tag.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [content, hashtagStartIndex, cursorPosition, tags]);

  const handlePost = async () => {
    if (!canPost) return;

    setIsPosting(true);
    setPostingProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setPostingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      if (onPost) {
        await onPost({
          content: content.trim(),
          title: title.trim() || undefined,
          tags,
          mentions,
          media,
          scheduledAt
        });
      }
      
      clearInterval(progressInterval);
      setPostingProgress(100);
      
      // Clear form
      setContent('');
      setTitle('');
      setTags([]);
      setMentions([]);
      setMedia([]);
      setScheduledAt(undefined);
      
      addToast(scheduledAt ? 'Post scheduled successfully!' : 'Post created successfully!', 'success');
      
      // Reset progress after a short delay
      setTimeout(() => {
        setPostingProgress(0);
      }, 500);
    } catch (error) {
      addToast('Failed to create post', 'error');
      setPostingProgress(0);
    } finally {
      setIsPosting(false);
    }
  };

  const handleCancel = () => {
    if (content.trim() || title.trim() || media.length > 0) {
      if (confirm('Are you sure you want to discard this post?')) {
        setContent('');
        setTitle('');
        setTags([]);
        setMentions([]);
        setMedia([]);
        if (onCancel) onCancel();
      }
    } else {
      if (onCancel) onCancel();
    }
  };

  const handleMediaUpload = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > 50 * 1024 * 1024) {
        addToast(`File ${file.name} is too large (max 50MB)`, 'error');
        return false;
      }
      return true;
    });

    if (media.length + validFiles.length > 10) {
      addToast('Maximum 10 files allowed', 'error');
      return;
    }

    setMedia(prev => [...prev, ...validFiles]);
  };

  const removeMediaFile = (index: number) => {
    setMedia(prev => {
      const revokedUrl = objectUrlsRef.current.get(index);
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
        objectUrlsRef.current.delete(index);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Close suggestion dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
        setShowMentionSuggestions(false);
        setShowHashtagSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={editorRef} className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Post</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Draft and Community Selection */}
        <div className="flex flex-col sm:flex-row gap-3">
          {enableDrafts && (
            <button className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              Load Draft
            </button>
          )}

          {enableCommunitySelection && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Post to Community
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Select a community (optional)</option>
                <option value="general">General Discussion (1234 members)</option>
                <option value="defi">DeFi Hub (856 members)</option>
              </select>
            </div>
          )}
        </div>

        {/* Title Input */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title (optional)"
            maxLength={200}
            disabled={isPosting}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {/* Content Editor with Autocomplete */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="What's on your mind? Type @ to mention someone or # to add a hashtag..."
            disabled={isPosting}
            rows={5}
            maxLength={maxLength}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-y transition-colors"
          />

          {/* Mention Suggestions Dropdown */}
          {showMentionSuggestions && filteredUserSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredUserSuggestions.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectMention(user)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                    {user.displayName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.displayName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      @{user.handle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Hashtag Suggestions Dropdown */}
          {showHashtagSuggestions && filteredHashtagSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredHashtagSuggestions.map((tag) => (
                <button
                  key={tag.tag}
                  onClick={() => handleSelectHashtag(tag.tag)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      #{tag.tag}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tag.count} posts
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Character Count and Tags/Mentions Info */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={`font-medium ${remainingChars < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {remainingChars} characters remaining
          </span>
          {tags.length > 0 && (
            <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
              <Hash className="w-4 h-4" />
              {tags.length} hashtag{tags.length !== 1 ? 's' : ''}
            </span>
          )}
          {mentions.length > 0 && (
            <span className="flex items-center gap-1 text-purple-500 dark:text-purple-400">
              <AtSign className="w-4 h-4" />
              {mentions.length} mention{mentions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Media Upload and Preview */}
        <MediaUploadZone onUpload={handleMediaUpload} />

        {media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map((file, index) => {
              // Get or create cached Object URL for this file
              let objectUrl = objectUrlsRef.current.get(index);
              if (!objectUrl) {
                objectUrl = URL.createObjectURL(file);
                objectUrlsRef.current.set(index, objectUrl);
              }

              return (
                <div key={index} className="relative group">
                  {file.type.startsWith('image/') && (
                    <img
                      src={objectUrl}
                      alt={file.name}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  )}
                  {file.type.startsWith('video/') && (
                    <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎬</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeMediaFile(index)}
                    disabled={isPosting}
                    className="absolute top-1 right-1 p-3 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-1 left-1 right-1 px-1 py-0.5 bg-black bg-opacity-50 text-white text-xs rounded truncate">
                    {file.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Schedule Toggle */}
        <button
          onClick={() => setShowScheduler(!showScheduler)}
          disabled={isPosting}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Calendar className="w-4 h-4" />
          {showScheduler ? 'Cancel Schedule' : 'Schedule Post'}
        </button>

        {showScheduler && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schedule Post
            </label>
            <input
              type="datetime-local"
              value={scheduledAt ? scheduledAt.toISOString().slice(0, 16) : ''}
              onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value) : undefined)}
              min={new Date().toISOString().slice(0, 16)}
              disabled={isPosting}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        )}

        {/* Progress Indicator */}
        {isPosting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {scheduledAt ? 'Scheduling post...' : 'Creating post...'}
              </span>
              <span>{postingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${postingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleCancel}
            disabled={isPosting}
            className="flex-1 px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!canPost || isPosting}
            className={`flex-1 px-6 py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2
              ${!canPost || isPosting
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 hover:shadow-lg'
              }`}
          >
            {isPosting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {scheduledAt ? 'Scheduling...' : 'Posting...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {scheduledAt ? 'Schedule Post' : 'Post'}
              </>
            )}
          </button>
        </div>
      </div>

      <input
        data-testid="file-input"
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        onChange={(e) => e.target.files && handleMediaUpload(Array.from(e.target.files))}
        className="hidden"
      />
    </div>
  );
};

export default PostComposer;