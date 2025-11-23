# Integration Guide

## Overview

LinkDAO provides multiple integration options for external services and applications.

## REST API Integration

### Authentication

```javascript
const response = await fetch('https://api.linkdao.io/auth/wallet-connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '0x...',
    signature: '0x...'
  })
});

const { token } = await response.json();
```

### Making API Calls

```javascript
const response = await fetch('https://api.linkdao.io/api/products', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Webhook Integration

### Setting Up Webhooks

```javascript
await client.webhooks.create({
  url: 'https://your-domain.com/webhook',
  events: ['order.created', 'payment.completed']
});
```

### Handling Webhooks

```javascript
app.post('/webhook', (req, res) => {
  const event = req.body;
  
  switch(event.type) {
    case 'order.created':
      handleOrderCreated(event.data);
      break;
    case 'payment.completed':
      handlePaymentCompleted(event.data);
      break;
  }
  
  res.status(200).send('OK');
});
```

## Third-Party Integrations

### Supported Platforms

- **IPFS** - Decentralized storage
- **The Graph** - Blockchain indexing
- **Chainlink** - Oracle services
- **OpenSea** - NFT marketplace
- **Discord** - Community integration

## OAuth Integration

Coming soon!

## Support

For integration help:
- Email: integrations@linkdao.io
- Discord: #integrations
- Documentation: [API Reference](/docs/api-reference)
