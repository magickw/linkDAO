// Debug script to check Redis configuration
console.log('=== Redis Configuration Debug ===');

// Check environment variables
console.log('REDIS_URL:', process.env.REDIS_URL ? process.env.REDIS_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'Not set');
console.log('REDIS_HOST:', process.env.REDIS_HOST || 'Not set');
console.log('REDIS_PORT:', process.env.REDIS_PORT || 'Not set');
console.log('REDIS_ENABLED:', process.env.REDIS_ENABLED || 'Not set');
console.log('MEMORY_LIMIT:', process.env.MEMORY_LIMIT || 'Not set');

// Check if we're in a Render environment
console.log('RENDER:', process.env.RENDER || 'Not set');
console.log('RENDER_PRO:', process.env.RENDER_PRO || 'Not set');
console.log('RENDER_SERVICE_TYPE:', process.env.RENDER_SERVICE_TYPE || 'Not set');

console.log('=== Configuration Debug Complete ===');