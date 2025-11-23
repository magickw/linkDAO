# Deployment Guide

## Overview

This guide covers deploying LinkDAO to production environments. We support multiple deployment options for different use cases.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- Base network RPC access
- Domain name (for production)
- SSL certificate

## Deployment Options

### Option 1: Vercel (Recommended for Frontend)

**Advantages:**
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Serverless functions

**Steps:**

1. **Connect Repository**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

2. **Configure Environment Variables**

In Vercel dashboard, add:
```
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_LDAO_TOKEN_ADDRESS=0x...
DATABASE_URL=postgresql://...
```

3. **Deploy**
```bash
vercel --prod
```

### Option 2: Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Deploy:**
```bash
# Build image
docker build -t linkdao-app .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  linkdao-app
```

### Option 3: Traditional Server

**Requirements:**
- Ubuntu 20.04+ or similar
- Nginx for reverse proxy
- PM2 for process management

**Steps:**

1. **Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2
```

2. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/linkdao/linkdao.git
cd linkdao

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start npm --name "linkdao" -- start
pm2 save
pm2 startup
```

3. **Configure Nginx**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Database Setup

### PostgreSQL Configuration

```bash
# Create database
createdb linkdao

# Run migrations
npm run db:migrate

# Seed data (optional)
npm run db:seed
```

### Connection Pooling

```typescript
// db/config.ts
export const dbConfig = {
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

## Environment Configuration

### Production Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/linkdao
DATABASE_POOL_SIZE=20

# Blockchain
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_LDAO_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_USDC_TOKEN_ADDRESS=0x...

# API
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
JWT_SECRET=your-secret-key-min-32-chars

# IPFS
IPFS_GATEWAY=https://ipfs.io/ipfs/
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_KEY=your-pinata-secret

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

## SSL/HTTPS Setup

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Monitoring

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs linkdao

# Check status
pm2 status
```

### Health Checks

```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}
```

## Scaling

### Horizontal Scaling

```bash
# Scale with PM2
pm2 scale linkdao 4  # Run 4 instances
```

### Load Balancing

```nginx
upstream linkdao_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    location / {
        proxy_pass http://linkdao_backend;
    }
}
```

## Backup Strategy

### Database Backups

```bash
# Daily backup script
#!/bin/bash
pg_dump linkdao > backup_$(date +%Y%m%d).sql
```

### Automated Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] Firewall configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers set
- [ ] Regular updates applied

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
lsof -ti:3000 | xargs kill -9
```

**Database Connection Failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql
```

**Out of Memory**
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

## Rollback Procedure

```bash
# Revert to previous version
pm2 stop linkdao
git checkout previous-tag
npm install
npm run build
pm2 restart linkdao
```

## Support

For deployment assistance:
- Email: devops@linkdao.io
- Discord: #deployment channel
- Documentation: [Architecture](/docs/architecture)
