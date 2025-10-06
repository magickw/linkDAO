// Enhanced Post types for testing
export enum ContentType {
  TEXT = 'text',
  MEDIA = 'media',
  LINK = 'link',
  POLL = 'poll',
  PROPOSAL = 'proposal'
}

export interface PostDraft {
  id: string;
  contentType: ContentType;
  title?: string;
  content: string;
  media: MediaFile[];
  links: string[];
  hashtags: string[];
  mentions: string[];
  communityId?: string;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  autoSaved: boolean;
}

export interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video' | 'audio';
  size: number;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
}

// Media upload configuration
export interface MediaUploadConfig {
  maxFileSize: number; // in bytes
  maxFiles: number;
  allowedTypes: string[];
  enablePreview: boolean;
  enableEditing: boolean;
  enableProgress: boolean;
}