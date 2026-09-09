import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimit';
import { authenticate } from '../../middleware/auth';
import {
  login,
  register,
  refreshToken,
  logout,
  getMe,
  resetPassword,
  forgotPassword,
} from './auth.controller';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
router.post('/refresh', authLimiter, refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

export default router;