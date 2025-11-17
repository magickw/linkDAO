const Redis = require('redis');

console.log('Testing Redis connection...');

// Use the same Redis URL as in your configuration
const redisUrl = 'redis://localhost:6379';
console.log('Connecting to Redis at:', redisUrl);

const client = Redis.createClient({
  url: redisUrl
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('✅ Redis Client Connected');
});

client.on('ready', () => {
  console.log('✅ Redis Client Ready');
  client.ping().then((result) => {
    console.log('✅ Redis Ping Response:', result);
    client.quit();
  }).catch((err) => {
    console.error('❌ Redis Ping Error:', err);
    client.quit();
  });
});

client.connect().catch((err) => {
  console.error('❌ Redis Connection Failed:', err);
});