const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10003;

// Essential middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Marketplace listings endpoint
app.get('/api/marketplace/listings', async (req, res) => {
  try {
    // Return mock data for now
    const mockListings = [
      {
        id: '1',
        title: 'Test Product 1',
        description: 'This is a test product',
        price: '100',
        currency: 'USD',
        sellerId: 'seller1',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: '2', 
        title: 'Test Product 2',
        description: 'Another test product',
        price: '200',
        currency: 'USD',
        sellerId: 'seller2',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      data: mockListings,
      pagination: {
        page: 1,
        limit: 20,
        total: mockListings.length,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listings'
    });
  }
});

// Documentation endpoints
const docs = {
  introduction: {
    title: "Introduction to LinkDAO",
    content: "# Introduction to LinkDAO\n\nLinkDAO is a decentralized autonomous organization that enables community governance and token-based economics.",
    lastUpdated: new Date().toISOString()
  },
  "quick-start": {
    title: "Quick Start Guide",
    content: "# Quick Start Guide\n\nGet started with LinkDAO in just a few simple steps:\n\n1. Connect your wallet\n2. Get LDAO tokens\n3. Start participating in governance",
    lastUpdated: new Date().toISOString()
  },
  installation: {
    title: "Installation Guide",
    content: "# Installation Guide\n\nLearn how to install and configure the LinkDAO platform for development or production use.",
    lastUpdated: new Date().toISOString()
  },
  "wallet-setup": {
    title: "Wallet Setup",
    content: "# Wallet Setup Guide\n\nConfigure your Web3 wallet to interact with the LinkDAO platform securely.",
    lastUpdated: new Date().toISOString()
  },
  "technical-whitepaper": {
    title: "Technical Whitepaper",
    content: "# Technical Whitepaper\n\nDeep dive into the technical architecture, smart contracts, and economic models of LinkDAO.",
    lastUpdated: new Date().toISOString()
  },
  "api-reference": {
    title: "API Reference",
    content: "# API Reference\n\nComplete documentation of all available API endpoints, parameters, and response formats.",
    lastUpdated: new Date().toISOString()
  },
  "smart-contracts": {
    title: "Smart Contracts",
    content: "# Smart Contracts\n\nTechnical details about LinkDAO's smart contract architecture and implementation.",
    lastUpdated: new Date().toISOString()
  },
  security: {
    title: "Security",
    content: "# Security\n\nSecurity best practices, audit reports, and vulnerability disclosure policy.",
    lastUpdated: new Date().toISOString()
  },
  architecture: {
    title: "Architecture",
    content: "# Architecture\n\nSystem architecture overview, component interactions, and design patterns.",
    lastUpdated: new Date().toISOString()
  },
  contributing: {
    title: "Contributing",
    content: "# Contributing\n\nHow to contribute to the LinkDAO project, including guidelines and processes.",
    lastUpdated: new Date().toISOString()
  },
  deployment: {
    title: "Deployment Guide",
    content: "# Deployment Guide\n\nStep-by-step instructions for deploying LinkDAO in various environments.",
    lastUpdated: new Date().toISOString()
  },
  sdk: {
    title: "SDK Documentation",
    content: "# SDK Documentation\n\nDeveloper SDK documentation with examples and integration guides.",
    lastUpdated: new Date().toISOString()
  },
  integrations: {
    title: "Integrations",
    content: "# Integrations\n\nThird-party integrations and how to connect external services with LinkDAO.",
    lastUpdated: new Date().toISOString()
  }
};

// Generic docs endpoint handler
app.get('/api/docs/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const doc = docs[slug];
    
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: `Documentation not found for: ${slug}`
      });
    }

    res.json({
      success: true,
      data: doc
    });
  } catch (error) {
    console.error('Error fetching documentation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documentation'
    });
  }
});

// Docs list endpoint
app.get('/api/docs', (req, res) => {
  try {
    const docList = Object.keys(docs).map(slug => ({
      slug,
      title: docs[slug].title,
      lastUpdated: docs[slug].lastUpdated
    }));

    res.json({
      success: true,
      data: docList
    });
  } catch (error) {
    console.error('Error fetching documentation list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documentation list'
    });
  }
});

// Static assets endpoint for grid.svg
app.get('/grid.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="8" height="8" stroke="#ccc" stroke-width="1"/>
      <rect x="11" y="1" width="8" height="8" stroke="#ccc" stroke-width="1"/>
      <rect x="1" y="11" width="8" height="8" stroke="#ccc" stroke-width="1"/>
      <rect x="11" y="11" width="8" height="8" stroke="#ccc" stroke-width="1"/>
    </svg>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Documentation backend server running on port ${PORT}`);
  console.log(`📚 Documentation API available at http://localhost:${PORT}/api/docs`);
  console.log(`📊 Marketplace API available at http://localhost:${PORT}/api/marketplace/listings`);
});