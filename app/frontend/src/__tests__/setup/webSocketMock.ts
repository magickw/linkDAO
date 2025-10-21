import { jest } from '@jest/globals';

// Mock WebSocket for testing
const mockWebSocket = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  url: '',
  protocol: '',
  extensions: '',
  bufferedAmount: 0,
  binaryType: 'blob' as BinaryType,
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
  dispatchEvent: jest.fn(),
};

global.WebSocket = jest.fn().mockImplementation((url: string, protocols?: string | string[]) => {
  const instance = { ...mockWebSocket };
  instance.url = url;
  instance.protocol = Array.isArray(protocols) ? protocols[0] || '' : protocols || '';
  return instance;
});

export { mockWebSocket };