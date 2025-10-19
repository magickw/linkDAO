import { Request } from 'express';
import { PaginationInfo } from './apiResponse';

// Pagination configuration interface
export interface PaginationConfig {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  minLimit?: number;
}

// Pagination query parameters interface
export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  offset?: string | number;
  cursor?: string;
}

// Cursor-based pagination info
export interface CursorPaginationInfo {
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
  total?: number;
}

// Database query result with pagination
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Cursor-based pagination result
export interface CursorPaginatedResult<T> {
  data: T[];
  pagination: CursorPaginationInfo;
}

// Default pagination configuration
const DEFAULT_CONFIG: Required<PaginationConfig> = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
  minLimit: 1
};

/**
 * Pagination utility class for handling offset-based and cursor-based pagination
 */
export class PaginationUtils {
  private config: Required<PaginationConfig>;

  constructor(config: PaginationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract and validate pagination parameters from request
   */
  public extractPaginationFromRequest(req: Request): {
    page: number;
    limit: number;
    offset: number;
  } {
    const query = req.query as PaginationQuery;
    
    // Parse page parameter
    let page = parseInt(String(query.page || this.config.defaultPage), 10);
    if (isNaN(page) || page < 1) {
      page = this.config.defaultPage;
    }

    // Parse limit parameter
    let limit = parseInt(String(query.limit || this.config.defaultLimit), 10);
    if (isNaN(limit) || limit < this.config.minLimit) {
      limit = this.config.defaultLimit;
    }
    if (limit > this.config.maxLimit) {
      limit = this.config.maxLimit;
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Create pagination info from query results
   */
  public createPaginationInfo(
    page: number,
    limit: number,
    total: number
  ): PaginationInfo {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Create paginated result with data and pagination info
   */
  public createPaginatedResult<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResult<T> {
    return {
      data,
      pagination: this.createPaginationInfo(page, limit, total)
    };
  }

  /**
   * Extract cursor pagination parameters from request
   */
  public extractCursorPaginationFromRequest(req: Request): {
    limit: number;
    cursor?: string;
  } {
    const query = req.query as PaginationQuery;
    
    // Parse limit parameter
    let limit = parseInt(String(query.limit || this.config.defaultLimit), 10);
    if (isNaN(limit) || limit < this.config.minLimit) {
      limit = this.config.defaultLimit;
    }
    if (limit > this.config.maxLimit) {
      limit = this.config.maxLimit;
    }

    const cursor = query.cursor ? String(query.cursor) : undefined;

    return { limit, cursor };
  }

  /**
   * Create cursor-based pagination info
   */
  public createCursorPaginationInfo<T>(
    data: T[],
    limit: number,
    getCursor: (item: T) => string,
    total?: number
  ): CursorPaginationInfo {
    const hasNext = data.length === limit;
    const hasPrev = !!total && total > data.length;
    
    let nextCursor: string | undefined;
    let prevCursor: string | undefined;

    if (data.length > 0) {
      if (hasNext) {
        nextCursor = getCursor(data[data.length - 1]);
      }
      if (hasPrev) {
        prevCursor = getCursor(data[0]);
      }
    }

    return {
      hasNext,
      hasPrev,
      nextCursor,
      prevCursor,
      total
    };
  }

  /**
   * Create cursor-based paginated result
   */
  public createCursorPaginatedResult<T>(
    data: T[],
    limit: number,
    getCursor: (item: T) => string,
    total?: number
  ): CursorPaginatedResult<T> {
    return {
      data,
      pagination: this.createCursorPaginationInfo(data, limit, getCursor, total)
    };
  }

  /**
   * Generate SQL LIMIT and OFFSET clauses
   */
  public generateSqlLimitOffset(page: number, limit: number): {
    limit: number;
    offset: number;
    sql: string;
  } {
    const offset = (page - 1) * limit;
    return {
      limit,
      offset,
      sql: `LIMIT ${limit} OFFSET ${offset}`
    };
  }

  /**
   * Generate pagination metadata for API responses
   */
  public generatePaginationMetadata(
    page: number,
    limit: number,
    total: number,
    baseUrl: string,
    queryParams: Record<string, any> = {}
  ): PaginationInfo & {
    links: {
      first: string;
      last: string;
      next?: string;
      prev?: string;
    };
  } {
    const paginationInfo = this.createPaginationInfo(page, limit, total);
    const totalPages = paginationInfo.totalPages;

    // Helper function to build URL with query parameters
    const buildUrl = (pageNum: number): string => {
      const params = new URLSearchParams({
        ...queryParams,
        page: pageNum.toString(),
        limit: limit.toString()
      });
      return `${baseUrl}?${params.toString()}`;
    };

    const links = {
      first: buildUrl(1),
      last: buildUrl(totalPages),
      ...(paginationInfo.hasNext && { next: buildUrl(page + 1) }),
      ...(paginationInfo.hasPrev && { prev: buildUrl(page - 1) })
    };

    return {
      ...paginationInfo,
      links
    };
  }

  /**
   * Validate pagination parameters and throw errors if invalid
   */
  public validatePaginationParams(page: number, limit: number): void {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`Invalid page parameter: ${page}. Must be a positive integer.`);
    }

    if (!Number.isInteger(limit) || limit < this.config.minLimit || limit > this.config.maxLimit) {
      throw new Error(
        `Invalid limit parameter: ${limit}. Must be between ${this.config.minLimit} and ${this.config.maxLimit}.`
      );
    }
  }

  /**
   * Calculate pagination statistics
   */
  public calculatePaginationStats(page: number, limit: number, total: number): {
    startIndex: number;
    endIndex: number;
    totalPages: number;
    isFirstPage: boolean;
    isLastPage: boolean;
    itemsOnCurrentPage: number;
  } {
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit + 1;
    const endIndex = Math.min(page * limit, total);
    const itemsOnCurrentPage = Math.max(0, endIndex - startIndex + 1);

    return {
      startIndex,
      endIndex,
      totalPages,
      isFirstPage: page === 1,
      isLastPage: page === totalPages,
      itemsOnCurrentPage
    };
  }
}

// Default pagination utility instance
export const paginationUtils = new PaginationUtils();

// Marketplace-specific pagination configurations
export const marketplacePaginationConfig = new PaginationUtils({
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 50,
  minLimit: 1
});

// Search results pagination (higher limits allowed)
export const searchPaginationConfig = new PaginationUtils({
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
  minLimit: 1
});

// Admin dashboard pagination (higher limits for admin operations)
export const adminPaginationConfig = new PaginationUtils({
  defaultPage: 1,
  defaultLimit: 50,
  maxLimit: 200,
  minLimit: 1
});

/**
 * Express middleware to add pagination utilities to request object
 */
export const paginationMiddleware = (config?: PaginationConfig) => {
  const utils = new PaginationUtils(config);
  
  return (req: any, res: any, next: any) => {
    req.pagination = utils.extractPaginationFromRequest(req);
    req.paginationUtils = utils;
    next();
  };
};

/**
 * Helper function to create standardized pagination response
 */
export const createPaginatedResponse = <T>(
  data: T[],
  req: Request,
  total: number,
  config?: PaginationConfig
): PaginatedResult<T> => {
  const utils = new PaginationUtils(config);
  const { page, limit } = utils.extractPaginationFromRequest(req);
  
  return utils.createPaginatedResult(data, page, limit, total);
};

/**
 * Helper function for cursor-based pagination response
 */
export const createCursorPaginatedResponse = <T>(
  data: T[],
  req: Request,
  getCursor: (item: T) => string,
  total?: number,
  config?: PaginationConfig
): CursorPaginatedResult<T> => {
  const utils = new PaginationUtils(config);
  const { limit } = utils.extractCursorPaginationFromRequest(req);
  
  return utils.createCursorPaginatedResult(data, limit, getCursor, total);
};

/**
 * Database query helper for paginated results
 */
export interface PaginatedQuery {
  limit: number;
  offset: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export const buildPaginatedQuery = (
  req: Request,
  config?: PaginationConfig
): PaginatedQuery => {
  const utils = new PaginationUtils(config);
  const { page, limit, offset } = utils.extractPaginationFromRequest(req);
  
  // Extract sorting parameters if available
  const query = req.query as any;
  const orderBy = query.sortBy || query.orderBy;
  const orderDirection = (query.sortOrder || query.orderDirection || 'DESC').toUpperCase() as 'ASC' | 'DESC';
  
  return {
    limit,
    offset,
    ...(orderBy && { orderBy }),
    orderDirection
  };
};

/**
 * Pagination constants for different use cases
 */
export const PAGINATION_LIMITS = {
  LISTINGS: { default: 20, max: 50 },
  SEARCH: { default: 20, max: 100 },
  ORDERS: { default: 10, max: 50 },
  MESSAGES: { default: 50, max: 100 },
  NOTIFICATIONS: { default: 20, max: 100 },
  ADMIN: { default: 50, max: 200 }
} as const;

/**
 * Create pagination configuration for specific use cases
 */
export const createPaginationConfig = (
  useCase: keyof typeof PAGINATION_LIMITS
): PaginationConfig => {
  const limits = PAGINATION_LIMITS[useCase];
  return {
    defaultLimit: limits.default,
    maxLimit: limits.max,
    minLimit: 1,
    defaultPage: 1
  };
};