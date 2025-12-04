import { Router } from 'express';
import { validateRequest } from '../middleware/validationMiddleware';

const router = Router();

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
  },
  "governance-guide": {
    title: "Governance Guide",
    content: "# Governance Guide\n\nLearn how LinkDAO governance works and how to participate in decision-making.",
    lastUpdated: new Date().toISOString()
  },
  "ldao-token-guide": {
    title: "LDAO Token Guide",
    content: "# LDAO Token Guide\n\nEverything you need to know about the LDAO token - acquisition, staking, governance, and platform benefits.",
    lastUpdated: new Date().toISOString()
  },
  communities: {
    title: "Communities Guide",
    content: "# Communities Guide\n\nHow to create and manage communities within the LinkDAO ecosystem.",
    lastUpdated: new Date().toISOString()
  },
  "reputation-system": {
    title: "Reputation System",
    content: "# Reputation System\n\nUnderstanding LinkDAO's reputation mechanics and how to build your reputation.",
    lastUpdated: new Date().toISOString()
  },
  "token-economics": {
    title: "Token Economics",
    content: "# Token Economics\n\nDetailed information about LDAO token economics, supply, distribution, and utility.",
    lastUpdated: new Date().toISOString()
  },
  "governance-mechanisms": {
    title: "Governance Mechanisms",
    content: "# Governance Mechanisms\n\nDeep dive into LinkDAO's governance mechanisms and voting systems.",
    lastUpdated: new Date().toISOString()
  }
};

// Generic docs endpoint handler
router.get('/:slug', validateRequest({
  params: {
    slug: { type: 'string', required: true }
  }
}), (req, res) => {
  try {
    const { slug } = req.params;
    const doc = docs[slug as keyof typeof docs];
    
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
router.get('/', (req, res) => {
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

export { router as docsRoutes };