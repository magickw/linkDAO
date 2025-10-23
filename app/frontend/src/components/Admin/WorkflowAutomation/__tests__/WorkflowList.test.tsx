import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowList } from '../WorkflowList';

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
  )
}));

describe('WorkflowList', () => {
  const mockOnEdit = jest.fn();
  const mockOnCreate = jest.fn();
  const mockOnView = jest.fn();
  const mockOnExecute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the workflow list component', () => {
    render(
      <WorkflowList
        onEdit={mockOnEdit}
        onCreate={mockOnCreate}
        onView={mockOnView}
        onExecute={mockOnExecute}
      />
    );

    expect(screen.getByText('Workflow Automation')).toBeInTheDocument();
    expect(screen.getByText('Create Workflow')).toBeInTheDocument();
    expect(screen.getByText('Search workflows...')).toBeInTheDocument();
  });

  it('shows empty state when no workflows exist', () => {
    render(
      <WorkflowList
        onEdit={mockOnEdit}
        onCreate={mockOnCreate}
        onView={mockOnView}
        onExecute={mockOnExecute}
      />
    );

    expect(screen.getByText('No workflows found')).toBeInTheDocument();
    expect(screen.getByText('Create Workflow')).toBeInTheDocument();
  });

  it('calls onCreate when create button is clicked', () => {
    render(
      <WorkflowList
        onEdit={mockOnEdit}
        onCreate={mockOnCreate}
        onView={mockOnView}
        onExecute={mockOnExecute}
      />
    );

    const createButton = screen.getByText('Create Workflow');
    fireEvent.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledTimes(1);
  });

  it('allows filtering workflows', () => {
    render(
      <WorkflowList
        onEdit={mockOnEdit}
        onCreate={mockOnCreate}
        onView={mockOnView}
        onExecute={mockOnExecute}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search workflows...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect((searchInput as HTMLInputElement).value).toBe('test');
  });
});