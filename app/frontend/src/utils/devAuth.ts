// Development authentication helper
// This file should only be used in development mode

export const DEV_AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3YWxsZXRBZGRyZXNzIjoiMHhlZTAzNGI1M2Q0Y2NiMTAxYjJhNGZhZWMyNzcwOGJlNTA3MTk3MzUwIiwidHlwZSI6InNlc3Npb24iLCJ0aW1lc3RhbXAiOjE3NjIzMTQxOTk5ODQsImFkZHJlc3MiOiIweGVlMDM0YjUzZDRjY2IxMDFiMmE0ZmFlYzI3NzA4YmU1MDcxOTczNTAiLCJ1c2VySWQiOiIweGVlMDM0YjUzZDRjY2IxMDFiMmE0ZmFlYzI3NzA4YmU1MDcxOTczNTAiLCJpZCI6IjB4ZWUwMzRiNTNkNGNjYjEwMWIyYTRmYWVjMjc3MDhiZTUwNzE5NzM1MCIsImlhdCI6MTc2MjMxNDE5OSwiZXhwIjoxNzYyNDAwNTk5fQ.Qt3t0JFb8pP-KkiU3G1IkxEc0oeVTzXHlB5WzlV7CcY';

export const DEV_WALLET_ADDRESS = '0xEe034b53D4cCb101b2a4faec27708be507197350';

export function setDevAuthToken(): void {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    localStorage.setItem('auth_token', DEV_AUTH_TOKEN);
    console.log('🔧 Development auth token set');
  }
}

export function clearDevAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    console.log('🔧 Development auth token cleared');
  }
}

export function getDevAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

// Auto-set token in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Only set if not already present
  if (!localStorage.getItem('auth_token')) {
    setDevAuthToken();
  }
}