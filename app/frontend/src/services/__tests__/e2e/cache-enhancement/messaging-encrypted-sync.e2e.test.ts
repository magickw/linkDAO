import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * E2E Tests for Messaging with Encrypted Storage and Sync
 * Tests privacy-first messaging, IndexedDB encryption, and conversation caching
 */

test.describe('Messaging - Encrypted Storage and Sync', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      permissions: ['background-sync']
    });
    page = await context.newPage();
    
    // Enable service worker debugging
    await page.addInitScript(() => {
      window.cacheTestMode = true;
      window.messagingTestMode = true;
    });
    
    await page.goto('/');
    
    // Wait for service worker to be ready
    await page.waitForFunction(() => {
      return navigator.serviceWorker.controller !== null;
    });
    
    // Mock wallet connection for messaging
    await page.evaluate(() => {
      window.mockWalletConnected = true;
      window.mockWalletAddress = '0x1234567890123456789012345678901234567890';
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should encrypt message bodies in IndexedDB storage', async () => {
    await page.goto('/messages');
    
    // Wait for messaging interface
    await page.waitForSelector('[data-testid="messaging-interface"]');
    
    // Start a new conversation
    await page.click('[data-testid="new-conversation-button"]');
    await page.waitForSelector('[data-testid="recipient-input"]');
    
    await page.fill('[data-testid="recipient-input"]', '0x9876543210987654321098765432109876543210');
    await page.click('[data-testid="start-conversation-button"]');
    
    // Wait for conversation to open
    await page.waitForSelector('[data-testid="conversation-view"]');
    
    // Send a message
    const testMessage = 'This is a sensitive message that should be encrypted';
    await page.fill('[data-testid="message-input"]', testMessage);
    await page.click('[data-testid="send-message-button"]');
    
    // Wait for message to be sent and stored
    await page.waitForSelector('[data-testid="message-sent"]');
    
    // Verify message appears in UI
    const messageElement = await page.locator('[data-testid="message-content"]').last();
    await expect(messageElement).toHaveText(testMessage);
    
    // Check IndexedDB to verify encryption
    const encryptedData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('MessagingDB', 1);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['messages'], 'readonly');
          const store = transaction.objectStore('messages');
          const getRequest = store.getAll();
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result);
          };
        };
      });
    });
    
    // Verify data is encrypted (not plain text)
    const messages = encryptedData as any[];
    expect(messages.length).toBeGreaterThan(0);
    
    const lastMessage = messages[messages.length - 1];
    expect(lastMessage.encryptedData).toBeDefined();
    expect(lastMessage.iv).toBeDefined();
    
    // Encrypted data should not contain the original message
    const encryptedString = new TextDecoder().decode(lastMessage.encryptedData);
    expect(encryptedString).not.toContain(testMessage);
  });

  test('should use NetworkFirst for conversation lists', async () => {
    await page.goto('/messages');
    
    // Wait for conversations to load
    await page.waitForSelector('[data-testid="conversation-list"]');
    
    // Monitor network requests
    const networkRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/messages/conversations')) {
        networkRequests.push(request.url());
      }
    });
    
    // Get initial conversation count
    const initialConversations = await page.locator('[data-testid="conversation-item"]').count();
    
    // Navigate away and back
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="feed-container"]');
    
    const startTime = Date.now();
    await page.goto('/messages');
    
    // Should load quickly but still make network request
    await page.waitForSelector('[data-testid="conversation-list"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
    
    // Should have made network request for fresh data
    await page.waitForTimeout(1000);
    expect(networkRequests.length).toBeGreaterThan(0);
    
    // Conversation count should be consistent
    const currentConversations = await page.locator('[data-testid="conversation-item"]').count();
    expect(currentConversations).toBe(initialConversations);
  });

  test('should queue messages when offline with ordering preservation', async () => {
    await page.goto('/messages');
    
    // Open existing conversation or create new one
    await page.waitForSelector('[data-testid="conversation-list"]');
    
    const existingConversations = await page.locator('[data-testid="conversation-item"]').count();
    if (existingConversations > 0) {
      await page.click('[data-testid="conversation-item"]:first-child');
    } else {
      // Create new conversation
      await page.click('[data-testid="new-conversation-button"]');
      await page.fill('[data-testid="recipient-input"]', '0x9876543210987654321098765432109876543210');
      await page.click('[data-testid="start-conversation-button"]');
    }
    
    await page.waitForSelector('[data-testid="conversation-view"]');
    
    // Go offline
    await context.setOffline(true);
    await page.waitForSelector('[data-testid="offline-indicator"]');
    
    // Send multiple messages while offline
    const offlineMessages = [
      'First offline message',
      'Second offline message',
      'Third offline message'
    ];
    
    for (const message of offlineMessages) {
      await page.fill('[data-testid="message-input"]', message);
      await page.click('[data-testid="send-message-button"]');
      await page.waitForSelector('[data-testid="message-queued"]');
      await page.waitForTimeout(500); // Small delay between messages
    }
    
    // Verify messages appear in UI with queued status
    const queuedMessages = await page.locator('[data-testid="message-queued"]').count();
    expect(queuedMessages).toBe(3);
    
    // Verify messages are in correct order in UI
    const messageElements = await page.locator('[data-testid="message-content"]').all();
    const messageTexts = await Promise.all(messageElements.slice(-3).map(el => el.textContent()));
    
    expect(messageTexts[0]).toBe('First offline message');
    expect(messageTexts[1]).toBe('Second offline message');
    expect(messageTexts[2]).toBe('Third offline message');
    
    // Check offline queue in storage
    const queuedActions = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('offlineMessageQueue') || '[]');
    });
    
    expect(queuedActions.length).toBe(3);
    expect(queuedActions[0].data.content).toBe('First offline message');
    expect(queuedActions[1].data.content).toBe('Second offline message');
    expect(queuedActions[2].data.content).toBe('Third offline message');
    
    // Verify timestamps are in order
    expect(queuedActions[0].timestamp).toBeLessThan(queuedActions[1].timestamp);
    expect(queuedActions[1].timestamp).toBeLessThan(queuedActions[2].timestamp);
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for messages to sync
    await page.waitForSelector('[data-testid="messages-synced"]', { timeout: 15000 });
    
    // Verify all messages show as sent
    const sentMessages = await page.locator('[data-testid="message-sent"]').count();
    expect(sentMessages).toBeGreaterThanOrEqual(3);
    
    // Verify queue is empty
    const remainingQueue = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('offlineMessageQueue') || '[]');
    });
    expect(remainingQueue.length).toBe(0);
  });

  test('should handle message attachment privacy', async () => {
    await page.goto('/messages');
    
    // Open conversation
    await page.waitForSelector('[data-testid="conversation-list"]');
    
    const existingConversations = await page.locator('[data-testid="conversation-item"]').count();
    if (existingConversations > 0) {
      await page.click('[data-testid="conversation-item"]:first-child');
    } else {
      await page.click('[data-testid="new-conversation-button"]');
      await page.fill('[data-testid="recipient-input"]', '0x9876543210987654321098765432109876543210');
      await page.click('[data-testid="start-conversation-button"]');
    }
    
    await page.waitForSelector('[data-testid="conversation-view"]');
    
    // Mock file input for attachment
    await page.setInputFiles('[data-testid="attachment-input"]', {
      name: 'sensitive-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content')
    });
    
    // Send message with attachment
    await page.fill('[data-testid="message-input"]', 'Here is the sensitive document');
    await page.click('[data-testid="send-message-button"]');
    
    // Wait for message with attachment to be sent
    await page.waitForSelector('[data-testid="message-with-attachment"]');
    
    // Monitor attachment requests
    const attachmentRequests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('attachment') || request.url().includes('file')) {
        attachmentRequests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });
    
    // Click on attachment to view
    await page.click('[data-testid="attachment-preview"]');
    
    // Verify signed URL is used for secure access
    await page.waitForTimeout(1000);
    const signedUrlRequests = attachmentRequests.filter(req => 
      req.url.includes('signature') || req.headers['authorization']
    );
    expect(signedUrlRequests.length).toBeGreaterThan(0);
    
    // Go offline
    await context.setOffline(true);
    
    // Try to access attachment while offline
    await page.click('[data-testid="attachment-preview"]');
    
    // Should show offline message for sensitive content
    await page.waitForSelector('[data-testid="attachment-offline-message"]');
    
    // Verify attachment is not cached in regular cache
    const cachedAttachments = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        const attachmentRequests = requests.filter(req => 
          req.url.includes('attachment') || req.url.includes('sensitive')
        );
        if (attachmentRequests.length > 0) {
          return attachmentRequests.length;
        }
      }
      return 0;
    });
    
    expect(cachedAttachments).toBe(0); // Sensitive attachments should not be cached
  });

  test('should implement secure key management with rotation', async () => {
    await page.goto('/messages');
    
    // Wait for messaging to initialize
    await page.waitForSelector('[data-testid="messaging-interface"]');
    
    // Check initial key generation
    const initialKeyInfo = await page.evaluate(async () => {
      // Access the messaging service's key management
      return window.messagingService?.getCurrentKeyInfo();
    });
    
    expect(initialKeyInfo).toBeDefined();
    expect(initialKeyInfo.keyId).toBeDefined();
    expect(initialKeyInfo.createdAt).toBeDefined();
    
    // Send a message to trigger key usage
    await page.click('[data-testid="new-conversation-button"]');
    await page.fill('[data-testid="recipient-input"]', '0x9876543210987654321098765432109876543210');
    await page.click('[data-testid="start-conversation-button"]');
    
    await page.waitForSelector('[data-testid="conversation-view"]');
    await page.fill('[data-testid="message-input"]', 'Test message for key rotation');
    await page.click('[data-testid="send-message-button"]');
    
    await page.waitForSelector('[data-testid="message-sent"]');
    
    // Simulate key rotation trigger (e.g., time-based or usage-based)
    await page.evaluate(async () => {
      if (window.messagingService?.rotateEncryptionKey) {
        await window.messagingService.rotateEncryptionKey();
      }
    });
    
    // Check that key was rotated
    const rotatedKeyInfo = await page.evaluate(async () => {
      return window.messagingService?.getCurrentKeyInfo();
    });
    
    expect(rotatedKeyInfo.keyId).not.toBe(initialKeyInfo.keyId);
    expect(rotatedKeyInfo.createdAt).toBeGreaterThan(initialKeyInfo.createdAt);
    
    // Send another message with new key
    await page.fill('[data-testid="message-input"]', 'Message with rotated key');
    await page.click('[data-testid="send-message-button"]');
    
    await page.waitForSelector('[data-testid="message-sent"]');
    
    // Verify both messages are still readable (key rotation handled properly)
    const messageContents = await page.locator('[data-testid="message-content"]').allTextContents();
    expect(messageContents).toContain('Test message for key rotation');
    expect(messageContents).toContain('Message with rotated key');
  });

  test('should handle conversation list caching with user sessions', async () => {
    await page.goto('/messages');
    
    // Wait for conversations to load
    await page.waitForSelector('[data-testid="conversation-list"]');
    
    // Get initial conversation data
    const initialConversations = await page.locator('[data-testid="conversation-item"]').count();
    
    // Create a new conversation to modify the list
    await page.click('[data-testid="new-conversation-button"]');
    await page.fill('[data-testid="recipient-input"]', '0x1111111111111111111111111111111111111111');
    await page.click('[data-testid="start-conversation-button"]');
    
    await page.waitForSelector('[data-testid="conversation-view"]');
    await page.fill('[data-testid="message-input"]', 'Hello new conversation');
    await page.click('[data-testid="send-message-button"]');
    
    // Go back to conversation list
    await page.click('[data-testid="back-to-conversations"]');
    await page.waitForSelector('[data-testid="conversation-list"]');
    
    // Verify new conversation appears
    const updatedConversations = await page.locator('[data-testid="conversation-item"]').count();
    expect(updatedConversations).toBe(initialConversations + 1);
    
    // Navigate away and back to test caching
    await page.goto('/feed');
    await page.goto('/messages');
    
    // Should load quickly from cache
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="conversation-list"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(1000);
    
    // Should show cached conversation count
    const cachedConversations = await page.locator('[data-testid="conversation-item"]').count();
    expect(cachedConversations).toBe(updatedConversations);
    
    // Simulate user logout/login to test session-based cache isolation
    await page.evaluate(() => {
      // Clear session data
      sessionStorage.clear();
      localStorage.removeItem('walletAddress');
      window.mockWalletAddress = '0x2222222222222222222222222222222222222222';
    });
    
    // Refresh page to simulate new session
    await page.reload();
    await page.waitForSelector('[data-testid="messaging-interface"]');
    
    // Should not show previous user's conversations
    await page.waitForSelector('[data-testid="conversation-list"]');
    const newSessionConversations = await page.locator('[data-testid="conversation-item"]').count();
    
    // Should be 0 or different from previous user's conversations
    expect(newSessionConversations).not.toBe(cachedConversations);
  });

  test('should handle message sync retry with exponential backoff', async () => {
    await page.goto('/messages');
    
    // Open conversation
    await page.waitForSelector('[data-testid="conversation-list"]');
    
    const existingConversations = await page.locator('[data-testid="conversation-item"]').count();
    if (existingConversations > 0) {
      await page.click('[data-testid="conversation-item"]:first-child');
    } else {
      await page.click('[data-testid="new-conversation-button"]');
      await page.fill('[data-testid="recipient-input"]', '0x9876543210987654321098765432109876543210');
      await page.click('[data-testid="start-conversation-button"]');
    }
    
    await page.waitForSelector('[data-testid="conversation-view"]');
    
    // Mock network failures for message sending
    let failCount = 0;
    await page.route('**/api/messages', (route) => {
      failCount++;
      if (failCount <= 2) {
        // Fail first 2 attempts
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      } else {
        // Succeed on 3rd attempt
        route.continue();
      }
    });
    
    // Go offline and send message
    await context.setOffline(true);
    
    await page.fill('[data-testid="message-input"]', 'Message with retry logic');
    await page.click('[data-testid="send-message-button"]');
    
    await page.waitForSelector('[data-testid="message-queued"]');
    
    // Go online to trigger sync with failures
    await context.setOffline(false);
    
    // Monitor retry attempts
    let retryCount = 0;
    const retryTimes: number[] = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/messages') && request.method() === 'POST') {
        retryCount++;
        retryTimes.push(Date.now());
      }
    });
    
    // Wait for retries to complete
    await page.waitForTimeout(15000);
    
    // Should have made multiple retry attempts
    expect(retryCount).toBeGreaterThan(1);
    
    // Verify exponential backoff (each retry should be longer than the previous)
    if (retryTimes.length >= 3) {
      const firstDelay = retryTimes[1] - retryTimes[0];
      const secondDelay = retryTimes[2] - retryTimes[1];
      expect(secondDelay).toBeGreaterThan(firstDelay);
    }
    
    // Eventually should succeed
    await page.waitForSelector('[data-testid="message-sent"]', { timeout: 20000 });
  });

  test('should clean up encrypted data on logout', async () => {
    await page.goto('/messages');
    
    // Send a message to create encrypted data
    await page.waitForSelector('[data-testid="messaging-interface"]');
    
    await page.click('[data-testid="new-conversation-button"]');
    await page.fill('[data-testid="recipient-input"]', '0x9876543210987654321098765432109876543210');
    await page.click('[data-testid="start-conversation-button"]');
    
    await page.waitForSelector('[data-testid="conversation-view"]');
    await page.fill('[data-testid="message-input"]', 'Message to be cleaned up');
    await page.click('[data-testid="send-message-button"]');
    
    await page.waitForSelector('[data-testid="message-sent"]');
    
    // Verify encrypted data exists
    const beforeLogoutData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('MessagingDB', 1);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['messages'], 'readonly');
          const store = transaction.objectStore('messages');
          const getRequest = store.getAll();
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result.length);
          };
        };
      });
    });
    
    expect(beforeLogoutData).toBeGreaterThan(0);
    
    // Simulate logout
    await page.evaluate(async () => {
      // Trigger logout cleanup
      if (window.messagingService?.cleanup) {
        await window.messagingService.cleanup();
      }
      
      // Clear session data
      sessionStorage.clear();
      localStorage.clear();
    });
    
    // Verify encrypted data is cleaned up
    const afterLogoutData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('MessagingDB', 1);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['messages'], 'readonly');
          const store = transaction.objectStore('messages');
          const getRequest = store.getAll();
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result.length);
          };
        };
      });
    });
    
    expect(afterLogoutData).toBe(0);
    
    // Verify cache is also cleared
    const cacheCleared = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const messagingCaches = cacheNames.filter(name => name.includes('messaging'));
      return messagingCaches.length === 0;
    });
    
    expect(cacheCleared).toBe(true);
  });
});