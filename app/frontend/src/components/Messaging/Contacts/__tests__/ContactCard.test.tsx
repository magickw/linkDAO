import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactCard from '../ContactCard';
import { Contact } from '@/types/contacts';

// Mock the contacts context to avoid having to render the full provider
jest.mock('@/contexts/ContactContext', () => ({
  useContacts: () => ({
    selectContact: jest.fn(),
    startChat: jest.fn()
  })
}));

describe('ContactCard', () => {
  const contact: Contact = {
    id: '1',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    nickname: 'Alice',
    ensName: undefined,
    avatar: undefined,
    status: 'online',
    isVerified: false,
    lastSeen: undefined,
    tags: []
  } as any;

  test('does not render edit button when onContactEdit is not provided', () => {
    render(<ContactCard contact={contact} />);

    // Message button should be present
    const messageButton = screen.getByTitle('Message');
    expect(messageButton).toBeInTheDocument();

    // Edit button should NOT be present
    const editButtons = screen.queryByTitle('Edit');
    expect(editButtons).toBeNull();
  });

  test('renders edit button and calls handler when onContactEdit is provided', () => {
    const onEdit = jest.fn();
    render(<ContactCard contact={contact} onContactEdit={onEdit} />);

    const editButton = screen.getByTitle('Edit');
    expect(editButton).toBeInTheDocument();

    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledWith(contact);
  });

  test('matches snapshot without edit button', () => {
    const { asFragment } = render(<ContactCard contact={contact} />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('matches snapshot with edit button', () => {
    const onEdit = jest.fn();
    const { asFragment } = render(<ContactCard contact={contact} onContactEdit={onEdit} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
