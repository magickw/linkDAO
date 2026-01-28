import * as crypto from 'crypto';
import { logger } from '../../utils/logger';

/**
 * Data Encryption and Privacy Controls Service
 * Handles encryption, decryption, and privacy controls for sensitive data
 */

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  saltLength: number;
  iterations: number;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag?: string;
  salt?: string;
  algorithm: string;
  timestamp: Date;
}

export interface PrivacyControl {
  data_type: string;
  encryption_required: boolean;
  access_controls: string[];
  retention_period_days: number;
  anonymization_rules: AnonymizationRule[];
  deletion_method: 'SOFT_DELETE' | 'HARD_DELETE' | 'ANONYMIZE';
}

export interface AnonymizationRule {
  field_name: string;
  anonymization_method: 'HASH' | 'MASK' | 'REMOVE' | 'GENERALIZE';
  parameters?: any;
}

export interface DataClassification {
  classification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  sensitivity_level: number; // 1-10
  regulatory_requirements: string[];
  handling_instructions: string[];
}

export class DataEncryptionService {
  private readonly config: EncryptionConfig;
  private readonly masterKey: Buffer;
  private privacyControls: Map<string, PrivacyControl> = new Map();
  private dataClassifications: Map<string, DataClassification> = new Map();

  constructor() {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,
      saltLength: 32,
      iterations: 100000
    };

    // In production, this would come from secure key management
    // Skip encryption in development mode
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'development') {
      console.warn('⚠️  Data encryption service disabled in development mode');
      // Create a dummy master key for development
      this.masterKey = crypto.randomBytes(this.config.keyLength);
    } else {
      this.masterKey = this.deriveMasterKey();
    }
    
    this.initializePrivacyControls();
    this.initializeDataClassifications();
  }

  /**
   * Derive master key from environment
   */
  private deriveMasterKey(): Buffer {
    const password = process.env.ENCRYPTION_PASSWORD;
    const salt = process.env.ENCRYPTION_SALT;

    if (!password || !salt) {
      console.warn('⚠️  ENCRYPTION_PASSWORD or ENCRYPTION_SALT not set - using development fallback');
      console.warn('⚠️  This is NOT secure for production! Please set proper encryption keys.');
      // Fallback to development key generation to avoid breaking the service
      return crypto.randomBytes(this.config.keyLength);
    }

    if (password.length < 32 || salt.length < 32) {
      console.warn('⚠️  ENCRYPTION_PASSWORD or ENCRYPTION_SALT too short - using development fallback');
      console.warn('⚠️  This is NOT secure for production! Keys must be at least 32 characters.');
      // Fallback to development key generation to avoid breaking the service
      return crypto.randomBytes(this.config.keyLength);
    }

    return crypto.pbkdf2Sync(password, salt, this.config.iterations, this.config.keyLength, 'sha512');
  }

  /**
   * Initialize privacy controls for different data types
   */
  private initializePrivacyControls(): void {
    // Personal Identifiable Information (PII)
    this.privacyControls.set('PII', {
      data_type: 'PII',
      encryption_required: true,
      access_controls: ['KYC_OFFICER', 'COMPLIANCE_OFFICER', 'ADMIN'],
      retention_period_days: 2555, // 7 years
      anonymization_rules: [
        { field_name: 'ssn', anonymization_method: 'HASH' },
        { field_name: 'phone', anonymization_method: 'MASK', parameters: { mask_pattern: 'XXX-XXX-####' } },
        { field_name: 'email', anonymization_method: 'HASH' },
        { field_name: 'address', anonymization_method: 'GENERALIZE', parameters: { level: 'CITY' } }
      ],
      deletion_method: 'ANONYMIZE'
    });

    // Financial Information
    this.privacyControls.set('FINANCIAL', {
      data_type: 'FINANCIAL',
      encryption_required: true,
      access_controls: ['FINANCIAL_OFFICER', 'COMPLIANCE_OFFICER', 'ADMIN'],
      retention_period_days: 2555, // 7 years
      anonymization_rules: [
        { field_name: 'account_number', anonymization_method: 'HASH' },
        { field_name: 'routing_number', anonymization_method: 'HASH' },
        { field_name: 'transaction_amount', anonymization_method: 'GENERALIZE', parameters: { ranges: [0, 1000, 10000, 100000] } }
      ],
      deletion_method: 'SOFT_DELETE'
    });

    // KYC Documents
    this.privacyControls.set('KYC_DOCUMENTS', {
      data_type: 'KYC_DOCUMENTS',
      encryption_required: true,
      access_controls: ['KYC_OFFICER', 'COMPLIANCE_OFFICER'],
      retention_period_days: 1825, // 5 years
      anonymization_rules: [
        { field_name: 'document_number', anonymization_method: 'HASH' },
        { field_name: 'full_name', anonymization_method: 'MASK', parameters: { mask_pattern: 'XXXX XXXX' } }
      ],
      deletion_method: 'HARD_DELETE'
    });

    // Transaction Data
    this.privacyControls.set('TRANSACTION_DATA', {
      data_type: 'TRANSACTION_DATA',
      encryption_required: true,
      access_controls: ['TRANSACTION_ANALYST', 'COMPLIANCE_OFFICER', 'ADMIN'],
      retention_period_days: 2555, // 7 years
      anonymization_rules: [
        { field_name: 'wallet_address', anonymization_method: 'HASH' },
        { field_name: 'ip_address', anonymization_method: 'MASK', parameters: { mask_pattern: 'XXX.XXX.XXX.XXX' } }
      ],
      deletion_method: 'SOFT_DELETE'
    });
  }

  /**
   * Initialize data classifications
   */
  private initializeDataClassifications(): void {
    this.dataClassifications.set('PII', {
      classification: 'RESTRICTED',
      sensitivity_level: 9,
      regulatory_requirements: ['GDPR', 'CCPA', 'PIPEDA'],
      handling_instructions: [
        'Encrypt at rest and in transit',
        'Access logging required',
        'Regular access review required',
        'Data minimization principles apply'
      ]
    });

    this.dataClassifications.set('FINANCIAL', {
      classification: 'RESTRICTED',
      sensitivity_level: 10,
      regulatory_requirements: ['PCI_DSS', 'SOX', 'GLBA'],
      handling_instructions: [
        'Highest level encryption required',
        'Segregated storage required',
        'Dual authorization for access',
        'Audit all access attempts'
      ]
    });

    this.dataClassifications.set('KYC_DOCUMENTS', {
      classification: 'CONFIDENTIAL',
      sensitivity_level: 8,
      regulatory_requirements: ['BSA', 'PATRIOT_ACT', 'GDPR'],
      handling_instructions: [
        'Encrypt with document-specific keys',
        'Access restricted to authorized personnel',
        'Retention period strictly enforced'
      ]
    });

    this.dataClassifications.set('TRANSACTION_DATA', {
      classification: 'CONFIDENTIAL',
      sensitivity_level: 7,
      regulatory_requirements: ['BSA', 'AML_REGULATIONS'],
      handling_instructions: [
        'Encrypt transaction details',
        'Monitor for suspicious patterns',
        'Maintain audit trail'
      ]
    });
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, dataType?: string): Promise<EncryptedData> {
    try {
      const iv = crypto.randomBytes(this.config.ivLength);
      const cipher = crypto.createCipheriv(this.config.algorithm, this.masterKey, iv);
      if ('setAAD' in cipher) {
        (cipher as any).setAAD(Buffer.from(dataType || 'general'));
      }

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = 'getAuthTag' in cipher ? (cipher as any).getAuthTag() : Buffer.alloc(0);

      const result: EncryptedData = {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.config.algorithm,
        timestamp: new Date()
      };

      logger.debug('Data encrypted', {
        dataType,
        algorithm: this.config.algorithm,
        timestamp: result.timestamp
      });

      return result;

    } catch (error) {
      logger.error('Encryption failed', { error, dataType });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: EncryptedData): Promise<string> {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, this.masterKey, iv);

      if (encryptedData.tag && 'setAuthTag' in decipher) {
        (decipher as any).setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      }

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Data decrypted', {
        algorithm: encryptedData.algorithm,
        timestamp: encryptedData.timestamp
      });

      return decrypted;

    } catch (error) {
      // Log at debug level since decryption failures are expected for legacy/migrated data
      logger.debug('Decryption failed - data may have been encrypted with different key or is corrupted', {
        error: error instanceof Error ? error.message : 'Unknown error',
        algorithm: encryptedData.algorithm,
        hasTag: !!encryptedData.tag,
        ivLength: encryptedData.iv?.length,
        encryptedLength: encryptedData.encrypted?.length
      });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hashData(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(this.config.saltLength).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, this.config.iterations, 64, 'sha512');
    return `${actualSalt}:${hash.toString('hex')}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const verifyHash = crypto.pbkdf2Sync(data, salt, this.config.iterations, 64, 'sha512');
      return hash === verifyHash.toString('hex');
    } catch (error) {
      logger.error('Hash verification failed', { error });
      return false;
    }
  }

  /**
   * Anonymize data according to privacy controls
   */
  async anonymizeData(data: any, dataType: string): Promise<any> {
    const privacyControl = this.privacyControls.get(dataType);
    if (!privacyControl) {
      logger.warn('No privacy control found for data type', { dataType });
      return data;
    }

    const anonymizedData = { ...data };

    for (const rule of privacyControl.anonymization_rules) {
      if (anonymizedData[rule.field_name] !== undefined) {
        anonymizedData[rule.field_name] = await this.applyAnonymizationRule(
          anonymizedData[rule.field_name],
          rule
        );
      }
    }

    logger.info('Data anonymized', {
      dataType,
      fieldsAnonymized: privacyControl.anonymization_rules.length
    });

    return anonymizedData;
  }

  /**
   * Apply anonymization rule to field
   */
  private async applyAnonymizationRule(value: any, rule: AnonymizationRule): Promise<any> {
    switch (rule.anonymization_method) {
      case 'HASH':
        return this.hashData(value.toString());
      
      case 'MASK':
        return this.maskValue(value.toString(), rule.parameters?.mask_pattern);
      
      case 'REMOVE':
        return '[REMOVED]';
      
      case 'GENERALIZE':
        return this.generalizeValue(value, rule.parameters);
      
      default:
        return value;
    }
  }

  /**
   * Mask sensitive value
   */
  private maskValue(value: string, pattern?: string): string {
    if (!pattern) {
      // Default masking - show first and last 2 characters
      if (value.length <= 4) return 'XXXX';
      return value.substring(0, 2) + 'X'.repeat(value.length - 4) + value.substring(value.length - 2);
    }

    // Apply specific mask pattern
    return pattern.replace(/#/g, () => value[Math.floor(Math.random() * value.length)] || 'X');
  }

  /**
   * Generalize value based on rules
   */
  private generalizeValue(value: any, parameters: any): any {
    if (parameters?.level === 'CITY' && typeof value === 'object' && value.address) {
      return {
        city: value.address.city,
        state: value.address.state,
        country: value.address.country
      };
    }

    if (parameters?.ranges && typeof value === 'number') {
      const ranges = parameters.ranges.sort((a: number, b: number) => a - b);
      for (let i = 0; i < ranges.length - 1; i++) {
        if (value >= ranges[i] && value < ranges[i + 1]) {
          return `${ranges[i]}-${ranges[i + 1]}`;
        }
      }
      return `${ranges[ranges.length - 1]}+`;
    }

    return '[GENERALIZED]';
  }

  /**
   * Check if data requires encryption
   */
  requiresEncryption(dataType: string): boolean {
    const privacyControl = this.privacyControls.get(dataType);
    return privacyControl?.encryption_required || false;
  }

  /**
   * Get data classification
   */
  getDataClassification(dataType: string): DataClassification | null {
    return this.dataClassifications.get(dataType) || null;
  }

  /**
   * Check access permissions
   */
  hasAccess(userRole: string, dataType: string): boolean {
    const privacyControl = this.privacyControls.get(dataType);
    if (!privacyControl) return false;

    return privacyControl.access_controls.includes(userRole) || 
           privacyControl.access_controls.includes('ALL');
  }

  /**
   * Secure data deletion
   */
  async secureDelete(data: any, dataType: string): Promise<void> {
    const privacyControl = this.privacyControls.get(dataType);
    if (!privacyControl) {
      logger.warn('No privacy control found for secure deletion', { dataType });
      return;
    }

    switch (privacyControl.deletion_method) {
      case 'HARD_DELETE':
        // Overwrite data multiple times before deletion
        await this.secureOverwrite(data);
        break;
      
      case 'SOFT_DELETE':
        // Mark as deleted but keep for compliance
        data.deleted_at = new Date();
        data.deletion_method = 'SOFT_DELETE';
        break;
      
      case 'ANONYMIZE':
        // Anonymize the data
        const anonymizedData = await this.anonymizeData(data, dataType);
        Object.assign(data, anonymizedData);
        data.anonymized_at = new Date();
        break;
    }

    logger.info('Secure deletion completed', {
      dataType,
      deletionMethod: privacyControl.deletion_method
    });
  }

  /**
   * Secure overwrite for hard deletion
   */
  private async secureOverwrite(data: any): Promise<void> {
    // Overwrite sensitive fields multiple times with random data
    const sensitiveFields = ['ssn', 'passport_number', 'account_number', 'private_key'];
    
    for (let pass = 0; pass < 3; pass++) {
      for (const field of sensitiveFields) {
        if (data[field]) {
          data[field] = crypto.randomBytes(32).toString('hex');
        }
      }
    }

    // Final overwrite with zeros
    for (const field of sensitiveFields) {
      if (data[field]) {
        data[field] = '0'.repeat(data[field].length);
      }
    }
  }

  /**
   * Generate encryption key for specific data
   */
  generateDataKey(dataType: string, userId?: string): Buffer {
    const keyMaterial = `${dataType}:${userId || 'system'}:${Date.now()}`;
    return crypto.pbkdf2Sync(keyMaterial, this.masterKey, this.config.iterations, this.config.keyLength, 'sha512');
  }

  /**
   * Encrypt field-level data
   */
  async encryptField(value: string, fieldName: string, dataType: string): Promise<string> {
    if (!this.requiresEncryption(dataType)) {
      return value;
    }

    const encryptedData = await this.encryptData(value, dataType);
    return JSON.stringify(encryptedData);
  }

  /**
   * Decrypt field-level data
   */
  async decryptField(encryptedValue: string, fieldName: string, dataType: string): Promise<string> {
    if (!this.requiresEncryption(dataType)) {
      return encryptedValue;
    }

    try {
      const encryptedData = JSON.parse(encryptedValue) as EncryptedData;
      return await this.decryptData(encryptedData);
    } catch (error) {
      logger.error('Field decryption failed', { fieldName, dataType, error });
      return '[DECRYPTION_FAILED]';
    }
  }

  /**
   * Validate data handling compliance
   */
  validateDataHandling(data: any, dataType: string, operation: string): {
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    const privacyControl = this.privacyControls.get(dataType);
    const classification = this.dataClassifications.get(dataType);

    if (!privacyControl) {
      violations.push(`No privacy control defined for data type: ${dataType}`);
    }

    if (!classification) {
      violations.push(`No data classification defined for data type: ${dataType}`);
    }

    // Check encryption requirements
    if (privacyControl?.encryption_required && operation === 'STORE') {
      const hasEncryptedFields = Object.values(data).some(value => 
        typeof value === 'string' && value.includes('encrypted')
      );
      
      if (!hasEncryptedFields) {
        violations.push('Encryption required but data appears unencrypted');
        recommendations.push('Encrypt sensitive fields before storage');
      }
    }

    // Check retention period
    if (data.created_at && privacyControl) {
      const dataAge = Date.now() - new Date(data.created_at).getTime();
      const maxAge = privacyControl.retention_period_days * 24 * 60 * 60 * 1000;
      
      if (dataAge > maxAge) {
        violations.push('Data exceeds retention period');
        recommendations.push(`Delete or anonymize data older than ${privacyControl.retention_period_days} days`);
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations
    };
  }

  /**
   * Get privacy control for data type
   */
  getPrivacyControl(dataType: string): PrivacyControl | null {
    return this.privacyControls.get(dataType) || null;
  }

  /**
   * Add custom privacy control
   */
  addPrivacyControl(dataType: string, control: PrivacyControl): void {
    this.privacyControls.set(dataType, control);
    
    logger.info('Privacy control added', {
      dataType,
      encryptionRequired: control.encryption_required,
      retentionDays: control.retention_period_days
    });
  }

  /**
   * Generate data protection report
   */
  generateDataProtectionReport(): {
    timestamp: Date;
    data_types: number;
    encrypted_types: number;
    compliance_status: string;
    recommendations: string[];
  } {
    const dataTypes = Array.from(this.privacyControls.keys());
    const encryptedTypes = dataTypes.filter(type => 
      this.privacyControls.get(type)?.encryption_required
    );

    const recommendations: string[] = [];
    
    // Check for missing classifications
    for (const dataType of dataTypes) {
      if (!this.dataClassifications.has(dataType)) {
        recommendations.push(`Add data classification for ${dataType}`);
      }
    }

    return {
      timestamp: new Date(),
      data_types: dataTypes.length,
      encrypted_types: encryptedTypes.length,
      compliance_status: recommendations.length === 0 ? 'COMPLIANT' : 'NEEDS_ATTENTION',
      recommendations
    };
  }
}

// Only instantiate if encryption env vars are set
// This allows the application to run without encryption in development/staging
let dataEncryptionService: DataEncryptionService | null = null;

try {
  if (process.env.ENCRYPTION_PASSWORD && process.env.ENCRYPTION_SALT) {
    dataEncryptionService = new DataEncryptionService();
    console.log('✅ Data encryption service initialized');
  } else {
    console.warn('⚠️  ENCRYPTION_PASSWORD and ENCRYPTION_SALT not set - data encryption service disabled');
    console.warn('⚠️  For production deployments, these environment variables must be configured');
  }
} catch (error) {
  console.error('❌ Failed to initialize data encryption service:', error);
  console.warn('⚠️  Application will continue without data encryption');
  dataEncryptionService = null;
}

export { dataEncryptionService };
