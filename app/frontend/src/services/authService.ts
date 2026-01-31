class AuthService {
  private authToken: string | null = null;

  constructor() {
    this.loadAuthToken();
  }

  private loadAuthToken(): void {
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || localStorage.getItem('user_session') || sessionStorage.getItem('auth_token') || sessionStorage.getItem('token') || sessionStorage.getItem('authToken');

      if (!token) {
        try {
          const sessionDataStr = localStorage.getItem('linkdao_session_data');
          if (sessionDataStr) {
            const sessionData = JSON.parse(sessionDataStr);
            token = sessionData.token || sessionData.accessToken || '';
          }
        } catch (error) {
          console.warn('Failed to parse linkdao_session_data');
        }
      }

      this.authToken = token;
    }
  }

  public getToken(): string | null {
    this.loadAuthToken();
    return this.authToken;
  }

  public getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }
}

export const authService = new AuthService();

// Export authenticatedFetch function for use in other services
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = authService.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
