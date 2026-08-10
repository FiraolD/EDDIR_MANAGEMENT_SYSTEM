import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  id: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'org_admin' | 'finance' | 'edir_leader' | 'member';
  organization_id?: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, env.jwt.secret) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, env.jwt.refreshSecret) as TokenPayload;
  } catch (error) {
    return null;
  }
};