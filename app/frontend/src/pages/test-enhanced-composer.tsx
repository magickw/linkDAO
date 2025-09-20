import React, { useState } from 'react';
import Head from 'next/head';
import { EnhancedPostComposer } from '../components/EnhancedPostComposer';
import { RichPostInput, PostDraft } from '../types/enhancedPost';
import { DraftService } from '../services/draftService';

export default function TestEnhancedComposer() {
  const [isLoading, setIsLoading] = useState(false);
  const [submittedPosts, setSubmittedPosts] = useState<RichPostInput[]>([]);

  const handleSubmit = async (post: RichPostInput) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSubmittedPosts(prev => [post, ...prev]);
    setIsLoading(false);
  };

  const handleDraftSave = (draft: PostDraft) => {
    console.log('Draft saved:', draft);
  };

  const handleDraftLoad = (draftId: string) => {
    console.log('Loading draft:', draftId);
    return null;
  };

  return (
    <>
      <Head>
        <title>Enhanced Post Composer Test - LinkDAO</title>
        <meta name="description" content="Test page for the enhanced post composer" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Enhanced Post Composer Test
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Testing the new enhanced post composer with rich content support
              </p>
            </div>

            {/* Enhanced Post Composer */}
            <div className="mb-8">
              <EnhancedPostComposer
                context="feed"
                onSubmit={handleSubmit}
                onDraftSave={handleDraftSave}
                onDraftLoad={handleDraftLoad}
                isLoading={isLoading}
                className="mb-6"
              />
            </div>

            {/* Community Context Example */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Community Context Example
              </h2>
              <EnhancedPostComposer
                context="community"
                communityId="test-community"
                onSubmit={handleSubmit}
                onDraftSave={handleDraftSave}
                onDraftLoad={handleDraftLoad}
                isLoading={isLoading}
                className="mb-6"
              />
            </div>

            {/* Draft Statistics */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Draft Statistics
              </h2>
              <DraftStats />
            </div>

            {/* Submitted Posts */}
            {submittedPosts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Submitted Posts ({submittedPosts.length})
                </h2>
                <div className="space-y-4">
                  {submittedPosts.map((post, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                          {post.contentType.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {post.title && (
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {post.title}
                        </h3>
                      )}
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        {post.content}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        {post.hashtags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                        {post.mentions.map((mention, mentionIndex) => (
                          <span
                            key={mentionIndex}
                            className="bg-secondary-100 dark:bg-secondary-900/20 text-secondary-700 dark:text-secondary-300 px-2 py-1 rounded"
                          >
                            @{mention}
                          </span>
                        ))}
                      </div>
                      
                      {post.media && post.media.length > 0 && (
                        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                          📎 {post.media.length} media file(s) attached
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Draft Statistics Component
function DraftStats() {
  const [stats, setStats] = useState(DraftService.getDraftStats());
  const [drafts, setDrafts] = useState(DraftService.getAllDrafts());

  const refreshStats = () => {
    setStats(DraftService.getDraftStats());
    setDrafts(DraftService.getAllDrafts());
  };

  const clearAllDrafts = () => {
    drafts.forEach(draft => {
      DraftService.deleteDraft(
        draft.communityId ? 'community' : 'feed',
        draft.communityId
      );
    });
    refreshStats();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {stats.total}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Drafts
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.byContentType.text}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Text Drafts
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.byContentType.media}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Media Drafts
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.byContentType.poll + stats.byContentType.proposal}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Interactive
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={refreshStats}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
        >
          Refresh Stats
        </button>
        
        {stats.total > 0 && (
          <button
            onClick={clearAllDrafts}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Clear All Drafts
          </button>
        )}
      </div>

      {drafts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recent Drafts
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {drafts.slice(0, 5).map((draft, index) => (
              <div
                key={draft.id}
                className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {draft.contentType} - {draft.content.slice(0, 30)}...
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {draft.updatedAt.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}