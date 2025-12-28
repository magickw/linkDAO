# Security System Environment Variables

## Required Environment Variables

### ENCRYPTION_KEY
**Purpose**: Used to encrypt sensitive data like TOTP secrets and backup codes

**Format**: 32-character string (256-bit key for AES-256-CBC encryption)

**Example**:
```bash
ENCRYPTION_KEY=your-32-character-secret-key-here-12345
```

**Generate a secure key**:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex').substring(0, 32))"

# Using OpenSSL
openssl rand -base64 32 | cut -c1-32
```

⚠️ **CRITICAL**: 
- Never commit this key to version control
- Use different keys for development and production
- Store production key in secure environment variable management (e.g., Render secrets, AWS Secrets Manager)
- Changing this key will invalidate all existing 2FA setups

## Add to .env file

```bash
# Security System Configuration
ENCRYPTION_KEY=your-generated-32-char-key-here
```

## Render Deployment

1. Go to your Render dashboard
2. Navigate to your service
3. Go to "Environment" tab
4. Add new environment variable:
   - Key: `ENCRYPTION_KEY`
   - Value: Your generated 32-character key
5. Save and redeploy

## Verification

After setting the environment variable, verify it's loaded:

```typescript
// In your backend code
console.log('Encryption key configured:', !!process.env.ENCRYPTION_KEY);
```

The security service will use this key automatically for encrypting/decrypting sensitive data.
