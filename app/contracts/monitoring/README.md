# LinkDAO Monitoring & Alerting Infrastructure

## Overview

This monitoring system provides real-time tracking of LinkDAO smart contracts on mainnet, including:

- Critical event monitoring
- Contract health checks
- Gas price tracking
- Balance monitoring
- Multi-channel alerting (Slack, Discord, Email)

## Setup

### 1. Install Dependencies

```bash
npm install ethers axios dotenv
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Network Configuration
NETWORK=mainnet
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# Contract Addresses (fill after deployment)
LDAO_TOKEN_ADDRESS=0x...
GOVERNANCE_ADDRESS=0x...
MARKETPLACE_ADDRESS=0x...
ENHANCED_ESCROW_ADDRESS=0x...
PAYMENT_ROUTER_ADDRESS=0x...

# Deployer Account (for balance monitoring)
DEPLOYER_ADDRESS=0x...

# Alert Channels
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
ALERT_EMAIL=devops@linkdao.io
```

### 3. Set Up Alert Channels

#### Slack Integration

1. Go to your Slack workspace settings
2. Navigate to "Apps" → "Manage" → "Custom Integrations" → "Incoming Webhooks"
3. Add a new webhook and select the channel for alerts
4. Copy the webhook URL to your `.env` file

#### Discord Integration

1. Open your Discord server settings
2. Go to "Integrations" → "Webhooks"
3. Create a new webhook for your alerts channel
4. Copy the webhook URL to your `.env` file

#### Email Integration

Configure your email service (SendGrid, AWS SES, etc.) and update the `sendAlert` method in `monitor-contracts.js`.

## Usage

### Start Monitoring

```bash
# For mainnet
node scripts/monitor-contracts.js

# For testnet (update .env NETWORK=sepolia)
node scripts/monitor-contracts.js
```

### Run as Background Service

Using PM2:

```bash
# Install PM2
npm install -g pm2

# Start monitor
pm2 start scripts/monitor-contracts.js --name linkdao-monitor

# View logs
pm2 logs linkdao-monitor

# Monitor status
pm2 status

# Stop monitor
pm2 stop linkdao-monitor
```

Using systemd (Linux):

```bash
# Create service file
sudo nano /etc/systemd/system/linkdao-monitor.service
```

```ini
[Unit]
Description=LinkDAO Contract Monitor
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/LinkDAO/app/contracts
ExecStart=/usr/bin/node scripts/monitor-contracts.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable linkdao-monitor
sudo systemctl start linkdao-monitor
sudo systemctl status linkdao-monitor
```

## Monitored Events

### Critical Events

- `OwnershipTransferred` - Contract ownership changes
- `Paused` - Contract paused
- `Unpaused` - Contract unpaused
- `EmergencyWithdraw` - Emergency withdrawals
- `DisputeCreated` - New disputes
- `ProposalCreated` - New governance proposals
- `ProposalExecuted` - Executed governance proposals

### Automatic Checks

- **Deployer Balance**: Alerts when deployer ETH balance drops below 1 ETH
- **Gas Prices**: Logs when gas exceeds 150 gwei
- **Contract Health**: Periodic checks of contract status (paused state, ownership)
- **Failed Transactions**: Tracks failed transaction patterns

## Alert Severity Levels

- **🚨 High (Red)**: Critical events requiring immediate attention
- **⚠️ Warning (Yellow)**: Important events that should be reviewed soon
- **ℹ️ Info (Blue)**: Informational events for audit trail

## Monitoring Dashboard

### Metrics

The monitor tracks and reports:

- Events processed
- Alerts sent
- Errors encountered
- Uptime
- Event cache size
- Last check timestamp

### Status Check

Press `Ctrl+C` once to display current status, twice to shutdown.

## Customization

### Add Custom Events

Edit `MONITORING_CONFIG.criticalEvents` in `monitor-contracts.js`:

```javascript
criticalEvents: [
  "OwnershipTransferred",
  "YourCustomEvent",
  // ... add more events
],
```

### Adjust Thresholds

Modify thresholds in `MONITORING_CONFIG.thresholds`:

```javascript
thresholds: {
  highGasPrice: ethers.parseUnits("200", "gwei"),
  largeTransfer: ethers.parseEther("5000"),
  lowBalance: ethers.parseEther("5"),
  failedTxCount: 10,
},
```

### Add New Contracts

Add contracts to monitor in `MONITORING_CONFIG.contracts`:

```javascript
contracts: {
  LDAOToken: process.env.LDAO_TOKEN_ADDRESS,
  YourNewContract: process.env.YOUR_CONTRACT_ADDRESS,
},
```

## Troubleshooting

### No Alerts Received

1. Check webhook URLs are correct
2. Verify environment variables are loaded
3. Test webhooks manually:

```bash
# Test Slack
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert"}' \
  YOUR_SLACK_WEBHOOK_URL

# Test Discord
curl -X POST -H 'Content-type: application/json' \
  --data '{"content":"Test alert"}' \
  YOUR_DISCORD_WEBHOOK_URL
```

### RPC Connection Issues

- Verify RPC URL is accessible
- Check API key limits/quotas
- Consider using backup RPC providers
- Increase poll interval if rate-limited

### High CPU Usage

- Increase `pollInterval` in config
- Reduce number of monitored events
- Implement event filtering

## Production Recommendations

1. **Use Dedicated RPC Provider**: Infura, Alchemy, or run your own node
2. **Redundant Monitoring**: Run multiple monitors in different regions
3. **Database Integration**: Store events in database for analysis
4. **Alerting Rules**: Implement alert throttling and aggregation
5. **Monitoring Metrics**: Export metrics to Prometheus/Grafana
6. **Log Aggregation**: Send logs to centralized logging (DataDog, CloudWatch)
7. **Health Checks**: Set up external monitoring of the monitor itself

## Advanced Features

### Grafana Dashboard

Export metrics to Prometheus for visualization:

```javascript
const prometheus = require('prom-client');
const register = new prometheus.Registry();

const eventsCounter = new prometheus.Counter({
  name: 'linkdao_events_total',
  help: 'Total number of events processed',
  registers: [register]
});

// Increment in your code
eventsCounter.inc();
```

### Database Storage

Store events for historical analysis:

```javascript
const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  contract: String,
  event: String,
  args: mongoose.Schema.Types.Mixed,
  timestamp: Date,
  txHash: String,
});

const Event = mongoose.model('Event', EventSchema);

// Save events
await Event.create(eventData);
```

## Support

For issues or questions:
- **Email**: devops@linkdao.io
- **Discord**: LinkDAO Development
- **GitHub**: Open an issue

## License

MIT License - See LICENSE file for details
