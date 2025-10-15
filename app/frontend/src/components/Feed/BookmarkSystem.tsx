import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedPost } from '../../types/feed';

interface BookmarkSystemProps {
  post: EnhancedPost;
  onBookmarkChange?: (postId: string, isBookmarked: boolean) => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface BookmarkCollection {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  postCount: number;
  isDefault?: boolean;
}

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: EnhancedPost;
  collections: BookmarkCollection[];
  onSave: (collectionIds: string[], tags: string[]) => void;
}

const DEFAULT_COLLECTIONS: BookmarkCollection[] = [
  {
    id: 'favorites',
    name: 'Favorites',
    description: 'Your favorite posts',
    icon: '⭐',
    color: 'yellow',
    postCount: 0,
    isDefault: true
  },
  {
    id: 'read-later',
    name: 'Read Later',
    description: 'Posts to read when you have time',
    icon: '📚',
    color: 'blue',
    postCount: 0,
    isDefault: true
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Posts for research and analysis',
    icon: '🔬',
    color: 'green',
    postCount: 0,
    isDefault: true
  },
  {
    id: 'governance',
    name: 'Governance',
    description: 'Governance proposals and discussions',
    icon: '🏛️',
    color: 'purple',
    postCount: 0,
    isDefault: true
  }
];

const BookmarkModal: React.FC<BookmarkModalProps> = ({
  isOpen,
  onClose,
  post,
  collections,
  onSave
}) => {
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [notes, setNotes] = useState('');

  // Initialize with existing bookmarks
  useEffect(() => {
    if (isOpen && post.isBookmarked) {
      // Load existing bookmark data
      const savedData = localStorage.getItem(`bookmark-${post.id}`);
      if (savedData) {
        try {
          const data = JSON.parse(savedData);
          setSelectedCollections(data.collections || ['favorites']);
          setCustomTags(data.tags || []);
          setNotes(data.notes || '');
        } catch (e) {
          setSelectedCollections(['favorites']);
        }
      } else {
        setSelectedCollections(['favorites']);
      }
    } else {
      setSelectedCollections([]);
      setCustomTags([]);
      setNotes('');
    }
  }, [isOpen, post.id, post.isBookmarked]);

  const handleCollectionToggle = (collectionId: string) => {
    setSelectedCollections(prev => 
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !customTags.includes(tag)) {
      setCustomTags(prev => [...prev, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setCustomTags(prev => prev.filter(t => t !== tag));
  };

  const handleSave = () => {
    onSave(selectedCollections, customTags);
    
    // Save additional data locally
    const bookmarkData = {
      collections: selectedCollections,
      tags: customTags,
      notes,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(`bookmark-${post.id}`, JSON.stringify(bookmarkData));
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Save Post
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Collections */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Save to Collections
            </h4>
            <div className="space-y-2">
              {collections.map(collection => (
                <label
                  key={collection.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(collection.id)}
                    onChange={() => handleCollectionToggle(collection.id)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-lg">{collection.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {collection.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {collection.description} • {collection.postCount} posts
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Tags */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Add Tags
            </h4>
            
            {/* Tag Input */}
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {/* Selected Tags */}
            {customTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-primary-500 hover:text-primary-700 dark:hover:text-primary-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Notes (Optional)
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal notes about this post..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={selectedCollections.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
          >
            Save Post
          </button>
        </div>
      </div>
    </div>
  );
};

export const BookmarkSystem: React.FC<BookmarkSystemProps> = ({
  post,
  onBookmarkChange,
  showLabel = false,
  size = 'md',
  className = ''
}) => {
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [showModal, setShowModal] = useState(false);
  const [collections, setCollections] = useState<BookmarkCollection[]>(DEFAULT_COLLECTIONS);
  const [isLoading, setIsLoading] = useState(false);

  // Load collections from localStorage
  useEffect(() => {
    const savedCollections = localStorage.getItem('bookmark-collections');
    if (savedCollections) {
      try {
        const parsed = JSON.parse(savedCollections);
        setCollections([...DEFAULT_COLLECTIONS, ...parsed]);
      } catch (e) {
        console.error('Failed to parse bookmark collections:', e);
      }
    }
  }, []);

  // Handle bookmark toggle
  const handleBookmarkToggle = useCallback(async () => {
    if (isBookmarked) {
      // Remove bookmark
      setIsLoading(true);
      try {
        localStorage.removeItem(`bookmark-${post.id}`);
        setIsBookmarked(false);
        onBookmarkChange?.(post.id, false);
      } catch (error) {
        console.error('Failed to remove bookmark:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Show save modal
      setShowModal(true);
    }
  }, [isBookmarked, post.id, onBookmarkChange]);

  // Handle save from modal
  const handleSave = useCallback(async (collectionIds: string[], tags: string[]) => {
    setIsLoading(true);
    try {
      // Save bookmark
      setIsBookmarked(true);
      onBookmarkChange?.(post.id, true);
      
      // Update collection counts
      const updatedCollections = collections.map(collection => ({
        ...collection,
        postCount: collectionIds.includes(collection.id) 
          ? collection.postCount + 1 
          : collection.postCount
      }));
      setCollections(updatedCollections);
      
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  }, [post.id, onBookmarkChange, collections]);

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4 text-xs';
      case 'lg':
        return 'w-6 h-6 text-base';
      default:
        return 'w-5 h-5 text-sm';
    }
  };

  return (
    <>
      <button
        onClick={handleBookmarkToggle}
        disabled={isLoading}
        className={`flex items-center space-x-1 transition-all duration-200 ${
          isBookmarked
            ? 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} ${className}`}
        title={isBookmarked ? 'Remove from bookmarks' : 'Save post'}
      >
        <span className={getSizeClasses()}>
          {isLoading ? (
            <div className="animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isBookmarked ? (
            '🔖'
          ) : (
            '📑'
          )}
        </span>
        {showLabel && (
          <span className="font-medium">
            {isBookmarked ? 'Saved' : 'Save'}
          </span>
        )}
      </button>

      <BookmarkModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        post={post}
        collections={collections}
        onSave={handleSave}
      />
    </>
  );
};

export default BookmarkSystem;