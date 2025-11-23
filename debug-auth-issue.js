// Debug script to check authentication issue
// Run this in browser dev tools console

function debugAuthenticationIssue() {
  console.log('🔍 Debugging Authentication Issue');
  console.log('=====================================');
  
  // Check all possible token storage locations
  const possibleTokenKeys = [
    'linkdao_access_token',
    'token', 
    'authToken',
    'auth_token'
  ];
  
  console.log('📦 LocalStorage tokens:');
  possibleTokenKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      console.log(`  ${key}: ${value.substring(0, 50)}...`);
    } else {
      console.log(`  ${key}: null`);
    }
  });
  
  // Check user data
  const userData = localStorage.getItem('linkdao_user_data') || localStorage.getItem('user_data');
  if (userData) {
    try {
      const parsed = JSON.parse(userData);
      console.log('👤 User data:', {
        address: parsed.address,
        role: parsed.role,
        permissions: parsed.permissions
      });
    } catch (e) {
      console.log('👤 User data: Parse error');
    }
  } else {
    console.log('👤 User data: null');
  }
  
  // Check auth service
  if (window.authService) {
    console.log('🔐 AuthService:');
    console.log('  isAuthenticated:', window.authService.isAuthenticated());
    console.log('  token:', window.authService.getToken()?.substring(0, 50) + '...');
  }
  
  // Test a simple authenticated request
  const token = localStorage.getItem('linkdao_access_token') || 
                localStorage.getItem('token') || 
                localStorage.getItem('authToken') || 
                localStorage.getItem('auth_token');
                
  if (token) {
    console.log('🧪 Testing authenticated request...');
    
    fetch('/api/admin/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('📡 Request response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      return response.text();
    })
    .then(text => {
      console.log('📄 Response body:', text.substring(0, 200) + '...');
    })
    .catch(error => {
      console.log('❌ Request error:', error);
    });
  } else {
    console.log('❌ No token found for testing');
  }
  
  // Check backend URL configuration
  console.log('🌐 Backend configuration:');
  console.log('  NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
  console.log('  Current origin:', window.location.origin);
}

// Auto-run and expose function
debugAuthenticationIssue();
window.debugAuthenticationIssue = debugAuthenticationIssue;

console.log('💡 Run debugAuthenticationIssue() to re-run this check');