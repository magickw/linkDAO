/**
 * WebSocket Security Tests
 * Tests for WSS enforcement and message validation
 */

import { WebSocketSecurityService } from '../webSocketSecurity';

// Mock WebSocket
class MockWebSocket {
    readyState = WebSocket.CONNECTING;
    onopen: (() => void) | null = null;
    onmessage: ((event: any) => void) | null = null;
    onerror: ((error: any) => void) | null = null;
    onclose: (() => void) | null = null;

    send = jest.fn();
    close = jest.fn(() => {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) this.onclose();
    });

    simulateOpen() {
        this.readyState = WebSocket.OPEN;
        if (this.onopen) this.onopen();
    }

    simulateMessage(data: any) {
        if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(data) });
        }
    }

    simulateError(error: any) {
        if (this.onerror) this.onerror(error);
    }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('WebSocketSecurityService', () => {
    let service: WebSocketSecurityService;
    let mockWs: MockWebSocket;

    beforeEach(() => {
        service = new WebSocketSecurityService();
        mockWs = new MockWebSocket();
        jest.clearAllMocks();
    });

    describe('connect', () => {
        it('should enforce WSS protocol', async () => {
            await expect(service.connect('ws://insecure.example.com')).rejects.toThrow(
                'Only WSS (secure WebSocket) connections are allowed'
            );
        });

        it('should allow WSS connections', async () => {
            const connectPromise = service.connect('wss://api.linkdao.io');

            // Simulate connection opening
            setTimeout(() => mockWs.simulateOpen(), 10);

            await expect(connectPromise).resolves.toBeUndefined();
        });

        it('should validate allowed origins', async () => {
            await expect(service.connect('wss://malicious.com')).rejects.toThrow(
                'WebSocket origin not allowed'
            );
        });

        it('should support wildcard origins', async () => {
            const connectPromise = service.connect('wss://eth-mainnet.g.alchemy.com');
            setTimeout(() => mockWs.simulateOpen(), 10);
            await expect(connectPromise).resolves.toBeUndefined();
        });
    });

    describe('send', () => {
        beforeEach(async () => {
            const connectPromise = service.connect('wss://api.linkdao.io');
            setTimeout(() => mockWs.simulateOpen(), 10);
            await connectPromise;
        });

        it('should send message successfully', () => {
            service.send('test', { data: 'hello' });
            expect(mockWs.send).toHaveBeenCalled();
        });

        it('should include timestamp in message', () => {
            service.send('test', { data: 'hello' });

            const sentData = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentData.timestamp).toBeDefined();
            expect(typeof sentData.timestamp).toBe('number');
        });

        it('should throw if not connected', () => {
            service.disconnect();
            expect(() => service.send('test', {})).toThrow('WebSocket is not connected');
        });

        it('should reject messages exceeding size limit', () => {
            const largePayload = 'x'.repeat(2 * 1024 * 1024); // 2MB
            expect(() => service.send('test', { data: largePayload })).toThrow(
                'Message size exceeds maximum allowed'
            );
        });

        it('should warn about sensitive data in payload', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            service.send('test', { privateKey: '0x1234...' });

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('sensitive data')
            );

            consoleSpy.mockRestore();
        });
    });

    describe('message handling', () => {
        beforeEach(async () => {
            const connectPromise = service.connect('wss://api.linkdao.io');
            setTimeout(() => mockWs.simulateOpen(), 10);
            await connectPromise;
        });

        it('should handle valid messages', () => {
            const handler = jest.fn();
            service.on('test', handler);

            mockWs.simulateMessage({
                type: 'test',
                payload: { data: 'hello' },
                timestamp: Date.now(),
            });

            expect(handler).toHaveBeenCalledWith({ data: 'hello' });
        });

        it('should reject messages exceeding size limit', () => {
            const handler = jest.fn();
            service.on('test', handler);

            const largeMessage = {
                type: 'test',
                payload: { data: 'x'.repeat(2 * 1024 * 1024) },
                timestamp: Date.now(),
            };

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockWs.simulateMessage(largeMessage);

            expect(handler).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should reject invalid message structure', () => {
            const handler = jest.fn();
            service.on('test', handler);

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockWs.simulateMessage({ invalid: 'message' });

            expect(handler).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should warn about sensitive data in received messages', () => {
            const handler = jest.fn();
            service.on('test', handler);

            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            mockWs.simulateMessage({
                type: 'test',
                payload: { mnemonic: 'word1 word2 word3' },
                timestamp: Date.now(),
            });

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('sensitive data')
            );

            consoleWarnSpy.mockRestore();
        });
    });

    describe('disconnect', () => {
        beforeEach(async () => {
            const connectPromise = service.connect('wss://api.linkdao.io');
            setTimeout(() => mockWs.simulateOpen(), 10);
            await connectPromise;
        });

        it('should close connection', () => {
            service.disconnect();
            expect(mockWs.close).toHaveBeenCalled();
        });

        it('should stop heartbeat', () => {
            jest.useFakeTimers();
            service.disconnect();
            jest.advanceTimersByTime(60000);

            // Heartbeat should not send any messages
            expect(mockWs.send).not.toHaveBeenCalled();

            jest.useRealTimers();
        });
    });

    describe('connection status', () => {
        it('should report not connected initially', () => {
            expect(service.isConnected).toBe(false);
        });

        it('should report connected after successful connection', async () => {
            const connectPromise = service.connect('wss://api.linkdao.io');
            setTimeout(() => mockWs.simulateOpen(), 10);
            await connectPromise;

            expect(service.isConnected).toBe(true);
        });

        it('should report not connected after disconnect', async () => {
            const connectPromise = service.connect('wss://api.linkdao.io');
            setTimeout(() => mockWs.simulateOpen(), 10);
            await connectPromise;

            service.disconnect();
            expect(service.isConnected).toBe(false);
        });
    });

    describe('heartbeat', () => {
        beforeEach(async () => {
            const connectPromise = service.connect('wss://api.linkdao.io');
            setTimeout(() => mockWs.simulateOpen(), 10);
            await connectPromise;
        });

        it('should send periodic heartbeat', () => {
            jest.useFakeTimers();

            mockWs.send.mockClear();
            jest.advanceTimersByTime(30000); // Heartbeat interval

            expect(mockWs.send).toHaveBeenCalled();
            const sentData = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentData.type).toBe('ping');

            jest.useRealTimers();
        });
    });

    describe('reconnection', () => {
        it('should attempt to reconnect on connection loss', async () => {
            const connectPromise = service.connect('wss://api.linkdao.io');
            setTimeout(() => mockWs.simulateOpen(), 10);
            await connectPromise;

            // Simulate connection close
            mockWs.close();

            // Should attempt reconnect
            // Note: Full reconnection testing would require more complex mocking
        });
    });
});
