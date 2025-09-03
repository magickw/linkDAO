# Marketplace Registration API

This document describes the API endpoints for registering users as buyers or sellers in the LinkDAO marketplace.

## Overview

The LinkDAO marketplace follows a dual-layer identity model:
- **Social Layer**: Wallet-only identity for browsing and social interactions
- **Marketplace Layer**: Optional upgrade with compliance data for buying/selling

## Authentication

All endpoints require authentication using a JWT token obtained through wallet signature verification.

## Endpoints

### Register as a Seller

Registers a user as a seller in the marketplace.

```
POST /api/marketplace/registration/register/seller
```

**Request Body:**
```json
{
  "walletAddress": "0x...",
  "legalName": "John Doe",
  "email": "john@example.com",
  "country": "US",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345",
    "country": "US"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Seller registration successful",
  "sellerProfile": {
    "userId": "uuid",
    "role": "seller",
    "email": "john@example.com",
    "legalName": "John Doe",
    "country": "US",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zipCode": "12345",
      "country": "US"
    },
    "kycVerified": false,
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

### Register as a Buyer

Registers a user as a buyer in the marketplace.

```
POST /api/marketplace/registration/register/buyer
```

**Request Body:**
```json
{
  "walletAddress": "0x...",
  "email": "john@example.com",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345",
    "country": "US"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Buyer registration successful",
  "buyerProfile": {
    "userId": "uuid",
    "role": "buyer",
    "email": "john@example.com",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zipCode": "12345",
      "country": "US"
    },
    "kycVerified": false,
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

### Get Marketplace Profile

Retrieves a user's marketplace profile.

```
GET /api/marketplace/registration/profile/:walletAddress
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "userId": "uuid",
    "role": "seller",
    "email": "john@example.com",
    "legalName": "John Doe",
    "country": "US",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zipCode": "12345",
      "country": "US"
    },
    "kycVerified": false,
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

### Update Marketplace Profile

Updates a user's marketplace profile.

```
PUT /api/marketplace/registration/profile/:walletAddress
```

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "shippingAddress": {
    "street": "456 New St",
    "city": "Newtown",
    "state": "NY",
    "zipCode": "67890",
    "country": "US"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Marketplace profile updated successfully",
  "profile": {
    "userId": "uuid",
    "role": "seller",
    "email": "newemail@example.com",
    "legalName": "John Doe",
    "country": "US",
    "shippingAddress": {
      "street": "456 New St",
      "city": "Newtown",
      "state": "NY",
      "zipCode": "67890",
      "country": "US"
    },
    "kycVerified": false,
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z"
  }
}
```

### Check Seller Status

Checks if a user is registered as a seller.

```
GET /api/marketplace/registration/is-seller/:walletAddress
```

**Response:**
```json
{
  "success": true,
  "isSeller": true
}
```

### Check Buyer Status

Checks if a user is registered as a buyer.

```
GET /api/marketplace/registration/is-buyer/:walletAddress
```

**Response:**
```json
{
  "success": true,
  "isBuyer": true
}
```

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Validation failed: [specific error message]"
}
```

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```