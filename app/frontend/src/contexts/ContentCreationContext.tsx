import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { 
  ContentCreationState, 
  PostDraft, 
  ComposerState, 
  MediaUploadState,
  ContentType,
  ValidationError,
  MediaFile
} from './types';

// Action Types
type ContentCreationAction =
  | { type: 'CREATE_DRAFT'; payload: { contentType: ContentType; communityId?: string } }
  | { type: 'UPDATE_DRAFT'; payload: { id: string; updates: Partial<PostDraft> } }
  | { type: 'DELETE_DRAFT'; payload: { id: string } }
  | { type: 'AUTO_SAVE_DRAFT'; payload: { id: string } }
  | { type: 'SET_ACTIVE_COMPOSER'; payload: ComposerState | null }
  | { type: 'UPDATE_COMPOSER'; payload: { id: string; updates: Partial<ComposerState> } }
  | { type: 'START_MEDIA_UPLOAD'; payload: { id: string; file: File } }
  | { type: 'UPDATE_MEDIA_UPLOAD'; payload: { id: string; updates: Partial<MediaUploadState> } }
  | { type: 'COMPLETE_MEDIA_UPLOAD'; payload: { id: string; url: string } }
  | { type: 'REMOVE_MEDIA_UPLOAD'; payload: { id: string } }
  | { type: 'SET_VALIDATION_ERRORS'; payload: ValidationError[] }
  | { type: 'CLEAR_VALIDATION_ERRORS' }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'RESTORE_FROM_STORAGE' };

// Initial State
const initialState: ContentCreationState = {
  drafts: new Map(),
  activeComposer: null,
  mediaUploads: new Map(),
  validationErrors: [],
  isSubmitting: false,
};

// Reducer
function contentCreationReducer(
  state: ContentCreationState,
  action: ContentCreationAction
): ContentCreationState {
  switch (action.type) {
    case 'CREATE_DRAFT': {
      const id = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const draft: PostDraft = {
        id,
        contentType: action.payload.contentType,
        content: '',
        media: [],
        hashtags: [],
        mentions: [],
        communityId: action.payload.communityId,
        lastSaved: new Date(),
        autoSaveEnabled: true,
      };
      
      const newDrafts = new Map(state.drafts);
      newDrafts.set(id, draft);
      
      return {
        ...state,
        drafts: newDrafts,
      };
    }

    case 'UPDATE_DRAFT': {
      const { id, updates } = action.payload;
      const existingDraft = state.drafts.get(id);
      if (!existingDraft) return state;

      const updatedDraft: PostDraft = {
        ...existingDraft,
        ...updates,
        lastSaved: new Date(),
      };

      const newDrafts = new Map(state.drafts);
      newDrafts.set(id, updatedDraft);

      return {
        ...state,
        drafts: newDrafts,
      };
    }

    case 'DELETE_DRAFT': {
      const newDrafts = new Map(state.drafts);
      newDrafts.delete(action.payload.id);
      
      return {
        ...state,
        drafts: newDrafts,
      };
    }

    case 'AUTO_SAVE_DRAFT': {
      const { id } = action.payload;
      const draft = state.drafts.get(id);
      if (!draft || !draft.autoSaveEnabled) return state;

      // Save to localStorage
      const draftsToSave = Array.from(state.drafts.entries()).map(([key, value]) => [key, value]);
      localStorage.setItem('contentCreation_drafts', JSON.stringify(draftsToSave));

      return state;
    }

    case 'SET_ACTIVE_COMPOSER': {
      return {
        ...state,
        activeComposer: action.payload,
      };
    }

    case 'UPDATE_COMPOSER': {
      const { id, updates } = action.payload;
      if (!state.activeComposer || state.activeComposer.id !== id) return state;

      return {
        ...state,
        activeComposer: {
          ...state.activeComposer,
          ...updates,
        },
      };
    }

    case 'START_MEDIA_UPLOAD': {
      const { id, file } = action.payload;
      const uploadState: MediaUploadState = {
        id,
        file,
        progress: 0,
        status: 'pending',
      };

      const newUploads = new Map(state.mediaUploads);
      newUploads.set(id, uploadState);

      return {
        ...state,
        mediaUploads: newUploads,
      };
    }

    case 'UPDATE_MEDIA_UPLOAD': {
      const { id, updates } = action.payload;
      const existingUpload = state.mediaUploads.get(id);
      if (!existingUpload) return state;

      const updatedUpload = {
        ...existingUpload,
        ...updates,
      };

      const newUploads = new Map(state.mediaUploads);
      newUploads.set(id, updatedUpload);

      return {
        ...state,
        mediaUploads: newUploads,
      };
    }

    case 'COMPLETE_MEDIA_UPLOAD': {
      const { id, url } = action.payload;
      const upload = state.mediaUploads.get(id);
      if (!upload) return state;

      const updatedUpload: MediaUploadState = {
        ...upload,
        status: 'completed',
        progress: 100,
        optimizedUrl: url,
      };

      const newUploads = new Map(state.mediaUploads);
      newUploads.set(id, updatedUpload);

      return {
        ...state,
        mediaUploads: newUploads,
      };
    }

    case 'REMOVE_MEDIA_UPLOAD': {
      const newUploads = new Map(state.mediaUploads);
      newUploads.delete(action.payload.id);

      return {
        ...state,
        mediaUploads: newUploads,
      };
    }

    case 'SET_VALIDATION_ERRORS': {
      return {
        ...state,
        validationErrors: action.payload,
      };
    }

    case 'CLEAR_VALIDATION_ERRORS': {
      return {
        ...state,
        validationErrors: [],
      };
    }

    case 'SET_SUBMITTING': {
      return {
        ...state,
        isSubmitting: action.payload,
      };
    }

    case 'RESTORE_FROM_STORAGE': {
      try {
        const savedDrafts = localStorage.getItem('contentCreation_drafts');
        if (savedDrafts) {
          const draftsArray = JSON.parse(savedDrafts);
          const draftsMap = new Map<string, PostDraft>(draftsArray.map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              lastSaved: new Date(value.lastSaved),
            }
          ]));

          return {
            ...state,
            drafts: draftsMap,
          };
        }
      } catch (error) {
        console.error('Failed to restore drafts from storage:', error);
      }
      return state;
    }

    default:
      return state;
  }
}

// Context
interface ContentCreationContextType {
  state: ContentCreationState;
  createDraft: (contentType: ContentType, communityId?: string) => string;
  updateDraft: (id: string, updates: Partial<PostDraft>) => void;
  deleteDraft: (id: string) => void;
  setActiveComposer: (composer: ComposerState | null) => void;
  updateComposer: (id: string, updates: Partial<ComposerState>) => void;
  startMediaUpload: (file: File) => string;
  updateMediaUpload: (id: string, updates: Partial<MediaUploadState>) => void;
  completeMediaUpload: (id: string, url: string) => void;
  removeMediaUpload: (id: string) => void;
  validateContent: (draftId: string) => Promise<boolean>;
  submitPost: (draftId: string) => Promise<void>;
  getDraft: (id: string) => PostDraft | undefined;
  getMediaUpload: (id: string) => MediaUploadState | undefined;
  getAllDrafts: () => PostDraft[];
  clearValidationErrors: () => void;
}

const ContentCreationContext = createContext<ContentCreationContextType | undefined>(undefined);

// Provider
interface ContentCreationProviderProps {
  children: React.ReactNode;
}

export function ContentCreationProvider({ children }: ContentCreationProviderProps) {
  const [state, dispatch] = useReducer(contentCreationReducer, initialState);

  // Auto-save effect
  useEffect(() => {
    const interval = setInterval(() => {
      state.drafts.forEach((draft) => {
        if (draft.autoSaveEnabled) {
          dispatch({ type: 'AUTO_SAVE_DRAFT', payload: { id: draft.id } });
        }
      });
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [state.drafts]);

  // Restore from storage on mount
  useEffect(() => {
    dispatch({ type: 'RESTORE_FROM_STORAGE' });
  }, []);

  const createDraft = useCallback((contentType: ContentType, communityId?: string): string => {
    const action = { type: 'CREATE_DRAFT' as const, payload: { contentType, communityId } };
    dispatch(action);
    
    // Return the ID that will be generated
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const updateDraft = useCallback((id: string, updates: Partial<PostDraft>) => {
    dispatch({ type: 'UPDATE_DRAFT', payload: { id, updates } });
  }, []);

  const deleteDraft = useCallback((id: string) => {
    dispatch({ type: 'DELETE_DRAFT', payload: { id } });
  }, []);

  const setActiveComposer = useCallback((composer: ComposerState | null) => {
    dispatch({ type: 'SET_ACTIVE_COMPOSER', payload: composer });
  }, []);

  const updateComposer = useCallback((id: string, updates: Partial<ComposerState>) => {
    dispatch({ type: 'UPDATE_COMPOSER', payload: { id, updates } });
  }, []);

  const startMediaUpload = useCallback((file: File): string => {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ type: 'START_MEDIA_UPLOAD', payload: { id, file } });
    return id;
  }, []);

  const updateMediaUpload = useCallback((id: string, updates: Partial<MediaUploadState>) => {
    dispatch({ type: 'UPDATE_MEDIA_UPLOAD', payload: { id, updates } });
  }, []);

  const completeMediaUpload = useCallback((id: string, url: string) => {
    dispatch({ type: 'COMPLETE_MEDIA_UPLOAD', payload: { id, url } });
  }, []);

  const removeMediaUpload = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_MEDIA_UPLOAD', payload: { id } });
  }, []);

  const validateContent = useCallback(async (draftId: string): Promise<boolean> => {
    const draft = state.drafts.get(draftId);
    if (!draft) return false;

    const errors: ValidationError[] = [];

    // Basic validation
    if (!draft.content.trim()) {
      errors.push({
        field: 'content',
        message: 'Content cannot be empty',
        code: 'REQUIRED',
      });
    }

    if (draft.contentType === ContentType.POLL && !draft.poll) {
      errors.push({
        field: 'poll',
        message: 'Poll data is required for poll posts',
        code: 'REQUIRED',
      });
    }

    if (draft.contentType === ContentType.PROPOSAL && !draft.proposal) {
      errors.push({
        field: 'proposal',
        message: 'Proposal data is required for proposal posts',
        code: 'REQUIRED',
      });
    }

    // Content length validation
    if (draft.content.length > 10000) {
      errors.push({
        field: 'content',
        message: 'Content exceeds maximum length of 10,000 characters',
        code: 'MAX_LENGTH',
      });
    }

    // Media validation
    if (draft.media.length > 10) {
      errors.push({
        field: 'media',
        message: 'Maximum 10 media files allowed',
        code: 'MAX_COUNT',
      });
    }

    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
    return errors.length === 0;
  }, [state.drafts]);

  const submitPost = useCallback(async (draftId: string): Promise<void> => {
    const draft = state.drafts.get(draftId);
    if (!draft) throw new Error('Draft not found');

    dispatch({ type: 'SET_SUBMITTING', payload: true });

    try {
      // Validate before submitting
      const isValid = await validateContent(draftId);
      if (!isValid) {
        throw new Error('Validation failed');
      }

      // TODO: Implement actual post submission
      // This would integrate with the post creation service
      console.log('Submitting post:', draft);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clean up after successful submission
      dispatch({ type: 'DELETE_DRAFT', payload: { id: draftId } });
      dispatch({ type: 'CLEAR_VALIDATION_ERRORS' });
    } catch (error) {
      console.error('Failed to submit post:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [state.drafts, validateContent]);

  const getDraft = useCallback((id: string): PostDraft | undefined => {
    return state.drafts.get(id);
  }, [state.drafts]);

  const getMediaUpload = useCallback((id: string): MediaUploadState | undefined => {
    return state.mediaUploads.get(id);
  }, [state.mediaUploads]);

  const getAllDrafts = useCallback((): PostDraft[] => {
    return Array.from(state.drafts.values());
  }, [state.drafts]);

  const clearValidationErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_VALIDATION_ERRORS' });
  }, []);

  const contextValue: ContentCreationContextType = {
    state,
    createDraft,
    updateDraft,
    deleteDraft,
    setActiveComposer,
    updateComposer,
    startMediaUpload,
    updateMediaUpload,
    completeMediaUpload,
    removeMediaUpload,
    validateContent,
    submitPost,
    getDraft,
    getMediaUpload,
    getAllDrafts,
    clearValidationErrors,
  };

  return (
    <ContentCreationContext.Provider value={contextValue}>
      {children}
    </ContentCreationContext.Provider>
  );
}

// Hook
export function useContentCreation() {
  const context = useContext(ContentCreationContext);
  if (context === undefined) {
    throw new Error('useContentCreation must be used within a ContentCreationProvider');
  }
  return context;
}