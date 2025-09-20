# ENS Integration API Documentation

## Overview

The ENS (Ethereum Name Service) integration provides optional ENS handle support for seller profiles. ENS handles are completely optional - sellers can operate without them, and the system gracefully handles cases where ENS services are unavailable.

## Core Services

### ENSService

The main service for ENS operations with comprehensive error handling and fallback mechanisms.

```typescript
interface ENSService {
  validateENSHandle(ensName: string): Promise<boolean>;
  resolveENSToAddress(ensName: string): Promise<string | null>;
  reverseResolveAddress(address: string): Promise<string | null>;
  verifyENSOwnership(ensName: string, walletAddress: string): Promise<boolean>;
  isENSHandleAvailable(ensName: string): Promise<boolean>;
  suggestENSAlternatives(baseName: string): Promise<string[]>;
}
```

#### Methods

##### `validateENSHandle(ensName: string): Promise<boolean>`

Validates ENS handle format and availability.

**Parameters:**
- `ensName`: The ENS name to validate (e.g., "alice.eth")

**Returns:**
- `Promise<boolean>`: True if valid, false otherwise

**Error Handling:**
- Returns `false` for network errors
- Logs errors for monitoring
- Never throws exceptions

**Example:**
```typescript
const isValid = await ensService.validateENSHandle("alice.eth");
if (isValid) {
  // Proceed with ENS handle
} else {
  // Continue without ENS or show error
}
```

##### `resolveENSToAddress(ensName: string): Promise<string | null>`

Resolves ENS name to Ethereum address.

**Parameters:**
- `ensName`: The ENS name to resolve

**Returns:**
- `Promise<string | null>`: Ethereum address or null if resolution fails

**Error Handling:**
- Returns `null` for any resolution failure
- Implements retry logic for temporary failures
- Graceful degradation when ENS services are down

##### `verifyENSOwnership(ensName: string, walletAddress: string): Promise<boolean>`

Verifies that the wallet address owns the ENS name.

**Parameters:**
- `ensName`: The ENS name to verify
- `walletAddress`: The wallet address claiming ownership

**Returns:**
- `Promise<boolean>`: True if ownership verified, false otherwise

**Security Features:**
- Cryptographic proof verification
- Prevents spoofing attacks
- Handles expired ENS names

## API Endpoints

### GET /api/ens/validate/:ensName

Validates an ENS handle.

**Parameters:**
- `ensName`: ENS name in URL path

**Response:**
```json
{
  "valid": true,
  "available": true,
  "suggestions": ["alice1.eth", "alice2.eth"]
}
```

**Error Response:**
```json
{
  "valid": false,
  "error": "INVALID_FORMAT",
  "message": "ENS name must end with .eth"
}
```

### POST /api/ens/verify

Verifies ENS ownership.

**Request Body:**
```json
{
  "ensName": "alice.eth",
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c",
  "signature": "0x..."
}
```

**Response:**
```json
{
  "verified": true,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

## Database Schema

### Sellers Table Extensions

```sql
-- Optional ENS support
ALTER TABLE sellers ADD COLUMN ens_handle VARCHAR(255) NULL;
ALTER TABLE sellers ADD COLUMN ens_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE sellers ADD COLUMN ens_last_verified TIMESTAMP NULL;
```

### ENS Verifications Table

```sql
CREATE TABLE ens_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(66) NOT NULL,
  ens_handle VARCHAR(255) NOT NULL,
  verified_at TIMESTAMP DEFAULT NOW(),
  verification_tx_hash VARCHAR(66),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_FORMAT` | ENS name format invalid | Show format requirements |
| `NOT_OWNED` | User doesn't own ENS name | Verify ownership |
| `RESOLUTION_FAILED` | Cannot resolve ENS name | Try again later |
| `NETWORK_ERROR` | ENS network unavailable | Continue without ENS |
| `EXPIRED` | ENS name has expired | Renew ENS name |

## Configuration

### Environment Variables

```bash
# ENS Configuration (Optional)
ENS_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
ENS_REGISTRY_ADDRESS=0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e
ENS_RESOLVER_ADDRESS=0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41

# Fallback settings
ENS_TIMEOUT_MS=5000
ENS_RETRY_ATTEMPTS=3
ENS_CACHE_TTL=300
```

## Usage Examples

### Frontend Integration

```typescript
// Optional ENS validation in profile form
const handleENSChange = async (ensName: string) => {
  if (!ensName) {
    // ENS is optional - clear validation
    setENSValidation({ valid: true, message: '' });
    return;
  }
  
  try {
    const validation = await ensService.validateENSHandle(ensName);
    setENSValidation(validation);
  } catch (error) {
    // Graceful fallback - allow profile without ENS
    setENSValidation({ 
      valid: true, 
      message: 'ENS validation unavailable - you can still save your profile' 
    });
  }
};
```

### Backend Integration

```typescript
// Profile update with optional ENS
export const updateSellerProfile = async (sellerId: string, profileData: any) => {
  const updates: any = { ...profileData };
  
  // Handle optional ENS
  if (profileData.ensHandle) {
    try {
      const isValid = await ensService.validateENSHandle(profileData.ensHandle);
      if (isValid) {
        const isOwned = await ensService.verifyENSOwnership(
          profileData.ensHandle, 
          profileData.walletAddress
        );
        updates.ens_verified = isOwned;
      }
    } catch (error) {
      // Log error but don't fail profile update
      logger.warn('ENS validation failed', { error, sellerId });
      updates.ens_verified = false;
    }
  } else {
    // Clear ENS fields if not provided
    updates.ens_handle = null;
    updates.ens_verified = false;
  }
  
  return await updateSeller(sellerId, updates);
};
```

## Best Practices

### 1. Optional by Design
- Never require ENS for core functionality
- Provide clear messaging about ENS being optional
- Graceful degradation when ENS services are unavailable

### 2. Error Handling
- Always provide fallback options
- Clear error messages with suggested actions
- Log errors for monitoring without exposing internals

### 3. Performance
- Cache ENS resolutions with appropriate TTL
- Implement timeout handling for network requests
- Use background validation where possible

### 4. Security
- Verify ownership through cryptographic proofs
- Handle expired ENS names appropriately
- Prevent ENS spoofing attacks

### 5. User Experience
- Show real-time validation feedback
- Provide ENS name suggestions for unavailable names
- Clear indication of verification status