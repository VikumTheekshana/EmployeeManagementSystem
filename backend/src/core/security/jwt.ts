import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UserRole } from '../..//modules/auth/user.model';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  employeeProfileId?: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
