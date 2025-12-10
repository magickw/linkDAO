
// EMERGENCY MEMORY-OPTIMIZED INDEX
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// Essential middleware only
app.use(helmet());
app.use(compression({ level: 6 }));
app.use(express.json({ limit: '1mb' }));

// Memory monitoring
const memoryMonitor = setInterval(() => {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  const percent = (heapUsedMB / heapTotalMB) * 100;
  
  if (percent > 90) {
    console.error(`🚨 CRITICAL MEMORY: ${percent.toFixed(1)}%`);
    if (global.gc) global.gc();
  }
}, 5000);

// Essential health check only
app.get('/health', (req, res) => {
  const usage = process.memoryUsage();
  res.json({
    status: 'ok',
    memory: {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024)
    },
    uptime: process.uptime()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  clearInterval(memoryMonitor);
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Emergency server running on port ${PORT}`);
  console.log(`Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
});
