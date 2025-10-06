// Mock Draft Service for testing
export const draftService = {
  saveDraft: jest.fn().mockResolvedValue(undefined),
  getDraft: jest.fn().mockResolvedValue(null),
  clearDraft: jest.fn().mockResolvedValue(undefined)
};

export const DraftService = {
  saveDraft: jest.fn().mockResolvedValue(undefined),
  loadDraft: jest.fn().mockReturnValue(null),
  deleteDraft: jest.fn().mockResolvedValue(undefined)
};