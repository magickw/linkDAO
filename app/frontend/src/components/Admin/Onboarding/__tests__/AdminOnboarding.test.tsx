import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminOnboarding } from '../AdminOnboarding';

// Mock the design system components
jest.mock('@/design-system', () => ({
  Button: ({ children, onClick, disabled, variant, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={className}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
  GlassPanel: ({ children, className }: any) => (
    <div className={className} data-testid="glass-panel">
      {children}
    </div>
  ),
  Input: ({ label, value, onChange, placeholder, required, className }: any) => (
    <div className={className}>
      {label && <label>{label}</label>}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </div>
  ),
  TextArea: ({ label, value, onChange, placeholder, rows, className }: any) => (
    <div className={className}>
      {label && <label>{label}</label>}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  )
}));

describe('AdminOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the onboarding component', () => {
    render(<AdminOnboarding />);
    
    expect(screen.getByText('Admin Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('navigates between steps', () => {
    render(<AdminOnboarding />);
    
    // Check initial step
    expect(screen.getByText('Welcome to Admin Dashboard')).toBeInTheDocument();
    
    // Click next
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    // Check second step
    expect(screen.getByText('Set Up Your Profile')).toBeInTheDocument();
    
    // Click previous
    const previousButton = screen.getByText('Previous');
    fireEvent.click(previousButton);
    
    // Check first step again
    expect(screen.getByText('Welcome to Admin Dashboard')).toBeInTheDocument();
  });

  it('allows profile data input', () => {
    render(<AdminOnboarding />);
    
    // Navigate to profile step
    fireEvent.click(screen.getByText('Next'));
    
    // Fill in profile data
    const nameInput = screen.getByPlaceholderText('Enter your full name');
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    
    const roleInput = screen.getByPlaceholderText('e.g., Content Moderator, System Admin');
    fireEvent.change(roleInput, { target: { value: 'Content Moderator' } });
    
    expect((nameInput as HTMLInputElement).value).toBe('John Doe');
    expect((roleInput as HTMLInputElement).value).toBe('Content Moderator');
  });

  it('completes the onboarding process', () => {
    // Mock alert
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<AdminOnboarding />);
    
    // Navigate through all steps
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Next'));
    }
    
    // Complete onboarding
    const completeButton = screen.getByText('Complete Onboarding');
    fireEvent.click(completeButton);
    
    expect(mockAlert).toHaveBeenCalledWith('Onboarding completed! You\'re ready to use the admin dashboard.');
    
    mockAlert.mockRestore();
  });
});