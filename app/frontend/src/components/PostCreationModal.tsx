import React, { useState } from 'react';
import { CreatePostInput } from '@/models/Post';
import RichTextEditor from './EnhancedPostComposer/RichTextEditor';
import { ContentTypeTabs } from './EnhancedPostComposer/ContentTypeTabs';
import { PollCreator } from './EnhancedPostComposer/PollCreator';
import { ProposalCreator } from './EnhancedPostComposer/ProposalCreator';
import { ContentType, PollData, ProposalData } from '@/types/enhancedPost';

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
  const [contentType, setContentType] = useState<ContentType>(ContentType.POST);
  const [poll, setPoll] = useState<PollData | undefined>(undefined);
  const [proposal, setProposal] = useState<ProposalData | undefined>(undefined);
  const [postType, setPostType] = useState('standard'); // standard, proposal, defi, nft, analysis
  const [nftAddress, setNftAddress] = useState('');
  const [nftTokenId, setNftTokenId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on content type
    let isValid = false;
    let finalContent = '';

    switch (contentType) {
      case ContentType.POST:
        isValid = content.trim().length > 0;
        finalContent = content;
        break;
      case ContentType.POLL:
        isValid = !!(poll && poll.question.trim().length > 0 && poll.options.filter(opt => opt.text.trim()).length >= 2);
        finalContent = poll ? `Poll: ${poll.question}` : '';
        break;
      case ContentType.PROPOSAL:
        isValid = !!(proposal && proposal.title.trim().length > 0 && proposal.description.trim().length > 0);
        finalContent = proposal ? `Proposal: ${proposal.title}` : '';
        break;
    }
    
    if (!isValid) {
      return;
    }
    
    try {
      // Extract tags from input (comma separated)
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      // Add content type as a tag
      tagArray.push(contentType.toLowerCase());
      
      // Add post type as a tag
      if (postType !== 'standard') {
        tagArray.push(postType);
      }
      
      const postData: CreatePostInput = {
        author: '', // This will be filled by the parent component
        content: finalContent,
        tags: tagArray,
      };
      
      // Add type-specific data
      if (contentType === ContentType.POLL && poll) {
        postData.poll = poll;
      } else if (contentType === ContentType.PROPOSAL && proposal) {
        postData.proposal = proposal;
      }
      
      if (media) {
        // In a real implementation, we would upload the media to IPFS and store the CID
        // For now, we'll just add a placeholder
        postData.media = ['https://placehold.co/300'];
      }
      
      // Add NFT information if it's an NFT post
      if (postType === 'nft' && nftAddress && nftTokenId) {
        postData.onchainRef = `${nftAddress}:${nftTokenId}`;
      }
      
      console.log('Submitting post data:', postData);
      await onSubmit(postData);
      handleClose();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  const handleClose = () => {
    // Reset form
    setContent('');
    setTags('');
    setMedia(null);
    setPreview(null);
    setContentType(ContentType.POST);
    setPoll(undefined);
    setProposal(undefined);
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
          {/* Content Type Tabs */}
          <div className="mb-6">
            <ContentTypeTabs
              activeType={contentType}
              onTypeChange={(type) => {
                setContentType(type);
                // Reset content when switching types
                if (type === ContentType.POLL) {
                  setPoll(poll || { question: '', options: [{ id: 'opt1', text: '', votes: 0, tokenVotes: 0 }, { id: 'opt2', text: '', votes: 0, tokenVotes: 0 }], allowMultiple: false, tokenWeighted: true, minTokens: 1 });
                } else if (type === ContentType.PROPOSAL) {
                  setProposal(proposal || { title: '', description: '', type: 'governance', votingPeriod: 7, quorum: 10, threshold: 50 });
                }
              }}
              context="feed"
              disabled={isLoading}
            />
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
          
          {/* Content Editor based on type */}
          {contentType === ContentType.POST && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="What's happening in Web3? Share your thoughts, insights, or updates..."
                disabled={isLoading}
                showPreview={false}
                className="min-h-[200px]"
              />
            </div>
          )}

          {contentType === ContentType.POLL && (
            <PollCreator
              poll={poll}
              onPollChange={setPoll}
              disabled={isLoading}
              className="mb-6"
            />
          )}

          {contentType === ContentType.PROPOSAL && (
            <ProposalCreator
              proposal={proposal}
              onProposalChange={setProposal}
              disabled={isLoading}
              className="mb-6"
            />
          )}

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
              disabled={
                isLoading ||
                (contentType === ContentType.POST && content.trim() === '') ||
                (contentType === ContentType.POLL && (!poll || !poll.question.trim() || poll.options.filter(opt => opt.text.trim()).length < 2)) ||
                (contentType === ContentType.PROPOSAL && (!proposal || !proposal.title.trim() || !proposal.description.trim())) ||
                (postType === 'nft' && (!nftAddress || !nftTokenId))
              }
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