import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIChatSupport from '../AIChatSupport';

// Mock the Lucide icons
jest.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Send: () => <div data-testid="send-icon" />,
  Bot: () => <div data-testid="bot-icon" />,
  User: () => <div data-testid="user-icon" />,
  X: () => <div data-testid="x-icon" />,
  Volume2: () => <div data-testid="volume2-icon" />,
  VolumeX: () => <div data-testid="volume-x-icon" />,
  ThumbsUp: () => <div data-testid="thumbs-up-icon" />,
  ThumbsDown: () => <div data-testid="thumbs-down-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
}));

describe('AIChatSupport', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the chat toggle button', () => {
    render(<AIChatSupport />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByTestId('message-circle-icon')).toBeInTheDocument();
  });

  it('opens the chat modal when toggle button is clicked', () => {
    render(<AIChatSupport />);
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('LinkDAO Support Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your question here...')).toBeInTheDocument();
  });

  it('sends a message and receives a response', async () => {
    render(<AIChatSupport />);
    
    // Open the chat
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    // Type a message
    const input = screen.getByPlaceholderText('Type your question here...');
    fireEvent.change(input, { target: { value: 'How do I stake LDAO tokens?' } });
    
    // Send the message
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);
    
    // Wait for the response
    await waitFor(() => {
      expect(screen.getByText(/LDAO tokens are the native governance and utility tokens/)).toBeInTheDocument();
    });
  });

  it('handles empty message submission', () => {
    render(<AIChatSupport />);
    
    // Open the chat
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    // Try to send an empty message
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);
    
    // Should not add any new messages
    const messages = screen.queryAllByText(/Hello! I'm your LinkDAO support assistant/);
    expect(messages).toHaveLength(1);
  });

  it('toggles sound notifications', () => {
    render(<AIChatSupport />);
    
    // Open the chat
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    // Toggle sound off
    const soundButton = screen.getByRole('button', { name: /sound/i });
    fireEvent.click(soundButton);
    
    // Toggle sound back on
    const muteButton = screen.getByRole('button', { name: /sound/i });
    fireEvent.click(muteButton);
    
    expect(screen.getByTestId('volume2-icon')).toBeInTheDocument();
  });

  it('restarts the conversation', async () => {
    render(<AIChatSupport />);
    
    // Open the chat
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    // Type and send a message
    const input = screen.getByPlaceholderText('Type your question here...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByText(/I understand you're looking for help/)).toBeInTheDocument();
    });
    
    // Restart conversation
    const restartButton = screen.getByRole('button', { name: /restart/i });
    fireEvent.click(restartButton);
    
    // Should reset to initial message
    expect(screen.getByText('Hello! I'm your LinkDAO support assistant. How can I help you today?')).toBeInTheDocument();
  });

  it('closes the chat modal', () => {
    render(<AIChatSupport />);
    
    // Open the chat
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    // Close the chat
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Chat should be closed
    expect(screen.queryByText('LinkDAO Support Assistant')).not.toBeInTheDocument();
  });
});