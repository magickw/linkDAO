import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
  }

  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  callback: ResizeObserverCallback;
  
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 120,
  height: 120,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

// Mock CSS.supports
Object.defineProperty(CSS, 'supports', {
  writable: true,
  value: jest.fn().mockImplementation((property: string, value?: string) => {
    // Mock support for modern CSS features
    if (property.includes('grid')) return true;
    if (property.includes('flex')) return true;
    if (property.includes('backdrop-filter')) return true;
    return true;
  }),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
) as jest.Mock;

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'mocked-url'),
});

// Mock URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn(),
});

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  
  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 100);
  }
} as any;

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Array(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}));

// Mock touch events
const createTouchEvent = (type: string, touches: any[] = []) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: touches,
    writable: false,
  });
  Object.defineProperty(event, 'changedTouches', {
    value: touches,
    writable: false,
  });
  return event;
};

// Add touch event support
Object.defineProperty(window, 'TouchEvent', {
  value: class TouchEvent extends Event {
    touches: TouchList;
    changedTouches: TouchList;
    targetTouches: TouchList;
    
    constructor(type: string, eventInitDict?: TouchEventInit) {
      super(type, eventInitDict);
      this.touches = (eventInitDict?.touches as TouchList) || ([] as any);
      this.changedTouches = (eventInitDict?.changedTouches as TouchList) || ([] as any);
      this.targetTouches = (eventInitDict?.targetTouches as TouchList) || ([] as any);
    }
  },
});

// Mock navigator.vibrate for haptic feedback
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

// Mock navigator.userAgent for browser detection tests
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn(cb => setTimeout(cb, 1));
global.cancelIdleCallback = jest.fn(id => clearTimeout(id));

// Console error suppression for expected errors in tests
const originalError = console.error;
console.error = (...args: any[]) => {
  // Suppress specific React warnings that are expected in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Warning: An invalid form control') ||
     args[0].includes('Warning: Failed prop type'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Mock crypto for any cryptographic operations
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
  },
});

// Mock Web3 and blockchain-related APIs
global.ethereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true,
};

// Setup test data
export const mockCommunityData = {
  id: 'test-community',
  name: 'Test Community',
  displayName: 'Test Community',
  description: 'A test community for Reddit-style features',
  memberCount: 1234,
  onlineCount: 56,
  bannerImage: 'https://example.com/banner.jpg',
  avatarImage: 'https://example.com/avatar.jpg',
  createdAt: new Date('2023-01-01'),
  rules: [
    { id: '1', title: 'Be respectful', description: 'Treat others with respect' },
    { id: '2', title: 'No spam', description: 'Do not post spam content' },
  ],
  flairs: [
    { id: '1', name: 'Discussion', color: '#ff4500', backgroundColor: '#fff5f0' },
    { id: '2', name: 'Guide', color: '#0079d3', backgroundColor: '#f0f8ff' },
  ],
  moderators: [
    { id: '1', username: 'mod1', role: 'admin', tenure: '2 years' },
    { id: '2', username: 'mod2', role: 'moderator', tenure: '1 year' },
  ],
  isJoined: false,
  canModerate: false,
};

export const mockPostData = {
  id: 'test-post-1',
  title: 'Test Post Title',
  content: 'This is a test post content',
  author: {
    id: 'user1',
    username: 'testuser',
    avatar: 'https://example.com/avatar.jpg',
  },
  community: mockCommunityData,
  flair: mockCommunityData.flairs[0],
  thumbnail: 'https://example.com/thumbnail.jpg',
  voteScore: 42,
  userVote: null,
  commentCount: 15,
  topComment: {
    id: 'comment1',
    content: 'This is a top comment',
    author: { username: 'commenter' },
    voteScore: 5,
  },
  awards: [],
  isPinned: false,
  isGovernanceProposal: false,
  createdAt: new Date('2023-12-01'),
  mediaType: 'text' as const,
};

// Global test utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const mockIntersectionObserver = (isIntersecting = true) => {
  const mockObserver = jest.fn();
  mockObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  });

  window.IntersectionObserver = mockObserver;

  // Trigger intersection
  const callback = mockObserver.mock.calls[0]?.[0];
  if (callback) {
    callback([{ isIntersecting, target: document.createElement('div') }]);
  }

  return mockObserver;
};

export const mockResizeObserver = () => {
  const mockObserver = jest.fn();
  mockObserver.mockReturnValue({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  });

  window.ResizeObserver = mockObserver;
  return mockObserver;
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Reset any global state
  delete (window as any).ethereum;
});

// Global test timeout
jest.setTimeout(30000);