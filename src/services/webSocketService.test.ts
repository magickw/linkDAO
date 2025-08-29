import { WebSocketService } from './webSocketService';

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
};

jest.mock('socket.io-client', () => {
  return {
    io: jest.fn(() => mockSocket),
  };
});

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;

  beforeEach(() => {
    webSocketService = new WebSocketService();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to the WebSocket server', () => {
      webSocketService.connect();
      
      expect(require('socket.io-client').io).toHaveBeenCalledWith(
        'http://localhost:3002',
        { transports: ['websocket'] }
      );
    });

    it('should not reconnect if already connected', () => {
      // Mock socket as connected
      const connectedSocket = { ...mockSocket, connected: true };
      jest.spyOn(require('socket.io-client'), 'io').mockReturnValue(connectedSocket);
      
      webSocketService.connect();
      webSocketService.connect(); // Try to connect again
      
      // Should only have been called once
      expect(require('socket.io-client').io).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from the WebSocket server', () => {
      webSocketService.connect();
      webSocketService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', () => {
      webSocketService.disconnect();
      
      // Should not throw an error
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register user address when connected', () => {
      webSocketService.connect();
      webSocketService.register('0x1234567890123456789012345678901234567890');
      
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'register',
        '0x1234567890123456789012345678901234567890'
      );
    });

    it('should not register when not connected', () => {
      webSocketService.register('0x1234567890123456789012345678901234567890');
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should send message when connected', () => {
      webSocketService.connect();
      webSocketService.send('testEvent', { data: 'test' });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('testEvent', { data: 'test' });
    });

    it('should not send message when not connected', () => {
      webSocketService.send('testEvent', { data: 'test' });
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('on', () => {
    it('should register event listener', () => {
      const listener = jest.fn();
      webSocketService.on('testEvent', listener);
      
      // Trigger the event
      const onAnyCallback = mockSocket.on.mock.calls.find(call => call[0] === 'any')?.[1];
      if (onAnyCallback) {
        onAnyCallback('testEvent', { data: 'test' });
      }
      
      // Check if our listener was called
      expect(listener).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('off', () => {
    it('should remove event listener', () => {
      const listener = jest.fn();
      webSocketService.on('testEvent', listener);
      webSocketService.off('testEvent', listener);
      
      // Trigger the event
      const onAnyCallback = mockSocket.on.mock.calls.find(call => call[0] === 'any')?.[1];
      if (onAnyCallback) {
        onAnyCallback('testEvent', { data: 'test' });
      }
      
      // Listener should not have been called after being removed
      expect(listener).not.toHaveBeenCalled();
    });
  });
});