import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ToastNotification from './ToastNotification';

describe('ToastNotification', () => {
  const mockOnClose = jest.fn();
  const mockToast = {
    id: '1',
    message: 'Test message',
    type: 'success' as const,
    duration: 5000,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockOnClose.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the toast message', () => {
    render(<ToastNotification {...mockToast} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies correct styling for success type', () => {
    render(<ToastNotification {...mockToast} type="success" />);
    
    const toast = screen.getByText('Test message').closest('div');
    expect(toast).toHaveClass('bg-green-100', 'border-green-400', 'text-green-700');
  });

  it('applies correct styling for error type', () => {
    render(<ToastNotification {...mockToast} type="error" />);
    
    const toast = screen.getByText('Test message').closest('div');
    expect(toast).toHaveClass('bg-red-100', 'border-red-400', 'text-red-700');
  });

  it('applies correct styling for warning type', () => {
    render(<ToastNotification {...mockToast} type="warning" />);
    
    const toast = screen.getByText('Test message').closest('div');
    expect(toast).toHaveClass('bg-yellow-100', 'border-yellow-400', 'text-yellow-700');
  });

  it('applies correct styling for info type', () => {
    render(<ToastNotification {...mockToast} type="info" />);
    
    const toast = screen.getByText('Test message').closest('div');
    expect(toast).toHaveClass('bg-blue-100', 'border-blue-400', 'text-blue-700');
  });

  it('calls onClose when close button is clicked', () => {
    render(<ToastNotification {...mockToast} />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('automatically closes after specified duration', () => {
    render(<ToastNotification {...mockToast} duration={3000} />);
    
    jest.advanceTimersByTime(3000);
    
    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('does not automatically close when duration is 0', () => {
    render(<ToastNotification {...mockToast} duration={0} />);
    
    jest.advanceTimersByTime(5000);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});