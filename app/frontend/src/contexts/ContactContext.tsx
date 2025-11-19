import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { Contact, ContactGroup, ContactFormData, ContactSearchFilters, ContactContextType } from '@/types/contacts';

// Contact reducer actions
type ContactAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONTACTS'; payload: Contact[] }
  | { type: 'SET_GROUPS'; payload: ContactGroup[] }
  | { type: 'ADD_CONTACT'; payload: Contact }
  | { type: 'UPDATE_CONTACT'; payload: { id: string; updates: Partial<Contact> } }
  | { type: 'DELETE_CONTACT'; payload: string }
  | { type: 'SELECT_CONTACT'; payload: Contact | null }
  | { type: 'SET_SEARCH_FILTERS'; payload: Partial<ContactSearchFilters> }
  | { type: 'ADD_GROUP'; payload: ContactGroup }
  | { type: 'UPDATE_GROUP'; payload: { id: string; updates: Partial<ContactGroup> } }
  | { type: 'DELETE_GROUP'; payload: string };

interface ContactState {
  contacts: Contact[];
  groups: ContactGroup[];
  selectedContact: Contact | null;
  searchFilters: ContactSearchFilters;
  isLoading: boolean;
  error: string | null;
}

const initialState: ContactState = {
  contacts: [],
  groups: [],
  selectedContact: null,
  searchFilters: {
    query: '',
    groups: [],
    tags: [],
    status: []
  },
  isLoading: false,
  error: null
};

function contactReducer(state: ContactState, action: ContactAction): ContactState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_CONTACTS':
      return { ...state, contacts: action.payload, isLoading: false };
    
    case 'SET_GROUPS':
      return { ...state, groups: action.payload };
    
    case 'ADD_CONTACT':
      return { 
        ...state, 
        contacts: [...state.contacts, action.payload],
        isLoading: false 
      };
    
    case 'UPDATE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.map(contact =>
          contact.id === action.payload.id
            ? { ...contact, ...action.payload.updates, updatedAt: new Date() }
            : contact
        ),
        selectedContact: state.selectedContact?.id === action.payload.id
          ? { ...state.selectedContact, ...action.payload.updates, updatedAt: new Date() }
          : state.selectedContact
      };
    
    case 'DELETE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.filter(contact => contact.id !== action.payload),
        selectedContact: state.selectedContact?.id === action.payload ? null : state.selectedContact
      };
    
    case 'SELECT_CONTACT':
      return { ...state, selectedContact: action.payload };
    
    case 'SET_SEARCH_FILTERS':
      return {
        ...state,
        searchFilters: { ...state.searchFilters, ...action.payload }
      };
    
    case 'ADD_GROUP':
      return {
        ...state,
        groups: [...state.groups, action.payload]
      };
    
    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map(group =>
          group.id === action.payload.id
            ? { ...group, ...action.payload.updates }
            : group
        )
      };
    
    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(group => group.id !== action.payload),
        contacts: state.contacts.map(contact => ({
          ...contact,
          groups: contact.groups.filter(group => group.id !== action.payload)
        }))
      };
    
    default:
      return state;
  }
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

export function ContactProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(contactReducer, initialState);

  // Initialize groups from localStorage
  useEffect(() => {
    const initializeGroups = () => {
      const savedGroups = localStorage.getItem('linkdao-contact-groups');
      if (savedGroups) {
        dispatch({ type: 'SET_GROUPS', payload: JSON.parse(savedGroups) });
      } else {
        // Start with empty groups - users will create their own
        dispatch({ type: 'SET_GROUPS', payload: [] });
      }
    };

    initializeGroups();
  }, []);

  // Load contacts from localStorage
  useEffect(() => {
    const loadContacts = () => {
      try {
        const savedContacts = localStorage.getItem('linkdao-contacts');
        if (savedContacts) {
          const contacts = JSON.parse(savedContacts).map((contact: any) => ({
            ...contact,
            createdAt: new Date(contact.createdAt),
            updatedAt: new Date(contact.updatedAt),
            lastSeen: contact.lastSeen ? new Date(contact.lastSeen) : undefined
          }));
          dispatch({ type: 'SET_CONTACTS', payload: contacts });
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load contacts' });
      }
    };

    loadContacts();
  }, []);

  // Save contacts to localStorage whenever contacts change
  useEffect(() => {
    if (state.contacts.length > 0) {
      localStorage.setItem('linkdao-contacts', JSON.stringify(state.contacts));
    }
  }, [state.contacts]);

  // Save groups to localStorage whenever groups change
  useEffect(() => {
    localStorage.setItem('linkdao-contact-groups', JSON.stringify(state.groups));
  }, [state.groups]);

  const addContact = useCallback(async (contactData: ContactFormData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Check if contact already exists
      const existingContact = state.contacts.find(
        contact => contact.walletAddress.toLowerCase() === contactData.walletAddress.toLowerCase()
      );

      if (existingContact) {
        throw new Error('Contact already exists');
      }

      // Find selected groups
      const selectedGroups = state.groups.filter(group => 
        contactData.groups.includes(group.id)
      );

      const newContact: Contact = {
        id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        walletAddress: contactData.walletAddress,
        ensName: contactData.ensName,
        nickname: contactData.nickname,
        status: 'offline',
        groups: selectedGroups,
        tags: contactData.tags,
        notes: contactData.notes,
        isVerified: !!contactData.ensName,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      dispatch({ type: 'ADD_CONTACT', payload: newContact });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to add contact' });
      throw error;
    }
  }, [state.contacts, state.groups]);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    try {
      dispatch({ type: 'UPDATE_CONTACT', payload: { id, updates } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update contact' });
      throw error;
    }
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'DELETE_CONTACT', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete contact' });
      throw error;
    }
  }, []);

  const selectContact = useCallback((contact: Contact | null) => {
    dispatch({ type: 'SELECT_CONTACT', payload: contact });
  }, []);

  const searchContacts = useCallback((filters: Partial<ContactSearchFilters>) => {
    dispatch({ type: 'SET_SEARCH_FILTERS', payload: filters });
  }, []);

  const createGroup = useCallback(async (groupData: Omit<ContactGroup, 'id' | 'createdAt'>) => {
    try {
      const newGroup: ContactGroup = {
        ...groupData,
        id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };

      dispatch({ type: 'ADD_GROUP', payload: newGroup });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create group' });
      throw error;
    }
  }, []);

  const updateGroup = useCallback(async (id: string, updates: Partial<ContactGroup>) => {
    try {
      dispatch({ type: 'UPDATE_GROUP', payload: { id, updates } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update group' });
      throw error;
    }
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'DELETE_GROUP', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete group' });
      throw error;
    }
  }, []);

  const [onStartChatCallback, setOnStartChatCallback] = useState<((contact: Contact) => void) | null>(null);

  const setOnStartChat = useCallback((callback: ((contact: Contact) => void) | null) => {
    console.log("ContactContext: setOnStartChat called with callback:", !!callback);
    setOnStartChatCallback(callback);
  }, []);

  const startChat = useCallback((contact: Contact) => {
    console.log("ContactContext: startChat called with contact:", contact);
    if (onStartChatCallback) {
      console.log("ContactContext: Calling onStartChatCallback with contact:", contact);
      onStartChatCallback(contact);
    } else {
      console.log('ContactContext: No startChat callback set, unable to initiate chat with:', contact.nickname);
      // Fallback behavior - in a real implementation, this would create a conversation
      // and notify the FloatingChatWidget
    }
  }, [onStartChatCallback]);

  const value: ContactContextType = {
    contacts: state.contacts,
    groups: state.groups,
    selectedContact: state.selectedContact,
    searchFilters: state.searchFilters,
    isLoading: state.isLoading,
    error: state.error,
    addContact,
    updateContact,
    deleteContact,
    selectContact,
    searchContacts,
    createGroup,
    updateGroup,
    deleteGroup,
    startChat,
    setOnStartChat
  };

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
}

export function useContacts() {
  const context = useContext(ContactContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactProvider');
  }
  return context;
}