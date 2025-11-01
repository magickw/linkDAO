import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  sub?: string; // user id or wallet address
  iat?: number;
  exp?: number;
}

export function requireJwt(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing authorization' });

  const token = auth.split(' ')[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'JWT not configured on server' });

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    // attach to request for downstream handlers
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default requireJwt;
