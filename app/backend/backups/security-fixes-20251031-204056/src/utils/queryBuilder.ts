/**
 * Safe Query Builder
 * Prevents SQL injection by using parameterized queries
 */

export class QueryBuilder {
  private params: any[] = [];
  private paramCount = 0;

  /**
   * Add parameter and return placeholder
   */
  addParam(value: any): string {
    this.params.push(value);
    this.paramCount++;
    return `$${this.paramCount}`;
  }

  /**
   * Get all parameters
   */
  getParams(): any[] {
    return this.params;
  }

  /**
   * Reset builder
   */
  reset(): void {
    this.params = [];
    this.paramCount = 0;
  }

  /**
   * Build WHERE clause safely
   */
  buildWhere(conditions: Record<string, any>): string {
    const clauses: string[] = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined && value !== null) {
        clauses.push(`${key} = ${this.addParam(value)}`);
      }
    }
    
    return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  }

  /**
   * Build IN clause safely
   */
  buildIn(column: string, values: any[]): string {
    if (!values || values.length === 0) {
      return '1=0'; // Always false
    }
    
    const placeholders = values.map(v => this.addParam(v));
    return `${column} IN (${placeholders.join(', ')})`;
  }

  /**
   * Build LIKE clause safely
   */
  buildLike(column: string, pattern: string, position: 'start' | 'end' | 'both' = 'both'): string {
    let safePattern = pattern.replace(/[%_\\]/g, '\\$&');
    
    switch (position) {
      case 'start':
        safePattern = `${safePattern}%`;
        break;
      case 'end':
        safePattern = `%${safePattern}`;
        break;
      case 'both':
        safePattern = `%${safePattern}%`;
        break;
    }
    
    return `${column} LIKE ${this.addParam(safePattern)}`;
  }

  /**
   * Build ORDER BY clause safely
   */
  buildOrderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): string {
    // Whitelist column names to prevent injection
    const safeColumn = column.replace(/[^a-zA-Z0-9_]/g, '');
    const safeDirection = direction === 'DESC' ? 'DESC' : 'ASC';
    return `ORDER BY ${safeColumn} ${safeDirection}`;
  }

  /**
   * Build LIMIT clause safely
   */
  buildLimit(limit: number, offset?: number): string {
    const parts = [`LIMIT ${this.addParam(Math.max(0, Math.floor(limit)))}`];
    
    if (offset !== undefined) {
      parts.push(`OFFSET ${this.addParam(Math.max(0, Math.floor(offset)))}`);
    }
    
    return parts.join(' ');
  }
}

/**
 * Create a new query builder instance
 */
export function createQueryBuilder(): QueryBuilder {
  return new QueryBuilder();
}
