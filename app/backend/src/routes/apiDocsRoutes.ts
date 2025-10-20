/**
 * API Documentation Routes
 * 
 * Serves interactive API documentation and provides endpoints
 * for accessing API specifications and examples.
 */

import { Router } from 'express';
import { successResponse } from '../utils/apiResponse';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

const router = Router();

/**
 * @route GET /api/docs
 * @desc Serve interactive API documentation
 * @access Public
 */
router.get('/', (req, res) => {
  try {
    const docsPath = path.join(__dirname, '../docs/api-documentation.md');
    
    if (!fs.existsSync(docsPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DOCS_NOT_FOUND',
          message: 'API documentation not found'
        }
      });
    }

    const markdownContent = fs.readFileSync(docsPath, 'utf8');
    const htmlContent = marked(markdownContent);

    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkDAO Backend API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 { color: #2c3e50; }
        h1 { border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #ecf0f1; padding-bottom: 5px; margin-top: 30px; }
        code {
            background: #f1f2f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        pre {
            background: #2f3640;
            color: #f1f2f6;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
        }
        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #3498db;
            color: white;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .endpoint {
            background: #e8f5e8;
            border-left: 4px solid #27ae60;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }
        .method-get { color: #27ae60; font-weight: bold; }
        .method-post { color: #e74c3c; font-weight: bold; }
        .method-put { color: #f39c12; font-weight: bold; }
        .method-delete { color: #e74c3c; font-weight: bold; }
        .nav {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 200px;
        }
        .nav h4 { margin-top: 0; }
        .nav ul { list-style: none; padding: 0; }
        .nav li { margin: 5px 0; }
        .nav a { text-decoration: none; color: #3498db; }
        .nav a:hover { text-decoration: underline; }
        @media (max-width: 768px) {
            .nav { display: none; }
            body { padding: 10px; }
            .container { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="nav">
        <h4>Quick Navigation</h4>
        <ul>
            <li><a href="#authentication">Authentication</a></li>
            <li><a href="#marketplace">Marketplace</a></li>
            <li><a href="#shopping-cart">Shopping Cart</a></li>
            <li><a href="#health-check--monitoring">Health Check</a></li>
            <li><a href="#error-codes-reference">Error Codes</a></li>
        </ul>
    </div>
    <div class="container">
        ${htmlContent}
    </div>
    <script>
        // Add syntax highlighting for HTTP methods
        document.querySelectorAll('code').forEach(code => {
            const text = code.textContent;
            if (text.startsWith('GET ')) {
                code.innerHTML = '<span class="method-get">GET</span>' + text.substring(3);
            } else if (text.startsWith('POST ')) {
                code.innerHTML = '<span class="method-post">POST</span>' + text.substring(4);
            } else if (text.startsWith('PUT ')) {
                code.innerHTML = '<span class="method-put">PUT</span>' + text.substring(3);
            } else if (text.startsWith('DELETE ')) {
                code.innerHTML = '<span class="method-delete">DELETE</span>' + text.substring(6);
            }
        });
    </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(fullHtml);
  } catch (error) {
    console.error('Error serving API documentation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOCS_ERROR',
        message: 'Failed to load API documentation'
      }
    });
  }
});

/**
 * @route GET /api/docs/openapi
 * @desc Get OpenAPI specification
 * @access Public
 */
router.get('/openapi', (req, res) => {
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'LinkDAO Backend API',
      version: '1.0.0',
      description: 'Comprehensive API for LinkDAO Marketplace Backend',
      contact: {
        name: 'API Support',
        email: 'api-support@linkdao.io'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.linkdao.io',
        description: 'Production server'
      }
    ],
    paths: {
      '/api/marketplace/listings': {
        get: {
          summary: 'Get product listings',
          description: 'Retrieve paginated product listings with optional filtering',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
              description: 'Page number'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
              description: 'Items per page'
            },
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by category'
            }
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          listings: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ProductListing' }
                          }
                        }
                      },
                      metadata: { $ref: '#/components/schemas/ResponseMetadata' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/wallet-connect': {
        post: {
          summary: 'Authenticate with wallet',
          description: 'Authenticate user using wallet signature',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['walletAddress', 'signature', 'message'],
                  properties: {
                    walletAddress: {
                      type: 'string',
                      pattern: '^0x[a-fA-F0-9]{40}$',
                      description: 'Ethereum wallet address'
                    },
                    signature: {
                      type: 'string',
                      minLength: 130,
                      maxLength: 132,
                      description: 'Wallet signature'
                    },
                    message: {
                      type: 'string',
                      minLength: 1,
                      description: 'Message that was signed'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Authentication successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' },
                          user: { $ref: '#/components/schemas/User' },
                          expiresIn: { type: 'integer' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        ProductListing: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            price: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                currency: { type: 'string' },
                usdEquivalent: { type: 'number' }
              }
            },
            images: {
              type: 'array',
              items: { type: 'string', format: 'uri' }
            },
            seller: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                reputation: { type: 'number' }
              }
            },
            category: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            walletAddress: { type: 'string' },
            displayName: { type: 'string' },
            profileImageUrl: { type: 'string', format: 'uri' },
            isVerified: { type: 'boolean' },
            reputation: { type: 'number' }
          }
        },
        ResponseMetadata: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
            version: { type: 'string' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' }
              }
            }
          }
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', enum: [false] },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' }
              }
            },
            metadata: { $ref: '#/components/schemas/ResponseMetadata' }
          }
        }
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  };

  successResponse(res, openApiSpec);
});

/**
 * @route GET /api/docs/postman
 * @desc Get Postman collection
 * @access Public
 */
router.get('/postman', (req, res) => {
  const postmanCollection = {
    info: {
      name: 'LinkDAO Backend API',
      description: 'Comprehensive API collection for LinkDAO Marketplace Backend',
      version: '1.0.0',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{jwt_token}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'base_url',
        value: 'http://localhost:3001',
        type: 'string'
      },
      {
        key: 'jwt_token',
        value: '',
        type: 'string'
      }
    ],
    item: [
      {
        name: 'Authentication',
        item: [
          {
            name: 'Wallet Connect',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json'
                }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  walletAddress: '0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4',
                  signature: '0x1234567890abcdef...',
                  message: 'Sign in to LinkDAO'
                }, null, 2)
              },
              url: {
                raw: '{{base_url}}/api/auth/wallet-connect',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'wallet-connect']
              }
            }
          },
          {
            name: 'Get Profile',
            request: {
              method: 'GET',
              header: [
                {
                  key: 'Authorization',
                  value: 'Bearer {{jwt_token}}'
                }
              ],
              url: {
                raw: '{{base_url}}/api/auth/profile',
                host: ['{{base_url}}'],
                path: ['api', 'auth', 'profile']
              }
            }
          }
        ]
      },
      {
        name: 'Marketplace',
        item: [
          {
            name: 'Get Listings',
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/marketplace/listings?page=1&limit=10',
                host: ['{{base_url}}'],
                path: ['api', 'marketplace', 'listings'],
                query: [
                  {
                    key: 'page',
                    value: '1'
                  },
                  {
                    key: 'limit',
                    value: '10'
                  }
                ]
              }
            }
          },
          {
            name: 'Get Listing by ID',
            request: {
              method: 'GET',
              url: {
                raw: '{{base_url}}/api/marketplace/listings/:id',
                host: ['{{base_url}}'],
                path: ['api', 'marketplace', 'listings', ':id'],
                variable: [
                  {
                    key: 'id',
                    value: 'listing_123'
                  }
                ]
              }
            }
          }
        ]
      },
      {
        name: 'Shopping Cart',
        item: [
          {
            name: 'Get Cart',
            request: {
              method: 'GET',
              header: [
                {
                  key: 'Authorization',
                  value: 'Bearer {{jwt_token}}'
                }
              ],
              url: {
                raw: '{{base_url}}/api/cart',
                host: ['{{base_url}}'],
                path: ['api', 'cart']
              }
            }
          },
          {
            name: 'Add to Cart',
            request: {
              method: 'POST',
              header: [
                {
                  key: 'Authorization',
                  value: 'Bearer {{jwt_token}}'
                },
                {
                  key: 'Content-Type',
                  value: 'application/json'
                }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  productId: 'listing_123',
                  quantity: 2
                }, null, 2)
              },
              url: {
                raw: '{{base_url}}/api/cart/items',
                host: ['{{base_url}}'],
                path: ['api', 'cart', 'items']
              }
            }
          }
        ]
      }
    ]
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="LinkDAO-API.postman_collection.json"');
  res.json(postmanCollection);
});

/**
 * @route GET /api/docs/examples
 * @desc Get API usage examples
 * @access Public
 */
router.get('/examples', (req, res) => {
  const examples = {
    authentication: {
      description: 'How to authenticate with wallet signature',
      steps: [
        {
          step: 1,
          description: 'Connect wallet and get signature',
          code: `
// Frontend JavaScript example
const message = 'Sign in to LinkDAO';
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, walletAddress]
});`
        },
        {
          step: 2,
          description: 'Send authentication request',
          code: `
const response = await fetch('/api/auth/wallet-connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '0x742d35Cc6634C0532925a3b8D0C9e3e4C4c4c4c4',
    signature: signature,
    message: message
  })
});

const data = await response.json();
const token = data.data.token;`
        },
        {
          step: 3,
          description: 'Use token for authenticated requests',
          code: `
const profileResponse = await fetch('/api/auth/profile', {
  headers: { 'Authorization': \`Bearer \${token}\` }
});`
        }
      ]
    },
    marketplace: {
      description: 'How to browse and search marketplace',
      examples: [
        {
          title: 'Get all listings',
          code: `
const response = await fetch('/api/marketplace/listings?page=1&limit=20');
const data = await response.json();
console.log(data.data.listings);`
        },
        {
          title: 'Filter by category',
          code: `
const response = await fetch('/api/marketplace/listings?category=Electronics&page=1&limit=10');`
        },
        {
          title: 'Search products',
          code: `
const response = await fetch('/api/marketplace/search?q=wireless%20headphones&type=products');`
        }
      ]
    },
    cart: {
      description: 'How to manage shopping cart',
      examples: [
        {
          title: 'Add item to cart',
          code: `
const response = await fetch('/api/cart/items', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 'listing_123',
    quantity: 2
  })
});`
        },
        {
          title: 'Get cart contents',
          code: `
const response = await fetch('/api/cart', {
  headers: { 'Authorization': 'Bearer ' + token }
});
const cart = await response.json();`
        }
      ]
    }
  };

  successResponse(res, examples);
});

export default router;