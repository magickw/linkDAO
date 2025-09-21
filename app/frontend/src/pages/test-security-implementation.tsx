/**
 * Security Implementation Test Page
 * Demonstrates all security features and validation
 */

import React, { useState } from 'react';
import { NextPage } from 'next';
import { Shield, AlertTriangle, CheckCircle, Upload, Link, Coins } from 'lucide-react';
import {
  SecurityProvider,
  SecurityValidationWrapper,
  SecurityAlert,
  useSecurity,
  SecurityUtils
} from '../security';

const SecurityTestPage: NextPage = () => {
  return (
    <SecurityProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <Shield className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400" />
            <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Security Implementation Test
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Comprehensive security validation for the enhanced social dashboard
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ContentSecurityTest />
            <MediaSecurityTest />
            <LinkSecurityTest />
            <TransactionSecurityTest />
          </div>

          <div className="mt-8">
            <ComprehensiveSecurityTest />
          </div>
        </div>
      </div>
    </SecurityProvider>
  );
};

const ContentSecurityTest: React.FC = () => {
  const [content, setContent] = useState('');
  const [securityState, securityActions] = useSecurity();

  const testCases = [
    {
      name: 'Safe Content',
      content: '<p>This is <strong>safe</strong> content with <em>formatting</em>.</p>'
    },
    {
      name: 'XSS Attempt',
      content: '<script>alert("XSS Attack!")</script><p>Malicious content</p>'
    },
    {
      name: 'Event Handler Injection',
      content: '<img src="x" onerror="alert(\'XSS\')" /><p>Image with event handler</p>'
    },
    {
      name: 'JavaScript Protocol',
      content: '<a href="javascript:alert(\'XSS\')">Click me</a>'
    }
  ];

  const handleValidateContent = async (testContent: string) => {
    setContent(testContent);
    await securityActions.validateContent(testContent);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Content Security Validation
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Test Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            rows={4}
            placeholder="Enter content to validate..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {testCases.map((testCase, index) => (
            <button
              key={index}
              onClick={() => handleValidateContent(testCase.content)}
              className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              {testCase.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleValidateContent(content)}
          disabled={!content || securityState.isValidating}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {securityState.isValidating ? 'Validating...' : 'Validate Content'}
        </button>

        {securityState.lastValidation && (
          <SecurityAlert
            level={securityState.riskLevel}
            errors={securityState.errors}
            warnings={securityState.warnings}
            blocked={securityState.blocked}
            recommendations={securityActions.getSecurityRecommendations()}
          />
        )}
      </div>
    </div>
  );
};

const MediaSecurityTest: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [securityState, securityActions] = useSecurity();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(selectedFiles);
  };

  const handleValidateMedia = async () => {
    if (files.length > 0) {
      await securityActions.validateMedia(files);
    }
  };

  const createTestFile = (name: string, type: string, content: string) => {
    return new File([content], name, { type });
  };

  const testFiles = [
    () => createTestFile('safe-image.jpg', 'image/jpeg', 'fake-jpeg-content'),
    () => createTestFile('malicious.exe', 'application/exe', 'malicious-content'),
    () => createTestFile('large-file.jpg', 'image/jpeg', 'x'.repeat(20 * 1024 * 1024)),
    () => createTestFile('script.js', 'application/javascript', 'alert("xss")')
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Media Security Validation
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload Files
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {testFiles.map((createFile, index) => (
            <button
              key={index}
              onClick={() => {
                const file = createFile();
                setFiles([file]);
              }}
              className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            >
              Test {index + 1}
            </button>
          ))}
        </div>

        {files.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Selected files: {files.map(f => f.name).join(', ')}
          </div>
        )}

        <button
          onClick={handleValidateMedia}
          disabled={files.length === 0 || securityState.isValidating}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload className="inline-block w-4 h-4 mr-2" />
          {securityState.isValidating ? 'Validating...' : 'Validate Media'}
        </button>

        {securityState.lastValidation && (
          <SecurityAlert
            level={securityState.riskLevel}
            errors={securityState.errors}
            warnings={securityState.warnings}
            blocked={securityState.blocked}
            recommendations={securityActions.getSecurityRecommendations()}
          />
        )}
      </div>
    </div>
  );
};

const LinkSecurityTest: React.FC = () => {
  const [url, setUrl] = useState('');
  const [securityState, securityActions] = useSecurity();

  const testUrls = [
    'https://example.com',
    'http://localhost:3000/malicious',
    'javascript:alert("xss")',
    'https://bit.ly/suspicious-link',
    'ftp://malicious-server.com/file'
  ];

  const handleValidateUrl = async (testUrl: string) => {
    setUrl(testUrl);
    await securityActions.validateUrl(testUrl);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Link Security Validation
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL to Validate
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            placeholder="Enter URL to validate..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {testUrls.map((testUrl, index) => (
            <button
              key={index}
              onClick={() => handleValidateUrl(testUrl)}
              className="px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
            >
              Test {index + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleValidateUrl(url)}
          disabled={!url || securityState.isValidating}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Link className="inline-block w-4 h-4 mr-2" />
          {securityState.isValidating ? 'Validating...' : 'Validate URL'}
        </button>

        {securityState.lastValidation && (
          <SecurityAlert
            level={securityState.riskLevel}
            errors={securityState.errors}
            warnings={securityState.warnings}
            blocked={securityState.blocked}
            recommendations={securityActions.getSecurityRecommendations()}
          />
        )}
      </div>
    </div>
  );
};

const TransactionSecurityTest: React.FC = () => {
  const [securityState, securityActions] = useSecurity();

  const testTransactions = [
    {
      name: 'Normal Transaction',
      transaction: {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000', // 1 ETH
        gasLimit: '21000',
        gasPrice: '20000000000' // 20 gwei
      }
    },
    {
      name: 'High Gas Price',
      transaction: {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasLimit: '21000',
        gasPrice: '1000000000000' // 1000 gwei
      }
    },
    {
      name: 'Large Amount',
      transaction: {
        to: '0x1234567890123456789012345678901234567890',
        value: '100000000000000000000', // 100 ETH
        gasLimit: '21000',
        gasPrice: '20000000000'
      }
    }
  ];

  const handleValidateTransaction = async (transaction: any) => {
    // Mock provider for testing
    const mockProvider = {
      estimateGas: () => Promise.resolve(BigInt(21000)),
      getFeeData: () => Promise.resolve({ gasPrice: BigInt(20000000000) })
    } as any;

    await securityActions.validateTransaction(transaction, mockProvider);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Transaction Security Validation
      </h2>

      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Test different transaction scenarios to see security validation in action.
        </div>

        <div className="space-y-2">
          {testTransactions.map((test, index) => (
            <button
              key={index}
              onClick={() => handleValidateTransaction(test.transaction)}
              disabled={securityState.isValidating}
              className="w-full px-4 py-2 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-md hover:bg-orange-200 dark:hover:bg-orange-800 disabled:opacity-50 transition-colors text-left"
            >
              <Coins className="inline-block w-4 h-4 mr-2" />
              {test.name}
            </button>
          ))}
        </div>

        {securityState.lastValidation && (
          <SecurityAlert
            level={securityState.riskLevel}
            errors={securityState.errors}
            warnings={securityState.warnings}
            blocked={securityState.blocked}
            recommendations={securityActions.getSecurityRecommendations()}
          />
        )}
      </div>
    </div>
  );
};

const ComprehensiveSecurityTest: React.FC = () => {
  const [securityState, securityActions] = useSecurity();

  const handleComprehensiveScan = async () => {
    const testData = {
      content: '<script>alert("xss")</script><p>Mixed content</p>',
      urls: ['https://example.com', 'javascript:alert("xss")'],
      media: [new File(['test'], 'test.exe', { type: 'application/exe' })]
    };

    await securityActions.performComprehensiveScan(testData);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Comprehensive Security Scan
      </h2>

      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Perform a comprehensive security scan that validates content, media, and URLs together.
        </div>

        <button
          onClick={handleComprehensiveScan}
          disabled={securityState.isValidating}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <AlertTriangle className="inline-block w-4 h-4 mr-2" />
          {securityState.isValidating ? 'Scanning...' : 'Run Comprehensive Scan'}
        </button>

        {securityState.lastValidation && (
          <div className="space-y-4">
            <SecurityAlert
              level={securityState.riskLevel}
              errors={securityState.errors}
              warnings={securityState.warnings}
              blocked={securityState.blocked}
              recommendations={securityActions.getSecurityRecommendations()}
            />

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Security Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Risk Level:</span>
                  <span className={`ml-2 font-medium ${SecurityUtils.getRiskLevelColor(securityState.riskLevel)}`}>
                    {securityState.riskLevel.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Errors:</span>
                  <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                    {securityState.errors.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Warnings:</span>
                  <span className="ml-2 font-medium text-yellow-600 dark:text-yellow-400">
                    {securityState.warnings.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Blocked:</span>
                  <span className="ml-2 font-medium text-orange-600 dark:text-orange-400">
                    {securityState.blocked.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityTestPage;