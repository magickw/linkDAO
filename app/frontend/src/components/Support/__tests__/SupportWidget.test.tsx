import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SupportWidget from '../SupportWidget';

// Mock the Lucide icons
jest.mock('lucide-react', () => ({
  HelpCircle: () => <div data-testid="help-circle-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  BookOpen: () => <div data-testid="book-open-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Users: () => <div data-testid="users-icon" />,
  X: () => <div data-testid="x-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
}));

// Mock the AIChatSupport component
jest.mock('../AIChatSupport', () => () => <div data-testid="ai-chat-support" />);

describe('SupportWidget', () => {
  it('renders the main widget button', () => {
    render(<SupportWidget />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByTestId('help-circle-icon')).toBeInTheDocument();
  });

  it('opens the support options when widget button is clicked', () => {
    render(<SupportWidget />);
    
    const widgetButton = screen.getByRole('button');
    fireEvent.click(widgetButton);
    
    expect(screen.getByText('How can we help?')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Community')).toBeInTheDocument();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
  });

  it('closes the support options when X button is clicked', () => {
    render(<SupportWidget />);
    
    // Open the options
    const widgetButton = screen.getByRole('button');
    fireEvent.click(widgetButton);
    
    // Click the X button to close
    const xButton = screen.getByTestId('x-icon').closest('button');
    if (xButton) {
      fireEvent.click(xButton);
    }
    
    // Options should be closed
    expect(screen.queryByText('How can we help?')).not.toBeInTheDocument();
  });

  it('navigates to documentation when Documentation option is clicked', () => {
    delete window.location;
    window.location = { href: '' } as any;
    
    render(<SupportWidget />);
    
    // Open the options
    const widgetButton = screen.getByRole('button');
    fireEvent.click(widgetButton);
    
    // Click Documentation option
    const docOption = screen.getByText('Documentation').closest('button');
    if (docOption) {
      fireEvent.click(docOption);
    }
    
    expect(window.location.href).toBe('/support/documents');
  });

  it('opens community link when Community option is clicked', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation();
    
    render(<SupportWidget />);
    
    // Open the options
    const widgetButton = screen.getByRole('button');
    fireEvent.click(widgetButton);
    
    // Click Community option
    const communityOption = screen.getByText('Community').closest('button');
    if (communityOption) {
      fireEvent.click(communityOption);
    }
    
    expect(openSpy).toHaveBeenCalledWith('https://discord.gg/linkdao', '_blank');
    
    openSpy.mockRestore();
  });

  it('navigates to contact page when Contact Us option is clicked', () => {
    delete window.location;
    window.location = { href: '' } as any;
    
    render(<SupportWidget />);
    
    // Open the options
    const widgetButton = screen.getByRole('button');
    fireEvent.click(widgetButton);
    
    // Click Contact Us option
    const contactOption = screen.getByText('Contact Us').closest('button');
    if (contactOption) {
      fireEvent.click(contactOption);
    }
    
    expect(window.location.href).toBe('/support/contact');
  });

  it('renders the AI chat support component', () => {
    render(<SupportWidget />);
    
    expect(screen.getByTestId('ai-chat-support')).toBeInTheDocument();
  });
});