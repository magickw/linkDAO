import React, { useState } from 'react';
import { CreatePostInput } from '@/models/Post';

interface PostCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePostInput) => Promise<void>;
  isLoading: boolean;
}

export default function PostCreationModal({ isOpen, onClose, onSubmit, isLoading }: PostCreationModalProps) {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [postType, setPostType] = useState('standard'); // standard, proposal, defi, nft, analysis
  const [nftAddress, setNftAddress] = useState('');
  const [nftTokenId, setNftTokenId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract tags from input (comma separated)
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    // Add post type as a tag
    if (postType !== 'standard') {
      tagArray.push(postType);
    }
    
    const postData: CreatePostInput = {
      author: '', // This will be filled by the parent component
      content,
      tags: tagArray,
    };
    
    if (media) {
      // In a real implementation, we would upload the media to IPFS and store the CID
      // For now, we'll just add a placeholder
      postData.media = ['https://placehold.co/300'];
    }
    
    // Add NFT information if it's an NFT post
    if (postType === 'nft' && nftAddress && nftTokenId) {
      postData.onchainRef = `${nftAddress}:${nftTokenId}`;
    }
    
    await onSubmit(postData);
    handleClose();
  };

  const handleClose = () => {
    // Reset form
    setContent('');
    setTags('');
    setMedia(null);
    setPreview(null);
    setPostType('standard');
    setNftAddress('');
    setNftTokenId('');
    onClose();
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMedia(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Post</h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {/* Post Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Post Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'standard', label: 'Standard', icon: '📝' },
                { id: 'proposal', label: 'Proposal', icon: '🏛️' },
                { id: 'defi', label: 'DeFi', icon: '💱' },
                { id: 'nft', label: 'NFT', icon: '🎨' },
                { id: 'analysis', label: 'Analysis', icon: '📊' }
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setPostType(type.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-md border ${
                    postType === type.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className="text-xs mt-1">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* NFT Fields (only show for NFT post type) */}
          {postType === 'nft' && (
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nftAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  NFT Contract Address
                </label>
                <input
                  type="text"
                  id="nftAddress"
                  value={nftAddress}
                  onChange={(e) => setNftAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="nftTokenId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Token ID
                </label>
                <input
                  type="text"
                  id="nftTokenId"
                  value={nftTokenId}
                  onChange={(e) => setNftTokenId(e.target.value)}
                  placeholder="123"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={postType === 'proposal' 
                ? "Describe your governance proposal..." 
                : postType === 'defi' 
                ? "Share your DeFi strategy or insights..." 
                : postType === 'nft' 
                ? "Showcase your NFT collection..." 
                : postType === 'analysis' 
                ? "Provide your market analysis..." 
                : "What's happening in Web3?"}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              rows={4}
              required
              disabled={isLoading}
            />
            <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
              {280 - content.length} characters remaining
            </div>
          </div>
          
          {preview && (
            <div className="mb-4">
              <img src={preview} alt="Preview" className="rounded-lg max-h-60 object-cover" />
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="media" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Add Media
            </label>
            <input
              type="file"
              id="media"
              accept="image/*"
              onChange={handleMediaChange}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary-600 file:text-white
                hover:file:bg-primary-700
                dark:file:bg-primary-700 dark:hover:file:bg-primary-600"
              disabled={isLoading}
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="defi, nft, governance"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Add relevant tags to help others discover your post
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={content.trim() === '' || isLoading || (postType === 'nft' && (!nftAddress || !nftTokenId))}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              {isLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}