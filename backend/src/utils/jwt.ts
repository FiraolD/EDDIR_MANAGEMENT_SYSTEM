import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  id: string;
  email: string;
  phone: string;
  role: string;
  organization_id?: string;
  token_version?: number;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    algorithm: 'HS256',
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    issuer: env.jwt.issuer,
    audience: env.jwt.audience,
    algorithm: 'HS256',
  });
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'], issuer: env.jwt.issuer, audience: env.jwt.audience }) as TokenPayload;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, env.jwt.refreshSecret, { algorithms: ['HS256'], issuer: env.jwt.issuer, audience: env.jwt.audience }) as TokenPayload;
  } catch (error) {
    return null;
  }
};