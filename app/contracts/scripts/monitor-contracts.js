#!/usr/bin/env node

/**
 * LinkDAO Monitoring & Alerting Infrastructure Setup
 *
 * This script sets up monitoring and alerting for deployed LinkDAO contracts.
 * It monitors critical events, transactions, and contract states.
 */

const { ethers } = require("ethers");
const axios = require("axios");
require("dotenv").config();

// Configuration
const MONITORING_CONFIG = {
  network: process.env.NETWORK || "mainnet",
  rpcUrl: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR_KEY",
  pollInterval: 15000, // 15 seconds

  // Alert channels
  slack: {
    enabled: !!process.env.SLACK_WEBHOOK_URL,
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
  },
  discord: {
    enabled: !!process.env.DISCORD_WEBHOOK_URL,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  },
  email: {
    enabled: !!process.env.ALERT_EMAIL,
    address: process.env.ALERT_EMAIL,
  },

  // Monitoring thresholds
  thresholds: {
    highGasPrice: ethers.parseUnits("150", "gwei"),
    largeTransfer: ethers.parseEther("1000"), // 1000 LDAO
    lowBalance: ethers.parseEther("1"), // 1 ETH
    failedTxCount: 5, // Alert after 5 failed txs
  },

  // Critical contracts to monitor
  contracts: {
    LDAOToken: process.env.LDAO_TOKEN_ADDRESS,
    Governance: process.env.GOVERNANCE_ADDRESS,
    Marketplace: process.env.MARKETPLACE_ADDRESS,
    EnhancedEscrow: process.env.ENHANCED_ESCROW_ADDRESS,
    PaymentRouter: process.env.PAYMENT_ROUTER_ADDRESS,
  },

  // Events to monitor
  criticalEvents: [
    "OwnershipTransferred",
    "Paused",
    "Unpaused",
    "EmergencyWithdraw",
    "DisputeCreated",
    "ProposalCreated",
    "ProposalExecuted",
  ],
};

class ContractMonitor {
  constructor(config) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.eventCache = new Set();
    this.metrics = {
      eventsProcessed: 0,
      alertsSent: 0,
      errors: 0,
      lastCheck: null,
    };
  }

  async initialize() {
    console.log("🔍 Initializing LinkDAO Contract Monitor...");
    console.log(`📡 Network: ${this.config.network}`);
    console.log(`🔗 RPC: ${this.config.rpcUrl}`);

    // Verify connection
    try {
      const network = await this.provider.getNetwork();
      console.log(`✅ Connected to network: ${network.name} (chainId: ${network.chainId})`);
    } catch (error) {
      console.error("❌ Failed to connect to network:", error.message);
      throw error;
    }

    // Load contract ABIs
    await this.loadContracts();

    console.log("✅ Monitor initialized successfully");
  }

  async loadContracts() {
    console.log("📄 Loading contract ABIs...");

    // In production, load from deployment artifacts
    // For now, we'll define minimal ABIs for monitoring
    const minimalABI = [
      "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
      "event Paused(address account)",
      "event Unpaused(address account)",
      "function owner() view returns (address)",
      "function paused() view returns (bool)",
    ];

    this.contracts = {};
    for (const [name, address] of Object.entries(this.config.contracts)) {
      if (address && address !== "0x0000000000000000000000000000000000000000") {
        this.contracts[name] = new ethers.Contract(address, minimalABI, this.provider);
        console.log(`  ✅ Loaded ${name} at ${address}`);
      } else {
        console.log(`  ⏭️  Skipped ${name} (no address configured)`);
      }
    }
  }

  async startMonitoring() {
    console.log("\\n🚀 Starting continuous monitoring...");
    console.log(`⏱️  Poll interval: ${this.config.pollInterval}ms\\n`);

    // Monitor latest blocks
    this.provider.on("block", async (blockNumber) => {
      await this.onNewBlock(blockNumber);
    });

    // Monitor specific events
    for (const [name, contract] of Object.entries(this.contracts)) {
      for (const eventName of this.config.criticalEvents) {
        try {
          contract.on(eventName, (...args) => {
            this.onCriticalEvent(name, eventName, args);
          });
        } catch (error) {
          // Event might not exist on this contract
        }
      }
    }

    // Periodic health checks
    setInterval(() => this.performHealthCheck(), 60000); // Every minute
  }

  async onNewBlock(blockNumber) {
    this.metrics.lastCheck = new Date();

    // Check deployer balance
    const deployerAddress = process.env.DEPLOYER_ADDRESS;
    if (deployerAddress) {
      const balance = await this.provider.getBalance(deployerAddress);
      if (balance.lt(this.config.thresholds.lowBalance)) {
        await this.sendAlert("⚠️  Low Deployer Balance", {
          severity: "warning",
          message: `Deployer balance is low: ${ethers.formatEther(balance)} ETH`,
          block: blockNumber,
        });
      }
    }

    // Check gas prices
    const gasPrice = await this.provider.getGasPrice();
    if (gasPrice.gt(this.config.thresholds.highGasPrice)) {
      console.log(`⛽ High gas price detected: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
    }
  }

  async onCriticalEvent(contractName, eventName, args) {
    const eventId = `${contractName}-${eventName}-${args[args.length - 1].transactionHash}`;

    // Deduplicate events
    if (this.eventCache.has(eventId)) {
      return;
    }
    this.eventCache.add(eventId);

    this.metrics.eventsProcessed++;

    console.log(`🔔 Critical Event Detected:`);
    console.log(`   Contract: ${contractName}`);
    console.log(`   Event: ${eventName}`);
    console.log(`   Args:`, args.slice(0, -1));

    await this.sendAlert(`🚨 Critical Event: ${eventName}`, {
      severity: "high",
      contract: contractName,
      event: eventName,
      args: args.slice(0, -1).map(arg => arg.toString()),
      txHash: args[args.length - 1].transactionHash,
    });
  }

  async performHealthCheck() {
    console.log("\\n💊 Performing health check...");

    for (const [name, contract] of Object.entries(this.contracts)) {
      try {
        // Check if contract is paused
        const paused = await contract.paused().catch(() => null);
        if (paused === true) {
          await this.sendAlert(`⚠️  Contract Paused`, {
            severity: "warning",
            message: `${name} contract is paused`,
          });
        }

        // Check ownership
        const owner = await contract.owner().catch(() => null);
        if (owner) {
          console.log(`  ${name} owner: ${owner}`);
        }
      } catch (error) {
        console.log(`  ⚠️  ${name}: Health check failed (${error.message})`);
      }
    }

    console.log("  ✅ Health check complete");
  }

  async sendAlert(title, data) {
    this.metrics.alertsSent++;

    const alert = {
      title,
      timestamp: new Date().toISOString(),
      network: this.config.network,
      ...data,
    };

    console.log(`\\n📢 ALERT: ${title}`);
    console.log(JSON.stringify(alert, null, 2));

    // Send to Slack
    if (this.config.slack.enabled) {
      await this.sendSlackAlert(alert);
    }

    // Send to Discord
    if (this.config.discord.enabled) {
      await this.sendDiscordAlert(alert);
    }

    // Send email (implement your email service)
    if (this.config.email.enabled) {
      console.log(`📧 Would send email to: ${this.config.email.address}`);
    }
  }

  async sendSlackAlert(alert) {
    try {
      const color = alert.severity === "high" ? "danger" : "warning";
      await axios.post(this.config.slack.webhookUrl, {
        attachments: [{
          color,
          title: alert.title,
          fields: Object.entries(alert)
            .filter(([key]) => key !== "title")
            .map(([key, value]) => ({
              title: key,
              value: typeof value === "object" ? JSON.stringify(value) : String(value),
              short: true,
            })),
          footer: "LinkDAO Monitor",
          ts: Math.floor(Date.now() / 1000),
        }],
      });
      console.log("  ✅ Slack alert sent");
    } catch (error) {
      console.error("  ❌ Slack alert failed:", error.message);
      this.metrics.errors++;
    }
  }

  async sendDiscordAlert(alert) {
    try {
      const color = alert.severity === "high" ? 15158332 : 16776960; // Red or Yellow
      await axios.post(this.config.discord.webhookUrl, {
        embeds: [{
          title: alert.title,
          color,
          fields: Object.entries(alert)
            .filter(([key]) => key !== "title")
            .map(([key, value]) => ({
              name: key,
              value: typeof value === "object" ? JSON.stringify(value) : String(value),
              inline: true,
            })),
          footer: { text: "LinkDAO Monitor" },
          timestamp: new Date().toISOString(),
        }],
      });
      console.log("  ✅ Discord alert sent");
    } catch (error) {
      console.error("  ❌ Discord alert failed:", error.message);
      this.metrics.errors++;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      cacheSize: this.eventCache.size,
    };
  }

  printStatus() {
    console.log("\\n" + "=".repeat(60));
    console.log("MONITOR STATUS");
    console.log("=".repeat(60));
    const metrics = this.getMetrics();
    console.log(`Events Processed: ${metrics.eventsProcessed}`);
    console.log(`Alerts Sent: ${metrics.alertsSent}`);
    console.log(`Errors: ${metrics.errors}`);
    console.log(`Last Check: ${metrics.lastCheck}`);
    console.log(`Uptime: ${Math.floor(metrics.uptime)}s`);
    console.log(`Cache Size: ${metrics.cacheSize} events`);
    console.log("=".repeat(60) + "\\n");
  }
}

// Main execution
async function main() {
  console.log("\\n" + "=".repeat(60));
  console.log("LinkDAO Smart Contract Monitor");
  console.log("=".repeat(60) + "\\n");

  const monitor = new ContractMonitor(MONITORING_CONFIG);

  try {
    await monitor.initialize();
    await monitor.startMonitoring();

    // Print status every 5 minutes
    setInterval(() => monitor.printStatus(), 300000);

    // Keep process alive
    process.on("SIGINT", () => {
      console.log("\\n\\n👋 Shutting down monitor...");
      monitor.printStatus();
      process.exit(0);
    });

    console.log("✅ Monitor is running. Press Ctrl+C to stop.\\n");
  } catch (error) {
    console.error("\\n❌ Monitor failed to start:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ContractMonitor, MONITORING_CONFIG };
