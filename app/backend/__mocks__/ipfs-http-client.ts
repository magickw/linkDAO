const mockIPFSClient = {
  add: jest.fn(),
  cat: jest.fn(),
  pin: {
    add: jest.fn()
  }
};

const create = jest.fn(() => mockIPFSClient);

export { create, mockIPFSClient as default };