/**
 * Dispute Filing Form - Quick dispute creation with evidence upload
 * Sprint 3: Pre-fill from order, drag-and-drop evidence
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { Button } from '@/design-system/components/Button';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';

type IssueCategory = 'not_received' | 'damaged' | 'not_as_described' | 'counterfeit' | 'other';

interface EvidenceFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video' | 'document';
}

const ISSUE_CATEGORIES: Array<{ value: IssueCategory; label: string; description: string }> = [
  {
    value: 'not_received',
    label: 'Item Not Received',
    description: 'Package never arrived or tracking shows no delivery',
  },
  {
    value: 'damaged',
    label: 'Item Damaged',
    description: 'Product arrived broken or damaged',
  },
  {
    value: 'not_as_described',
    label: 'Not As Described',
    description: 'Item differs significantly from listing',
  },
  {
    value: 'counterfeit',
    label: 'Counterfeit/Fake',
    description: 'Product appears to be counterfeit',
  },
  {
    value: 'other',
    label: 'Other Issue',
    description: 'Different problem not listed above',
  },
];

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB total

const NewDisputePage: React.FC = () => {
  const router = useRouter();
  const { orderId } = router.query;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orderIdInput, setOrderIdInput] = useState('');
  const [category, setCategory] = useState<IssueCategory | ''>('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (orderId && typeof orderId === 'string') {
      setOrderIdInput(orderId);
    }
  }, [orderId]);

  const getFileType = (file: File): 'image' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const getTotalSize = () => {
    return evidence.reduce((sum, file) => sum + file.file.size, 0);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newFiles: EvidenceFile[] = [];
    let totalSize = getTotalSize();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (evidence.length + newFiles.length >= MAX_FILES) {
        setErrors({ ...errors, evidence: `Maximum ${MAX_FILES} files allowed` });
        break;
      }

      if (totalSize + file.size > MAX_FILE_SIZE) {
        setErrors({ ...errors, evidence: 'Total file size exceeds 50MB limit' });
        break;
      }

      const fileType = getFileType(file);
      const preview = fileType === 'image' ? URL.createObjectURL(file) : '';

      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        preview,
        type: fileType,
      });

      totalSize += file.size;
    }

    setEvidence([...evidence, ...newFiles]);
    setErrors({ ...errors, evidence: '' });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (id: string) => {
    const file = evidence.find(f => f.id === id);
    if (file && file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setEvidence(evidence.filter(f => f.id !== id));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!orderIdInput.trim()) {
      newErrors.orderId = 'Order ID is required';
    }

    if (!category) {
      newErrors.category = 'Please select an issue category';
    }

    if (!description.trim()) {
      newErrors.description = 'Please describe the issue';
    } else if (description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (evidence.length === 0) {
      newErrors.evidence = 'Please upload at least one piece of evidence';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const disputeId = `DIS-${Date.now()}`;
      
      // Store in session for demo
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(`dispute_${disputeId}`, JSON.stringify(disputeData));
      }

      router.push(`/support/disputes/${disputeId}`);
    } catch (error) {
      console.error('Failed to submit dispute:', error);
      setErrors({ ...errors, submit: 'Failed to submit dispute. Please try again.' });
      setSubmitting(false);
    }
  };

  const getFileIcon = (type: 'image' | 'video' | 'document') => {
    switch (type) {
      case 'image':
        return <ImageIcon size={20} />;
      case 'video':
        return <Video size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  return (
    <Layout title="File a Dispute - LinkDAO Marketplace" fullWidth={true}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header */}
          <div>
            <button
              onClick={() => router.back()}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-2 flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">File a Dispute</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Report an issue with your order. Our DAO arbitrators will review your case within 72 hours.
            </p>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-medium mb-1">Before filing a dispute:</p>
                <ul className="space-y-1 text-blue-800 dark:text-blue-300">
                  <li>• Try contacting the seller first</li>
                  <li>• Gather evidence (photos, videos, messages)</li>
                  <li>• Be detailed and factual in your description</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Order ID */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Order ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="e.g., ORD-001"
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.orderId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.orderId && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.orderId}</p>
              )}
            </div>

            {/* Issue Category */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Issue Category <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {ISSUE_CATEGORIES.map((cat) => (
                  <label
                    key={cat.value}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      category === cat.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={category === cat.value}
                      onChange={(e) => setCategory(e.target.value as IssueCategory)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{cat.label}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{cat.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.category && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errors.category}</p>
              )}
            </div>

            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail. Include dates, what you expected vs. what happened, and any communication with the seller..."
                rows={6}
                className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <div className="flex items-center justify-between mt-2">
                {errors.description ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {description.length} characters (minimum 20)
                  </p>
                )}
              </div>
            </div>

            {/* Evidence Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Evidence <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upload photos, videos, or documents. Max {MAX_FILES} files, 50MB total.
              </p>

              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Upload size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-gray-900 dark:text-white font-medium mb-1">
                  Drag and drop files here
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  or click to browse
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {errors.evidence && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errors.evidence}</p>
              )}

              {/* File Preview */}
              {evidence.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Uploaded Files ({evidence.length}/{MAX_FILES})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {evidence.map((file) => (
                      <div
                        key={file.id}
                        className="relative group bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden"
                      >
                        {file.type === 'image' ? (
                          <img
                            src={file.preview}
                            alt={file.file.name}
                            className="w-full h-32 object-cover"
                          />
                        ) : (
                          <div className="w-full h-32 flex flex-col items-center justify-center">
                            {getFileIcon(file.type)}
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 px-2 text-center truncate w-full">
                              {file.file.name}
                            </p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                          {(file.file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Total size: {(getTotalSize() / 1024 / 1024).toFixed(2)} MB / 50 MB
                  </p>
                </div>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-900 dark:text-red-200">{errors.submit}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Submit Dispute
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default NewDisputePage;
