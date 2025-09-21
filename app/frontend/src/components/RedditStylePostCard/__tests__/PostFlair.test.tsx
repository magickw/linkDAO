import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostFlair, { FlairConfig } from '../PostFlair';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

describe('PostFlair', () => {
  const mockFlairConfig: FlairConfig = {
    id: 'discussion',
    name: 'Discussion',
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    textColor: '#1e40af',
    description: 'General discussion topic',
    moderatorOnly: false
  };

  const mockModeratorFlair: FlairConfig = {
    id: 'announcement',
    name: 'Announcement',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    textColor: '#991b1b',
    description: 'Official announcement',
    moderatorOnly: true
  };

  it('renders string flair correctly', () => {
    render(<PostFlair flair="Discussion" />);
    
    expect(screen.getByText('Discussion')).toBeInTheDocument();
    expect(screen.getByLabelText('Flair: Discussion')).toBeInTheDocument();
  });

  it('renders FlairConfig flair correctly', () => {
    render(<PostFlair flair={mockFlairConfig} />);
    
    expect(screen.getByText('Discussion')).toBeInTheDocument();
    expect(screen.getByLabelText('Flair: Discussion')).toBeInTheDocument();
  });

  it('displays moderator shield for moderator-only flairs', () => {
    render(<PostFlair flair={mockModeratorFlair} />);
    
    expect(screen.getByText('🛡️')).toBeInTheDocument();
    expect(screen.getByText('Announcement')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<PostFlair flair="Test" size="sm" />);
    let element = screen.getByLabelText('Flair: Test');
    expect(element).toHaveClass('text-xs', 'px-2', 'py-0.5');

    rerender(<PostFlair flair="Test" size="md" />);
    element = screen.getByLabelText('Flair: Test');
    expect(element).toHaveClass('text-sm', 'px-2.5', 'py-1');

    rerender(<PostFlair flair="Test" size="lg" />);
    element = screen.getByLabelText('Flair: Test');
    expect(element).toHaveClass('text-base', 'px-3', 'py-1.5');
  });

  it('applies filled variant styles correctly', () => {
    render(<PostFlair flair={mockFlairConfig} variant="filled" />);
    
    const element = screen.getByLabelText('Flair: Discussion');
    
    expect(element.style.backgroundColor).toBe('rgb(219, 234, 254)');
    expect(element.style.color).toBe('rgb(30, 64, 175)');
    expect(element.style.border).toBe('1px solid rgb(59, 130, 246)');
  });

  it('applies outlined variant styles correctly', () => {
    render(<PostFlair flair={mockFlairConfig} variant="outlined" />);
    
    const element = screen.getByLabelText('Flair: Discussion');
    
    expect(element.style.backgroundColor).toBe('transparent');
    expect(element.style.color).toBe('rgb(59, 130, 246)');
    expect(element.style.border).toBe('1px solid rgb(59, 130, 246)');
  });

  it('applies subtle variant styles correctly', () => {
    render(<PostFlair flair={mockFlairConfig} variant="subtle" />);
    
    const element = screen.getByLabelText('Flair: Discussion');
    
    expect(element.style.backgroundColor).toBe('rgba(219, 234, 254, 0.125)');
    expect(element.style.color).toBe('rgb(30, 64, 175)');
    expect(element.style.border).toBe('none');
  });

  it('handles click events when clickable', async () => {
    const user = userEvent.setup();
    const mockOnClick = jest.fn();
    
    render(
      <PostFlair 
        flair={mockFlairConfig} 
        clickable={true} 
        onClick={mockOnClick}
      />
    );
    
    const element = screen.getByLabelText('Flair: Discussion');
    await user.click(element);
    
    expect(mockOnClick).toHaveBeenCalledWith(mockFlairConfig);
  });

  it('does not handle click events when not clickable', async () => {
    const user = userEvent.setup();
    const mockOnClick = jest.fn();
    
    render(
      <PostFlair 
        flair={mockFlairConfig} 
        clickable={false} 
        onClick={mockOnClick}
      />
    );
    
    const element = screen.getByLabelText('Flair: Discussion');
    await user.click(element);
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('renders as button when clickable', () => {
    render(<PostFlair flair="Test" clickable={true} />);
    
    const element = screen.getByLabelText('Flair: Test');
    expect(element.tagName).toBe('BUTTON');
  });

  it('renders as span when not clickable', () => {
    render(<PostFlair flair="Test" clickable={false} />);
    
    const element = screen.getByLabelText('Flair: Test');
    expect(element.tagName).toBe('SPAN');
  });

  it('applies custom className', () => {
    render(<PostFlair flair="Test" className="custom-class" />);
    
    const element = screen.getByLabelText('Flair: Test');
    expect(element).toHaveClass('custom-class');
  });

  it('shows description in title attribute', () => {
    render(<PostFlair flair={mockFlairConfig} />);
    
    const element = screen.getByLabelText('Flair: Discussion');
    expect(element).toHaveAttribute('title', 'General discussion topic');
  });

  it('shows name in title when no description', () => {
    const flairWithoutDescription = { ...mockFlairConfig, description: undefined };
    render(<PostFlair flair={flairWithoutDescription} />);
    
    const element = screen.getByLabelText('Flair: Discussion');
    expect(element).toHaveAttribute('title', 'Discussion');
  });

  it('applies hover classes when clickable', () => {
    render(<PostFlair flair="Test" clickable={true} />);
    
    const element = screen.getByLabelText('Flair: Test');
    expect(element).toHaveClass('cursor-pointer', 'hover:scale-105', 'hover:shadow-sm');
  });

  it('does not apply hover classes when not clickable', () => {
    render(<PostFlair flair="Test" clickable={false} />);
    
    const element = screen.getByLabelText('Flair: Test');
    expect(element).not.toHaveClass('cursor-pointer', 'hover:scale-105', 'hover:shadow-sm');
  });

  it('handles string flair with default colors', () => {
    render(<PostFlair flair="Simple" />);
    
    const element = screen.getByLabelText('Flair: Simple');
    expect(element.style.backgroundColor).toBe('rgb(219, 234, 254)');
    expect(element.style.color).toBe('rgb(30, 64, 175)');
    expect(element.style.border).toBe('1px solid rgb(59, 130, 246)');
  });
});