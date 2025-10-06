// Mock PostComposer component for testing
import React, { useState } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { useToast } from '../../context/ToastContext';
import RichTextEditor from '../EnhancedPostComposer/RichTextEditor';
import { MediaUploadZone } from '../EnhancedPostComposer/MediaUploadZone';
import { HashtagMentionInput } from '../EnhancedPostComposer/HashtagMentionInput';

interface PostComposerProps {
  onPost?: (postData: any) => Promise<void>;
  onCancel?: () => void;
  maxLength?: number;
  enableDrafts?: boolean;
  enableCommunitySelection?: boolean;
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
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>();
  const [showScheduler, setShowScheduler] = useState(false);

  const { isConnected } = useWeb3();
  const { addToast } = useToast();

  const remainingChars = maxLength - content.length;
  const canPost = isConnected && (content.trim() || media.length > 0) && remainingChars >= 0;

  const handlePost = async () => {
    if (!canPost) return;

    setIsPosting(true);
    try {
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
      
      // Clear form
      setContent('');
      setTitle('');
      setTags([]);
      setMentions([]);
      setMedia([]);
      setScheduledAt(undefined);
      
      addToast(scheduledAt ? 'Post scheduled successfully!' : 'Post created successfully!', 'success');
    } catch (error) {
      addToast('Failed to create post', 'error');
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
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h3>Create Post</h3>
      
      {enableDrafts && (
        <button>Load Draft</button>
      )}

      {enableCommunitySelection && (
        <div>
          <label>Post to Community</label>
          <select>
            <option value="">Select a community (optional)</option>
            <option value="general">General Discussion (1234 members)</option>
            <option value="defi">DeFi Hub (856 members)</option>
          </select>
        </div>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title (optional)"
        maxLength={200}
      />

      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="What's on your mind?"
        disabled={isPosting}
      />

      <div>
        <span style={{ color: remainingChars < 0 ? 'red' : 'gray' }}>
          {remainingChars} characters remaining
        </span>
        {tags.length > 0 && <span>{tags.length} hashtag{tags.length !== 1 ? 's' : ''}</span>}
        {mentions.length > 0 && <span>{mentions.length} mention{mentions.length !== 1 ? 's' : ''}</span>}
      </div>

      <HashtagMentionInput
        value={content}
        onChange={setContent}
        onHashtagsChange={setTags}
        onMentionsChange={setMentions}
        disabled={isPosting}
      />

      <MediaUploadZone onUpload={handleMediaUpload} />

      {media.length > 0 && (
        <div>
          {media.map((file, index) => (
            <div key={index}>
              <span>{file.name}</span>
              <button onClick={() => removeMediaFile(index)} disabled={isPosting}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setShowScheduler(!showScheduler)} disabled={isPosting}>
        Schedule
      </button>

      {showScheduler && (
        <div>
          <label>Schedule Post</label>
          <input
            type="datetime-local"
            value={scheduledAt ? scheduledAt.toISOString().slice(0, 16) : ''}
            onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value) : undefined)}
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>
      )}

      <div>
        <button onClick={handleCancel} disabled={isPosting}>
          Cancel
        </button>
        <button onClick={handlePost} disabled={!canPost}>
          {isPosting ? 'Posting...' : scheduledAt ? 'Schedule Post' : 'Post'}
        </button>
      </div>

      <input
        data-testid="file-input"
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        onChange={(e) => e.target.files && handleMediaUpload(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default PostComposer;