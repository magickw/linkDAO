import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GestureHandler from '../GestureHandler';

describe('GestureHandler', () => {
  it('renders children correctly', () => {
    render(
      <GestureHandler>
        <div>Test Content</div>
      </GestureHandler>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('calls onTap when element is tapped', () => {
    const onTap = jest.fn();
    
    render(
      <GestureHandler onTap={onTap}>
        <div>Tap me</div>
      </GestureHandler>
    );

    const element = screen.getByText('Tap me').parentElement;
    
    // Simulate mouse down and up (desktop tap)
    fireEvent.mouseDown(element!, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(element!, { clientX: 100, clientY: 100 });

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('calls onLongPress when element is long pressed', async () => {
    const onLongPress = jest.fn();
    
    render(
      <GestureHandler onLongPress={onLongPress} longPressDelay={100}>
        <div>Long press me</div>
      </GestureHandler>
    );

    const element = screen.getByText('Long press me').parentElement;
    
    // Simulate touch start
    fireEvent.touchStart(element!, {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    // Wait for long press delay
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('applies touch-action manipulation style', () => {
    const { container } = render(
      <GestureHandler>
        <div>Test</div>
      </GestureHandler>
    );

    const gestureElement = container.firstChild as HTMLElement;
    expect(gestureElement.style.touchAction).toBe('manipulation');
  });
});