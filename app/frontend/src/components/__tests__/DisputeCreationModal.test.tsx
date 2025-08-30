import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputeCreationModal, DisputeType } from '../DisputeCreationModal';

// Mock the dispute service
jest.mock('../../services/disputeService', () => ({
  disputeService: {
    createDispute: jest.fn()
  }
}));

describe('DisputeCreationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    escrowId: 123,
    onSubmit: mockOnSubmit
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<DisputeCreationModal {...defaultProps} />);
    
    expect(screen.getByText('Create Dispute')).toBeInTheDocument();
    expect(screen.getByText('Dispute Type')).toBeInTheDocument();
    expect(screen.getByText('Detailed Reason *')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<DisputeCreationModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Create Dispute')).not.toBeInTheDocument();
  });

  it('displays all dispute type options', () => {
    render(<DisputeCreationModal {...defaultProps} />);
    
    expect(screen.getByText('Product Not Received')).toBeInTheDocument();
    expect(screen.getByText('Product Not as Described')).toBeInTheDocument();
    expect(screen.getByText('Damaged Product')).toBeInTheDocument();
    expect(screen.getByText('Unauthorized Transaction')).toBeInTheDocument();
    expect(screen.getByText('Seller Misconduct')).toBeInTheDocument();
    expect(screen.getByText('Buyer Misconduct')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('allows selecting dispute type', async () => {
    const user = userEvent.setup();
    render(<DisputeCreationModal {...defaultProps} />);
    
    const damagedProductRadio = screen.getByDisplayValue(DisputeType.DAMAGED_PRODUCT);
    await user.click(damagedProductRadio);
    
    expect(damagedProductRadio).toBeChecked();
  });

  it('validates minimum reason length', async () => {
    const user = userEvent.setup();
    render(<DisputeCreationModal {...defaultProps} />);
    
    const reasonTextarea = screen.getByPlaceholderText('Please provide a detailed explanation of the issue...');
    const submitButton = screen.getByText('Create Dispute');
    
    // Try to submit with short reason
    await user.type(reasonTextarea, 'Short');
    await user.click(submitButton);
    
    expect(screen.getByText('Please provide a detailed reason (at least 10 characters)')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows character count for reason field', async () => {
    const user = userEvent.setup();
    render(<DisputeCreationModal {...defaultProps} />);
    
    const reasonTextarea = screen.getByPlaceholderText('Please provide a detailed explanation of the issue...');
    
    await user.type(reasonTextarea, 'This is a test reason');
    
    expect(screen.getByText('21/1000 characters (minimum 10 required)')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(<DisputeCreationModal {...defaultProps} />);
    
    // Select dispute type
    const damagedProductRadio = screen.getByDisplayValue(DisputeType.DAMAGED_PRODUCT);
    await user.click(damagedProductRadio);
    
    // Enter reason
    const reasonTextarea = screen.getByPlaceholderText('Please provide a detailed explanation of the issue...');
    await user.type(reasonTextarea, 'The product arrived with significant damage to the packaging and contents');
    
    // Enter evidence
    const evidenceTextarea = screen.getByPlaceholderText('Any additional information, links, or references that support your case...');
    await user.type(evidenceTextarea, 'I have photos of the damaged packaging');
    
    // Submit form
    const submitButton = screen.getByText('Create Dispute');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        escrowId: 123,
        disputeType: DisputeType.DAMAGED_PRODUCT,
        reason: 'The product arrived with significant damage to the packaging and contents',
        evidence: 'I have photos of the damaged packaging'
      });
    });
  });

  it('handles submission error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to create dispute';
    mockOnSubmit.mockRejectedValue(new Error(errorMessage));
    
    render(<DisputeCreationModal {...defaultProps} />);
    
    // Fill form with valid data
    const reasonTextarea = screen.getByPlaceholderText('Please provide a detailed explanation of the issue...');
    await user.type(reasonTextarea, 'Valid reason with enough characters');
    
    const submitButton = screen.getByText('Create Dispute');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(`Error loading analytics: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('disables submit button when submitting', async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValue(submitPromise);
    
    render(<DisputeCreationModal {...defaultProps} />);
    
    // Fill form
    const reasonTextarea = screen.getByPlaceholderText('Please provide a detailed explanation of the issue...');
    await user.type(reasonTextarea, 'Valid reason with enough characters');
    
    const submitButton = screen.getByText('Create Dispute');
    await user.click(submitButton);
    
    // Button should be disabled and show loading text
    expect(screen.getByText('Creating Dispute...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    // Resolve the promise
    resolveSubmit!();
    await waitFor(() => {
      expect(screen.getByText('Create Dispute')).toBeInTheDocument();
    });
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<DisputeCreationModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<DisputeCreationModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays important notice', () => {
    render(<DisputeCreationModal {...defaultProps} />);
    
    expect(screen.getByText('Important Notice')).toBeInTheDocument();
    expect(screen.getByText('• Once created, disputes cannot be cancelled')).toBeInTheDocument();
    expect(screen.getByText('• You will have 3 days to submit evidence')).toBeInTheDocument();
    expect(screen.getByText('• False disputes may negatively impact your reputation')).toBeInTheDocument();
    expect(screen.getByText('• Resolution may take 5-10 business days')).toBeInTheDocument();
  });

  it('resets form after successful submission', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(<DisputeCreationModal {...defaultProps} />);
    
    // Fill and submit form
    const reasonTextarea = screen.getByPlaceholderText('Please provide a detailed explanation of the issue...');
    await user.type(reasonTextarea, 'Valid reason with enough characters');
    
    const submitButton = screen.getByText('Create Dispute');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('validates dispute type descriptions', () => {
    render(<DisputeCreationModal {...defaultProps} />);
    
    expect(screen.getByText('You paid for a product but never received it')).toBeInTheDocument();
    expect(screen.getByText('The product received differs significantly from the description')).toBeInTheDocument();
    expect(screen.getByText('The product arrived damaged or defective')).toBeInTheDocument();
  });

  it('handles evidence field correctly', async () => {
    const user = userEvent.setup();
    render(<DisputeCreationModal {...defaultProps} />);
    
    const evidenceTextarea = screen.getByPlaceholderText('Any additional information, links, or references that support your case...');
    
    await user.type(evidenceTextarea, 'Additional evidence text');
    
    expect(evidenceTextarea).toHaveValue('Additional evidence text');
    expect(screen.getByText('You can submit additional evidence (images, documents) after creating the dispute')).toBeInTheDocument();
  });
});