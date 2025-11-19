// Contact Management Types
export interface Contact {
  id: string;
  walletAddress: string;
  ensName?: string;
  nickname: string;
  avatar?: string;
  status: ContactStatus;
  groups: ContactGroup[];
  tags: string[];
  notes?: string;
  isVerified: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactStatus = 'online' | 'idle' | 'busy' | 'offline';

export interface ContactGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  createdAt: Date;
}

export interface ContactFormData {
  walletAddress: string;
  ensName?: string;
  nickname: string;
  groups: string[];
  tags: string[];
  notes?: string;
}

export interface ContactSearchFilters {
  query: string;
  groups: string[];
  tags: string[];
  status: ContactStatus[];
}

export interface ContactContextType {
  contacts: Contact[];
  groups: ContactGroup[];
  selectedContact: Contact | null;
  searchFilters: ContactSearchFilters;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addContact: (contactData: ContactFormData) => Promise<void>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  selectContact: (contact: Contact | null) => void;
  searchContacts: (filters: Partial<ContactSearchFilters>) => void;
  createGroup: (group: Omit<ContactGroup, 'id' | 'createdAt'>) => Promise<void>;
  updateGroup: (id: string, updates: Partial<ContactGroup>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  startChat: (contact: Contact) => void;
  setOnStartChat: (callback: ((contact: Contact) => void) | null) => void;
}

export const CONTACT_TAGS = [
  'defi', 'developer', 'artist', 'trader', 'nft', 'governance',
  'community', 'investor', 'builder', 'creator', 'validator', 'whale'
];