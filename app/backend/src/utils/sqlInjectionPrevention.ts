/**
 * SQL Injection Prevention Utilities
 * Comprehensive protection against SQL injection attacks using parameterized queries
 */

import { sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Request, Response, NextFunction } from 'express';

export interface QueryParams {
  [key: string]: any;
}

export interface SafeQueryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  affectedRows?: number;
}

export class SQLInjectionPrevention {
  // Dangerous SQL patterns to detect
  private static readonly SQL_INJECTION_PATTERNS = [
    // Basic SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /('|(\\')|(;)|(\\)|(\/\*)|(--)|(\*\/))/gi,
    /(\b(OR|AND)\b.*=.*)/gi,
    
    // Advanced patterns
    /(\b(WAITFOR|DELAY)\b)/gi,
    /(\b(CAST|CONVERT|CHAR|ASCII)\b.*\()/gi,
    /(\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b)/gi,
    /(\b(XP_|SP_)\w+)/gi,
    
    // Union-based injection
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(\bUNION\b.*\bALL\b.*\bSELECT\b)/gi,
    
    // Boolean-based blind injection
    /(\b(TRUE|FALSE)\b.*=.*\b(TRUE|FALSE)\b)/gi,
    /(\d+\s*=\s*\d+)/gi,
    
    // Time-based blind injection
    /(\bSLEEP\b\s*\(\s*\d+\s*\))/gi,
    /(\bBENCHMARK\b\s*\(\s*\d+)/gi,
    
    // Error-based injection
    /(\bEXTRACTVALUE\b\s*\()/gi,
    /(\bUPDATEXML\b\s*\()/gi,
    
    // Stacked queries
    /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/gi
  ];

  // Characters that should be escaped or blocked
  private static readonly DANGEROUS_CHARACTERS = [
    "'", '"', ';', '--', '/*', '*/', '\\', '\x00', '\n', '\r', '\x1a'
  ];

  /**
   * Middleware to detect and prevent SQL injection attempts
   */
  static preventSQLInjection() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Check all input sources
        const inputSources = [
          { source: 'body', data: req.body },
          { source: 'query', data: req.query },
          { source: 'params', data: req.params },
          { source: 'headers', data: req.headers }
        ];

        for (const { source, data } of inputSources) {
          const injectionAttempt = this.detectSQLInjection(data, source);
          if (injectionAttempt.detected) {
            // Log the attempt
            safeLogger.warn(`SQL injection attempt detected in ${source}:`, {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              url: req.url,
              method: req.method,
              patterns: injectionAttempt.patterns,
              timestamp: new Date().toISOString()
            });

            res.status(400).json({
              success: false,
              error: 'Potentially malicious input detected',
              code: 'SQL_INJECTION_ATTEMPT',
              details: 'Request blocked for security reasons',
              timestamp: new Date().toISOString()
            });
            return;
          }
        }

        next();
      } catch (error) {
        safeLogger.error('Error in SQL injection prevention middleware:', error);
        res.status(500).json({
          success: false,
          error: 'Security validation failed',
          code: 'SECURITY_ERROR'
        });
      }
    };
  }

  /**
   * Detect SQL injection patterns in data
   */
  private static detectSQLInjection(data: any, source: string): {
    detected: boolean;
    patterns: string[];
  } {
    const detectedPatterns: string[] = [];

    const checkValue = (value: any, path: string = ''): void => {
      if (typeof value === 'string') {
        // Check against SQL injection patterns
        for (const pattern of this.SQL_INJECTION_PATTERNS) {
          if (pattern.test(value)) {
            detectedPatterns.push(`${source}${path}: ${pattern.source}`);
          }
        }

        // Check for dangerous character combinations
        for (const char of this.DANGEROUS_CHARACTERS) {
          if (value.includes(char)) {
            // Additional context check to reduce false positives
            if (this.isLikelyInjection(value, char)) {
              detectedPatterns.push(`${source}${path}: Dangerous character '${char}'`);
            }
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively check object properties
        for (const [key, val] of Object.entries(value)) {
          checkValue(val, `${path}.${key}`);
        }
      }
    };

    checkValue(data);

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns
    };
  }

  /**
   * Check if a dangerous character is likely part of an injection attempt
   */
  private static isLikelyInjection(value: string, char: string): boolean {
    switch (char) {
      case "'":
        // Check for SQL string manipulation
        return /'\s*(OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE)/gi.test(value) ||
               /'.*'.*=/gi.test(value);
      
      case ';':
        // Check for statement termination followed by SQL keywords
        return /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)/gi.test(value);
      
      case '--':
        // SQL comment at end of line
        return /--\s*$/gm.test(value);
      
      case '/*':
        // SQL block comment
        return /\/\*.*\*\//gs.test(value);
      
      default:
        return true; // Conservative approach for other dangerous characters
    }
  }

  /**
   * Sanitize input for safe database operations
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Escape dangerous characters
      return input
        .replace(/'/g, "''")  // Escape single quotes
        .replace(/\\/g, '\\\\') // Escape backslashes
        .replace(/\x00/g, '') // Remove null bytes
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\x1a/g, ''); // Remove substitute character
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = Array.isArray(input) ? [] : {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  /**
   * Create parameterized query builder
   */
  static createSafeQuery<T = any>(
    db: PostgresJsDatabase<any>,
    queryTemplate: string,
    params: QueryParams = {}
  ): {
    execute: () => Promise<SafeQueryResult<T>>;
    query: string;
    parameters: any[];
  } {
    try {
      // Validate query template
      if (this.containsUnsafePatterns(queryTemplate)) {
        throw new Error('Query template contains potentially unsafe patterns');
      }

      // Convert named parameters to positional parameters
      const { query, parameters } = this.processParameters(queryTemplate, params);

      return {
        execute: async (): Promise<SafeQueryResult<T>> => {
          try {
            const result = await db.execute(sql.raw(query));
            return {
              success: true,
              data: result as T,
              affectedRows: Array.isArray(result) ? result.length : 1
            };
          } catch (error) {
            safeLogger.error('Database query error:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Database error'
            };
          }
        },
        query,
        parameters
      };
    } catch (error) {
      return {
        execute: async () => ({
          success: false,
          error: error instanceof Error ? error.message : 'Query preparation error'
        }),
        query: '',
        parameters: []
      };
    }
  }

  /**
   * Check if query template contains unsafe patterns
   */
  private static containsUnsafePatterns(query: string): boolean {
    // Allow only basic SELECT, INSERT, UPDATE, DELETE operations
    const allowedPatterns = [
      /^\s*SELECT\b/gi,
      /^\s*INSERT\s+INTO\b/gi,
      /^\s*UPDATE\b/gi,
      /^\s*DELETE\s+FROM\b/gi,
      /^\s*WITH\b/gi // Allow CTEs
    ];

    const hasAllowedPattern = allowedPatterns.some(pattern => pattern.test(query));
    if (!hasAllowedPattern) {
      return true;
    }

    // Check for dangerous patterns even in allowed queries
    const dangerousInAllowed = [
      /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/gi, // Stacked queries
      /EXEC\s*\(/gi, // Stored procedure execution
      /XP_/gi, // Extended stored procedures
      /SP_/gi, // System stored procedures
      /OPENROWSET/gi, // File access
      /OPENDATASOURCE/gi // External data access
    ];

    return dangerousInAllowed.some(pattern => pattern.test(query));
  }

  /**
   * Process named parameters and convert to positional
   */
  private static processParameters(query: string, params: QueryParams): {
    query: string;
    parameters: any[];
  } {
    const parameters: any[] = [];
    let paramIndex = 1;
    
    // Replace named parameters with positional parameters
    const processedQuery = query.replace(/:(\w+)/g, (match, paramName) => {
      if (params.hasOwnProperty(paramName)) {
        parameters.push(this.sanitizeInput(params[paramName]));
        return `$${paramIndex++}`;
      }
      throw new Error(`Parameter '${paramName}' not provided`);
    });

    return {
      query: processedQuery,
      parameters
    };
  }

  /**
   * Validate table and column names to prevent injection
   */
  static validateIdentifier(identifier: string): boolean {
    // Allow only alphanumeric characters, underscores, and dots (for schema.table)
    const identifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
    return identifierPattern.test(identifier) && identifier.length <= 63; // PostgreSQL limit
  }

  /**
   * Safely quote identifiers (table names, column names)
   */
  static quoteIdentifier(identifier: string): string {
    if (!this.validateIdentifier(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    
    // Split on dots for schema.table format
    const parts = identifier.split('.');
    const quotedParts = parts.map(part => `"${part.replace(/"/g, '""')}"`);
    return quotedParts.join('.');
  }

  /**
   * Create safe LIKE pattern
   */
  static createLikePattern(pattern: string, escapeChar: string = '\\'): string {
    // Escape special LIKE characters
    return pattern
      .replace(/\\/g, escapeChar + '\\')
      .replace(/%/g, escapeChar + '%')
      .replace(/_/g, escapeChar + '_');
  }

  /**
   * Validate and sanitize ORDER BY clause
   */
  static sanitizeOrderBy(orderBy: string, allowedColumns: string[]): string {
    const parts = orderBy.split(',').map(part => part.trim());
    const sanitizedParts: string[] = [];

    for (const part of parts) {
      const match = part.match(/^(\w+)(\s+(ASC|DESC))?$/i);
      if (!match) {
        throw new Error(`Invalid ORDER BY clause: ${part}`);
      }

      const [, column, , direction] = match;
      if (!allowedColumns.includes(column)) {
        throw new Error(`Column '${column}' not allowed in ORDER BY`);
      }

      sanitizedParts.push(`${this.quoteIdentifier(column)}${direction ? ` ${direction.toUpperCase()}` : ''}`);
    }

    return sanitizedParts.join(', ');
  }
}

export default SQLInjectionPrevention;
