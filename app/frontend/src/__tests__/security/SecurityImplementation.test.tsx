/**
 * Comprehensive Security Implementation Tests
 * Tests all security components and integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';
import '@testing-library/jest-dom';

// Import security components
import {
  InputSanitizer,
  MediaValidator,
  LinkPreviewSecurity,
  TokenTransactionSecurity,
  WalletSecurity,
  SecurityManager,
  SecurityProvider,
  SecurityAlert,
  SecurityValidationWrapper,
  useSecurity,
  SecurityUtils
} from '../../security';

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    getAddress: jest.fn((address) => address),
    parseUnits: jest.fn(() => BigInt(100000000000)),
    parseEther: jest.fn(() => BigInt(1000000000000000000)),
    formatUnits: jest.fn(() => '100'),
    formatEther: jest.fn(() => '1.0'),
    TransactionRequest: {},
    Provider: class MockProvider {}
  }
}));

// Mock crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      generateKey: jest.fn(() => Promise.resolve({})),
      encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
      decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16)))
    },
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  }
});

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('<html><head><title>Test</title></head><body>Test content</body></html>'),
    headers: {
      get: (name: string) => {
        if (name === 'content-type') return 'text/html';
        if (name === 'content-length') return '1000';
        return null;
      }
    }
  })
) as jest.Mock;

describe('Security Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('InputSanitizer', () => {
    it('should sanitize malicious content', () => {
      const maliciousContent = '<script>alert("xss")</script><p>Safe content</p>';
      const result = InputSanitizer.sanitizeRichContent(maliciousContent);

      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).toContain('Safe content');
      expect(result.blocked).toContain('script tags');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate hashtags and mentions', () => {
      const input = '#validtag @validuser #invalid-tag! @invalid@user';
      const result = InputSanitizer.sanitizeHashtagsAndMentions(input);

      expect(result.sanitized).toContain('#validtag');
      expect(result.sanitized).toContain('@validuser');
      expect(result.blocked.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate URLs', () => {
      const validUrl = 'https://example.com/path';
      const invalidUrl = 'javascript:alert("xss")';

      const validResult = InputSanitizer.sanitizeUrl(validUrl);
      const invalidResult = InputSanitizer.sanitizeUrl(invalidUrl);

      expect(validResult.sanitized).toBe(validUrl);
      expect(validResult.blocked).toHaveLength(0);

      expect(invalidResult.sanitized).toBe('');
      expect(invalidResult.blocked.length).toBeGreaterThan(0);
    });

    it('should validate content structure', () => {
      const shortContent = '';
      const longContent = 'a'.repeat(20000);
      const normalContent = 'This is normal content';

      const shortResult = InputSanitizer.validateContentStructure(shortContent, 'post');
      const longResult = InputSanitizer.validateContentStructure(longContent, 'post');
      const normalResult = InputSanitizer.validateContentStructure(normalContent, 'post');

      expect(shortResult.valid).toBe(false);
      expect(longResult.valid).toBe(false);
      expect(normalResult.valid).toBe(true);
    });
  });

  describe('MediaValidator', () => {
    it('should validate file properties', async () => {
      const validFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const invalidFile = new File(['test content'], 'test.exe', { type: 'application/exe' });

      const validResult = await MediaValidator.validateMedia(validFile);
      const invalidResult = await MediaValidator.validateMedia(invalidFile);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should detect file size limits', async () => {
      const largeFile = new File(['x'.repeat(20 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const result = await MediaValidator.validateMedia(largeFile, { maxFileSize: 10 * 1024 * 1024 });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });
  });

  describe('LinkPreviewSecurity', () => {
    it('should generate secure link previews', async () => {
      const url = 'https://example.com';
      const result = await LinkPreviewSecurity.generatePreview(url);

      expect(result.url).toBe(url);
      expect(result.security.sandboxed).toBe(true);
      expect(result.title).toBeDefined();
    });

    it('should block malicious URLs', async () => {
      const maliciousUrl = 'http://localhost/malicious';
      const result = await LinkPreviewSecurity.generatePreview(maliciousUrl);

      expect(result.security.safe).toBe(false);
      expect(result.security.blocked.length).toBeGreaterThan(0);
    });
  });

  describe('TokenTransactionSecurity', () => {
    it('should validate transaction properties', async () => {
      const mockProvider = new ethers.Provider();
      const validTransaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: ethers.parseEther('1'),
        gasLimit: BigInt(21000),
        gasPrice: ethers.parseUnits('20', 'gwei')
      };

      const result = await TokenTransactionSecurity.validateTransaction(
        validTransaction,
        mockProvider
      );

      expect(result.valid).toBe(true);
      expect(result.security.checks.length).toBeGreaterThan(0);
    });

    it('should detect high gas prices', async () => {
      const mockProvider = new ethers.Provider();
      const expensiveTransaction = {
        to: '0x1234567890123456789012345678901234567890',
        value: ethers.parseEther('1'),
        gasPrice: ethers.parseUnits('1000', 'gwei') // Very high gas price
      };

      const result = await TokenTransactionSecurity.validateTransaction(
        expensiveTransaction,
        mockProvider
      );

      expect(result.errors.some(e => e.includes('Gas price'))).toBe(true);
    });
  });

  describe('WalletSecurity', () => {
    beforeEach(async () => {
      await WalletSecurity.initialize();
    });

    it('should create secure sessions', async () => {
      const mockProvider = new ethers.Provider();
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const networkId = 1;

      const result = await WalletSecurity.createSession(
        walletAddress,
        networkId,
        mockProvider
      );

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.walletAddress).toBe(walletAddress);
    });

    it('should validate sessions', async () => {
      const mockProvider = new ethers.Provider();
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const networkId = 1;

      const createResult = await WalletSecurity.createSession(
        walletAddress,
        networkId,
        mockProvider
      );

      expect(createResult.success).toBe(true);
      
      if (createResult.session) {
        const validateResult = await WalletSecurity.validateSession(createResult.session.id);
        expect(validateResult.success).toBe(true);
      }
    });
  });

  describe('SecurityManager', () => {
    let securityManager: SecurityManager;

    beforeEach(async () => {
      securityManager = SecurityManager.getInstance();
      await securityManager.initialize();
    });

    it('should validate rich content', async () => {
      const content = '<p>Safe content</p><script>alert("xss")</script>';
      const context = SecurityUtils.createSecurityContext();

      const result = await securityManager.validateRichContent(content, context);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe('critical');
    });

    it('should perform comprehensive scans', async () => {
      const data = {
        content: '<p>Test content</p>',
        urls: ['https://example.com'],
        media: [new File(['test'], 'test.jpg', { type: 'image/jpeg' })]
      };
      const context = SecurityUtils.createSecurityContext();

      const result = await securityManager.performSecurityScan(data, context);

      expect(result).toBeDefined();
      expect(result.riskLevel).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('React Components', () => {
    const TestComponent = () => {
      const [securityState, securityActions] = useSecurity();

      return (
        <div>
          <div data-testid="risk-level">{securityState.riskLevel}</div>
          <div data-testid="errors">{securityState.errors.join(', ')}</div>
          <button
            onClick={() => securityActions.validateContent('<script>alert("test")</script>')}
            data-testid="validate-button"
          >
            Validate
          </button>
        </div>
      );
    };

    it('should render SecurityProvider', () => {
      render(
        <SecurityProvider>
          <div data-testid="child">Test Child</div>
        </SecurityProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should render SecurityAlert', () => {
      render(
        <SecurityAlert
          level="high"
          errors={['Test error']}
          warnings={['Test warning']}
          blocked={['Test blocked']}
          recommendations={['Test recommendation']}
        />
      );

      expect(screen.getByText('High Risk Detected')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('Test warning')).toBeInTheDocument();
    });

    it('should render SecurityValidationWrapper', () => {
      render(
        <SecurityProvider>
          <SecurityValidationWrapper
            validationType="content"
            validationData="<p>Test content</p>"
          >
            <div data-testid="wrapped-content">Wrapped Content</div>
          </SecurityValidationWrapper>
        </SecurityProvider>
      );

      expect(screen.getByTestId('wrapped-content')).toBeInTheDocument();
    });

    it('should use security hook', async () => {
      render(
        <SecurityProvider>
          <TestComponent />
        </SecurityProvider>
      );

      expect(screen.getByTestId('risk-level')).toHaveTextContent('low');

      fireEvent.click(screen.getByTestId('validate-button'));

      await waitFor(() => {
        expect(screen.getByTestId('risk-level')).toHaveTextContent('critical');
      });
    });
  });

  describe('SecurityUtils', () => {
    it('should provide utility functions', () => {
      const content = '<script>alert("test")</script><p>Safe content</p>';
      const result = SecurityUtils.sanitizeContent(content);

      expect(result.sanitized).not.toContain('<script>');
      expect(result.blocked.length).toBeGreaterThan(0);
    });

    it('should check content safety', () => {
      const safeContent = '<p>This is safe content</p>';
      const unsafeContent = '<script>alert("xss")</script>';

      expect(SecurityUtils.isContentSafe(safeContent)).toBe(true);
      expect(SecurityUtils.isContentSafe(unsafeContent)).toBe(false);
    });

    it('should provide risk level colors', () => {
      expect(SecurityUtils.getRiskLevelColor('low')).toContain('green');
      expect(SecurityUtils.getRiskLevelColor('medium')).toContain('yellow');
      expect(SecurityUtils.getRiskLevelColor('high')).toContain('orange');
      expect(SecurityUtils.getRiskLevelColor('critical')).toContain('red');
    });

    it('should create security context', () => {
      const context = SecurityUtils.createSecurityContext({
        userId: 'test-user'
      });

      expect(context.userId).toBe('test-user');
      expect(context.timestamp).toBeInstanceOf(Date);
      expect(context.userAgent).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete security workflow', async () => {
      const securityManager = SecurityManager.getInstance();
      await securityManager.initialize();

      const context = SecurityUtils.createSecurityContext({
        userId: 'test-user',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      // Test content validation
      const contentResult = await securityManager.validateRichContent(
        '<p>Safe content</p>',
        context
      );
      expect(contentResult.valid).toBe(true);

      // Test media validation
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mediaResult = await securityManager.validateMediaUpload(file, context);
      expect(mediaResult.valid).toBe(true);

      // Test URL validation
      const urlResult = await securityManager.generateSecureLinkPreview(
        'https://example.com',
        context
      );
      expect(urlResult.data).toBeDefined();

      // Test comprehensive scan
      const scanResult = await securityManager.performSecurityScan({
        content: '<p>Test content</p>',
        media: [file],
        urls: ['https://example.com']
      }, context);

      expect(scanResult.riskLevel).toBeDefined();
      expect(scanResult.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle security errors gracefully', async () => {
      const securityManager = SecurityManager.getInstance();
      await securityManager.initialize();

      const context = SecurityUtils.createSecurityContext();

      // Test with malicious content
      const result = await securityManager.validateRichContent(
        '<script>alert("xss")</script><iframe src="javascript:alert(1)"></iframe>',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.blocked.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe('critical');
      expect(result.recommendations).toContain('Do not proceed with this transaction due to critical errors');
    });
  });
});

export default {};