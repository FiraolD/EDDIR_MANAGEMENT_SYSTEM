// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { env } from './config/env';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import memberRoutes from './modules/members/members.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
// Add these imports
import contributionRoutes from './modules/contributions/contributions.routes';
import claimRoutes from './modules/claims/claims.routes';
import transactionRoutes from './modules/transactions/transactions.routes';
// Add these imports at the top
import organizationRoutes from './modules/organizations/organizations.routes';
import userRoutes from './modules/users/users.routes';





const app = express();

// CORS configuration - FIXED
const allowedOrigins = [
  'http://localhost:3025',
  'http://127.0.0.1:3025',
  'http://10.1.12.21:3025',
  'http://172.25.160.1:3025',
  'http://172.20.176.1:3025',
  
  env.frontendUrl,
  'http://localhost:5020', // Vite default
  'http://127.0.0.1:5020',
  'http://10.1.12.21:5020',
  'http://172.25.160.1:5020',
  'http://172.20.176.1:5020',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn('CORS blocked origin:', origin);
      callback(null, true); // Allow in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Rate limiting
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

export default app;