import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import {
  dataDeletionService,
  UserDataSummary,
  DataCategories,
  DeletionResult,
  DeletionStatus
} from '@/services/dataDeletionService';

export default function DataDeletionPage() {
  const router = useRouter();
  const { isConnected, address } = useWeb3();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dataSummary, setDataSummary] = useState<UserDataSummary | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<DataCategories>({
    profile: false,
    posts: false,
    comments: false,
    messages: false,
    socialConnections: false,
    follows: false,
    bookmarks: false,
    notifications: false,
    preferences: false
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionResult, setDeletionResult] = useState<DeletionResult | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);

  // Check for confirmation code in URL (for Facebook callback)
  const [statusCheck, setStatusCheck] = useState<DeletionStatus | null>(null);

  useEffect(() => {
    const { confirmation } = router.query;
    if (confirmation && typeof confirmation === 'string') {
      checkDeletionStatus(confirmation);
    }
  }, [router.query]);

  useEffect(() => {
    if (isConnected) {
      fetchDataSummary();
    } else {
      setLoading(false);
    }
  }, [isConnected]);

  const fetchDataSummary = async () => {
    try {
      setLoading(true);
      const summary = await dataDeletionService.getUserDataSummary();
      setDataSummary(summary);
    } catch (error: any) {
      addToast(error.message || 'Failed to fetch data summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkDeletionStatus = async (code: string) => {
    try {
      const status = await dataDeletionService.getDeletionStatus(code);
      setStatusCheck(status);
    } catch (error: any) {
      addToast(error.message || 'Failed to check deletion status', 'error');
    }
  };

  const handleCategoryToggle = (category: keyof DataCategories) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedCategories).every(v => v);
    const newValue = !allSelected;
    setSelectedCategories({
      profile: newValue,
      posts: newValue,
      comments: newValue,
      messages: newValue,
      socialConnections: newValue,
      follows: newValue,
      bookmarks: newValue,
      notifications: newValue,
      preferences: newValue
    });
  };

  const handleDeleteSelected = () => {
    if (!Object.values(selectedCategories).some(v => v)) {
      addToast('Please select at least one data category to delete', 'error');
      return;
    }
    setDeleteAll(false);
    setShowConfirmModal(true);
  };

  const handleDeleteAll = () => {
    setDeleteAll(true);
    setShowConfirmModal(true);
  };

  const confirmDeletion = async () => {
    if (confirmationInput !== 'DELETE') {
      addToast('Please type DELETE to confirm', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      let result: DeletionResult;
      if (deleteAll) {
        result = await dataDeletionService.deleteAllData();
      } else {
        result = await dataDeletionService.deleteData(selectedCategories);
      }

      setDeletionResult(result);
      setShowConfirmModal(false);
      setConfirmationInput('');

      if (result.success) {
        addToast('Data deletion completed successfully', 'success');
        // Refresh the data summary
        fetchDataSummary();
      } else {
        addToast(result.message || 'Some data could not be deleted', 'error');
      }
    } catch (error: any) {
      addToast(error.message || 'Failed to delete data', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const categoryLabels: Record<keyof DataCategories, { label: string; description: string }> = {
    profile: {
      label: 'Profile Information',
      description: 'Your username, display name, bio, avatar, and contact information'
    },
    posts: {
      label: 'Posts & Statuses',
      description: 'All posts and status updates you have created'
    },
    comments: {
      label: 'Comments',
      description: 'Comments you have made on posts'
    },
    messages: {
      label: 'Messages & Conversations',
      description: 'Direct messages and conversations'
    },
    socialConnections: {
      label: 'Social Media Connections',
      description: 'Connected Twitter, Facebook, and LinkedIn accounts'
    },
    follows: {
      label: 'Follows & Blocks',
      description: 'Users you follow and users you have blocked'
    },
    bookmarks: {
      label: 'Bookmarks',
      description: 'Posts and content you have bookmarked'
    },
    notifications: {
      label: 'Notifications',
      description: 'All notification history'
    },
    preferences: {
      label: 'Preferences & Settings',
      description: 'Account preferences and notification settings'
    }
  };

  // Status check display (for Facebook callback)
  if (statusCheck) {
    return (
      <Layout title="Data Deletion Status - LinkDAO">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
              statusCheck.status === 'completed'
                ? 'bg-green-100 dark:bg-green-900'
                : statusCheck.status === 'failed'
                  ? 'bg-red-100 dark:bg-red-900'
                  : 'bg-yellow-100 dark:bg-yellow-900'
            }`}>
              {statusCheck.status === 'completed' ? (
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : statusCheck.status === 'failed' ? (
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Data Deletion {statusCheck.status === 'completed' ? 'Complete' : statusCheck.status === 'failed' ? 'Failed' : 'In Progress'}
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {statusCheck.message}
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-500">
              Confirmation Code: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{router.query.confirmation}</code>
            </p>

            <button
              onClick={() => router.push('/data-deletion')}
              className="mt-8 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Return to Data Deletion Page
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Success screen after deletion
  if (deletionResult) {
    return (
      <Layout title="Data Deletion Complete - LinkDAO">
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
              deletionResult.success ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'
            }`}>
              {deletionResult.success ? (
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {deletionResult.success ? 'Data Deletion Complete' : 'Partial Deletion Complete'}
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {deletionResult.message}
            </p>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Confirmation Code:</p>
              <code className="text-lg font-mono text-primary-600 dark:text-primary-400">
                {deletionResult.confirmationCode}
              </code>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Save this code for your records
              </p>
            </div>

            {deletionResult.deletedCategories.length > 0 && (
              <div className="text-left mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Deleted:</h3>
                <ul className="list-disc pl-6 text-sm text-gray-600 dark:text-gray-400">
                  {deletionResult.deletedCategories.map(cat => (
                    <li key={cat}>{categoryLabels[cat as keyof DataCategories]?.label || cat}</li>
                  ))}
                </ul>
              </div>
            )}

            {deletionResult.failedCategories.length > 0 && (
              <div className="text-left mb-4">
                <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Could not delete:</h3>
                <ul className="list-disc pl-6 text-sm text-gray-600 dark:text-gray-400">
                  {deletionResult.failedCategories.map(cat => (
                    <li key={cat}>{categoryLabels[cat as keyof DataCategories]?.label || cat}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setDeletionResult(null)}
              className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Data Deletion - LinkDAO">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Data Deletion
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Manage and delete your personal data stored on LinkDAO. This page allows you to exercise your rights under GDPR, CCPA, and other privacy regulations.
        </p>

        {/* Warning Banner */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Important Notice</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Data deletion is <strong>permanent and cannot be undone</strong>. Blockchain data (transactions, NFTs, governance votes) cannot be deleted as blockchains are immutable by design.
              </p>
            </div>
          </div>
        </div>

        {!isConnected ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to view and manage your data.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your data summary...</p>
          </div>
        ) : (
          <>
            {/* Data Summary */}
            {dataSummary && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Your Data Summary
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{dataSummary.posts.count}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Posts</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{dataSummary.comments.count}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Comments</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{dataSummary.messages.conversationCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Conversations</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{dataSummary.socialConnections.platforms.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Connected Accounts</p>
                  </div>
                </div>

                {dataSummary.profile.fields.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Profile data stored: {dataSummary.profile.fields.join(', ')}
                    </p>
                  </div>
                )}

                {dataSummary.socialConnections.platforms.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Connected platforms: {dataSummary.socialConnections.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Data Categories Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Select Data to Delete
                </h2>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {Object.values(selectedCategories).every(v => v) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-3">
                {Object.entries(categoryLabels).map(([key, { label, description }]) => (
                  <label
                    key={key}
                    className="flex items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories[key as keyof DataCategories]}
                      onChange={() => handleCategoryToggle(key as keyof DataCategories)}
                      className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleDeleteSelected}
                  disabled={!Object.values(selectedCategories).some(v => v)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Delete Selected Data
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex-1 px-6 py-3 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
                >
                  Delete All My Data
                </button>
              </div>
            </div>

            {/* Policy Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Data Retention Policy
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                <li>• Deleted data is removed from active systems within 30 days</li>
                <li>• Backup data is purged within 90 days</li>
                <li>• Some data may be retained for legal compliance</li>
                <li>• Blockchain data is permanent and cannot be deleted</li>
                <li>• Anonymous, aggregated data may be retained for analytics</li>
              </ul>
              <a
                href="/privacy"
                className="inline-block mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Read our full Privacy Policy →
              </a>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Data Deletion
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {deleteAll
                ? 'You are about to delete ALL your data. This action is permanent and cannot be undone.'
                : 'You are about to delete the selected data categories. This action is permanent and cannot be undone.'}
            </p>

            {!deleteAll && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected for deletion:</p>
                <ul className="text-sm text-gray-600 dark:text-gray-400">
                  {Object.entries(selectedCategories)
                    .filter(([_, selected]) => selected)
                    .map(([key]) => (
                      <li key={key}>• {categoryLabels[key as keyof DataCategories].label}</li>
                    ))}
                </ul>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type DELETE to confirm:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmationInput('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletion}
                disabled={confirmationInput !== 'DELETE' || isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Confirm Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
