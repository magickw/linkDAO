import { renderHook, act } from '@testing-library/react';
import { useRateLimit } from '../useRateLimit';

describe('useRateLimit', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow requests within rate limit', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRateLimit({ maxRequests: 3, timeWindow: 1000 }));

    // Set the function to be rate limited
    act(() => {
      result.current.setFunction(mockFunction);
    });

    // Execute within limit
    let response;
    await act(async () => {
      response = await result.current.execute();
    });

    expect(response).toBe('success');
    expect(mockFunction).toHaveBeenCalledTimes(1);
    expect(result.current.state.isRateLimited).toBe(false);
    expect(result.current.state.remainingRequests).toBe(2);
  });

  it('should block requests when rate limit is exceeded', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const onError = jest.fn();
    const { result } = renderHook(() => useRateLimit({ 
      maxRequests: 2, 
      timeWindow: 1000,
      onError
    }));

    // Set the function to be rate limited
    act(() => {
      result.current.setFunction(mockFunction);
    });

    // Execute up to limit
    await act(async () => {
      await result.current.execute();
      await result.current.execute();
    });

    // Try to exceed limit
    let response;
    await act(async () => {
      response = await result.current.execute();
    });

    expect(response).toBeNull();
    expect(mockFunction).toHaveBeenCalledTimes(2);
    expect(result.current.state.isRateLimited).toBe(true);
    expect(result.current.state.remainingRequests).toBe(0);
    expect(onError).toHaveBeenCalledWith('Rate limit exceeded. Please try again later.');
  });

  it('should reset rate limit after time window', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRateLimit({ maxRequests: 2, timeWindow: 1000 }));

    // Set the function to be rate limited
    act(() => {
      result.current.setFunction(mockFunction);
    });

    // Execute up to limit
    await act(async () => {
      await result.current.execute();
      await result.current.execute();
    });

    expect(result.current.state.isRateLimited).toBe(true);

    // Advance time beyond window
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    // Should be able to execute again
    let response;
    await act(async () => {
      response = await result.current.execute();
    });

    expect(response).toBe('success');
    expect(mockFunction).toHaveBeenCalledTimes(3);
    expect(result.current.state.isRateLimited).toBe(false);
    expect(result.current.state.remainingRequests).toBe(1);
  });

  it('should reset rate limit manually', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRateLimit({ maxRequests: 2, timeWindow: 1000 }));

    // Set the function to be rate limited
    act(() => {
      result.current.setFunction(mockFunction);
    });

    // Execute up to limit
    await act(async () => {
      await result.current.execute();
      await result.current.execute();
    });

    expect(result.current.state.isRateLimited).toBe(true);

    // Reset manually
    act(() => {
      result.current.reset();
    });

    // Should be able to execute again
    let response;
    await act(async () => {
      response = await result.current.execute();
    });

    expect(response).toBe('success');
    expect(mockFunction).toHaveBeenCalledTimes(3);
    expect(result.current.state.isRateLimited).toBe(false);
    expect(result.current.state.remainingRequests).toBe(1);
  });

  it('should handle function errors properly', async () => {
    const mockFunction = jest.fn().mockRejectedValue(new Error('Test error'));
    const onError = jest.fn();
    const { result } = renderHook(() => useRateLimit({ 
      maxRequests: 3, 
      timeWindow: 1000,
      onError
    }));

    // Set the function to be rate limited
    act(() => {
      result.current.setFunction(mockFunction);
    });

    // Execute function that throws error
    let error: Error | null = null;
    try {
      await act(async () => {
        await result.current.execute();
      });
    } catch (e) {
      error = e as Error;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Test error');
    expect(mockFunction).toHaveBeenCalledTimes(1);
    expect(result.current.state.isRateLimited).toBe(false); // Error doesn't count against rate limit
    expect(result.current.state.remainingRequests).toBe(3); // No requests consumed because of error
    expect(onError).toHaveBeenCalledWith('Test error');
  });

  // Test specific rate limiters
  it('should provide specific rate limiters with correct configs', () => {
    const { result: aiPostResult } = renderHook(() => useRateLimit({ 
      maxRequests: 5, 
      timeWindow: 60000 
    }));
    
    const { result: aiRecommendationResult } = renderHook(() => useRateLimit({ 
      maxRequests: 10, 
      timeWindow: 60000 
    }));
    
    const { result: communityJoinResult } = renderHook(() => useRateLimit({ 
      maxRequests: 20, 
      timeWindow: 60000 
    }));

    expect(aiPostResult.current.state.remainingRequests).toBe(5);
    expect(aiRecommendationResult.current.state.remainingRequests).toBe(10);
    expect(communityJoinResult.current.state.remainingRequests).toBe(20);
  });
});