import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthService } from '../services/authService';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedUser } from '../types/authentication';

const authService = new AuthService();

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export { AuthenticatedUser };

export const authMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return ApiResponse.unauthorized(res, 'Access token required');
  }

  try {
    const user = await authService.verifyToken(token);
    if (!user) {
      return ApiResponse.unauthorized(res, 'Invalid token');
    }

    const areq = req as AuthenticatedRequest;
    areq.user = user;
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isExpired = errorMessage.includes('expired') || errorMessage.includes('jwt expired');
    const isInvalid = errorMessage.includes('invalid') || errorMessage.includes('malformed');

    if (isExpired) {
      return ApiResponse.unauthorized(res, 'Token has expired');
    }
    if (isInvalid) {
      return ApiResponse.unauthorized(res, 'Token is malformed or invalid');
    }
    return ApiResponse.unauthorized(res, 'Token validation failed');
  }
};