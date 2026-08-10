// backend/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// General API limiter - less strict
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Increased from 100 to 200 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// Auth limiter - strict (keep as is)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  skipSuccessfulRequests: true,
});

// Members list limiter - allow more requests
export const membersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { error: 'Too many requests' },
});