/**
 * Redux Error Boundary
 * 
 * Catches and handles errors in Redux middleware and reducers
 */

export const reduxErrorMiddleware = (store: any) => (next: any) => (action: any) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Redux middleware error:', error);
    console.error('Action:', action);
    
    // Dispatch error action
    store.dispatch({
      type: 'REDUX_ERROR',
      payload: {
        error: error instanceof Error ? error.message : String(error),
        action: action.type
      }
    });
    
    // Don't throw - allow app to continue
    return undefined;
  }
};

export const wrapReducer = (reducer: any) => {
  return (state: any, action: any) => {
    try {
      return reducer(state, action);
    } catch (error) {
      console.error('Reducer error:', error);
      console.error('Action:', action);
      console.error('State:', state);
      
      // Return current state to prevent crash
      return state;
    }
  };
};

// Promise rejection handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Check if this is a known extension-related error
    const reason = event.reason?.message || event.reason?.toString() || '';
    if (reason.includes('Invalid frameId for foreground frameId') || 
        reason.includes('No tab with id') ||
        reason.includes('background-redux-new.js')) {
      console.debug('Ignoring known extension error:', reason);
      event.preventDefault();
      return;
    }
    
    // Prevent default browser behavior for unknown errors
    event.preventDefault();
    
    // Log to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      (window as any).errorTracker.captureException(event.reason);
    }
  });
}