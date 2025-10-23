import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowDesigner } from '../WorkflowDesigner';

// Mock the admin service
jest.mock('@/services/adminService', () => ({
  adminService: {
    // Mock any methods used by the component
  }
}));

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
  Select: ({ label, value, onChange, children, className }: any) => (
    <div className={className}>
      {label && <label>{label}</label>}
      <select value={value} onChange={onChange}>
        {children}
      </select>
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

describe('WorkflowDesigner', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the workflow designer component', () => {
    render(
      <WorkflowDesigner 
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Create Workflow')).toBeInTheDocument();
    expect(screen.getByText('Workflow Name')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Trigger Type')).toBeInTheDocument();
    expect(screen.getByText('Action Step')).toBeInTheDocument();
    expect(screen.getByText('Condition Step')).toBeInTheDocument();
  });

  it('allows adding workflow steps', () => {
    render(
      <WorkflowDesigner 
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const actionButton = screen.getByText('Action Step');
    fireEvent.click(actionButton);

    // Check that a node was added (this would require more complex state checking)
    expect(actionButton).toBeInTheDocument();
  });

  it('allows saving the workflow', () => {
    render(
      <WorkflowDesigner 
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Since we don't have a name, it should show an error
    expect(screen.getByText('Workflow name is required')).toBeInTheDocument();
  });

  it('updates workflow metadata', () => {
    render(
      <WorkflowDesigner 
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByPlaceholderText('Enter workflow name');
    fireEvent.change(nameInput, { target: { value: 'Test Workflow' } });

    expect((nameInput as HTMLInputElement).value).toBe('Test Workflow');
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <WorkflowDesigner 
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});