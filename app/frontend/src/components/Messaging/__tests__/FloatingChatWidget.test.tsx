import React, { useEffect } from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactProvider, useContacts } from '@/contexts/ContactContext';
import FloatingChatWidget from '../FloatingChatWidget';

// Mock wagmi account
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xUSER', isConnected: true })
}));

// Minimal mocks for hooks used inside the component
jest.mock('@/hooks/useChatHistory', () => ({
  useChatHistory: () => ({
    conversations: [],
    loading: false,
    error: null,
    loadConversations: jest.fn().mockResolvedValue([]),
    sendMessage: jest.fn(),
    markAsRead: jest.fn()
  })
}));

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    connectionState: { status: 'connected' },
    isConnected: true,
    joinConversation: jest.fn(),
    leaveConversation: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  })
}));

jest.mock('@/hooks/useWalletAuth', () => ({ useWalletAuth: () => ({ walletInfo: null }) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

// Helper harness to expose startChat to the test
const Harness: React.FC = () => {
  const { startChat } = useContacts();
  useEffect(() => {
    // Expose startChat for test usage
    (global as any).startChat = startChat;
  }, [startChat]);
  return null;
};

describe('FloatingChatWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).startChat = undefined;
  });

  test('starts a new conversation using the passed pending contact address (avoids setState race)', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'conv-1' })
    } as any);

    render(
      <ContactProvider>
        <FloatingChatWidget />
        <Harness />
      </ContactProvider>
    );

    // Wait for harness to expose startChat
    await waitFor(() => expect((global as any).startChat).toBeDefined());

    const contact = { id: 'c1', walletAddress: '0xDEADBEEF', nickname: 'Bob' };

    // Trigger startChat which should invoke the widget's registered callback
    (global as any).startChat(contact);

    // Wait for the fetch call to be made and verify the participantAddress
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const call = (fetchMock as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('/api/conversations');

    const body = JSON.parse(call[1].body);
    expect(body.participantAddress).toBe(contact.walletAddress);

    fetchMock.mockRestore();
  });

  test('modal flow starts new conversation using state value when called from the modal', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'conv-2' })
    } as any);

    render(
      <ContactProvider>
        <FloatingChatWidget />
      </ContactProvider>
    );

    // Open the floating widget (toggle button labeled "Open chat")
    const openBtn = screen.getByLabelText('Open chat');
    await userEvent.click(openBtn);

    // Click the "Start new conversation" plus button in the header
    const plusBtn = await screen.findByRole('button', { name: /Start new conversation/i });
    await userEvent.click(plusBtn);

    // Fill the input and click Start Chat in the modal
    const input = screen.getByPlaceholderText('0x... or name.eth');
    await userEvent.type(input, '0xMODALADDR');

    const startBtn = screen.getByRole('button', { name: /Start Chat/i });
    await userEvent.click(startBtn);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const call = (fetchMock as jest.Mock).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.participantAddress).toBe('0xMODALADDR');

    fetchMock.mockRestore();
  });
});
