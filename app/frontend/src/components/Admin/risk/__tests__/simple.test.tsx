import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test component
const TestComponent = () => <div>Test</div>;

describe('Simple Test', () => {
  it('should render test component', () => {
    render(<TestComponent />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});