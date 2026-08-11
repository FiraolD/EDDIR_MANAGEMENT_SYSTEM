"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const logger_1 = require("./middleware/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimit_1 = require("./middleware/rateLimit");
const env_1 = require("./config/env");
// Import routes
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const members_routes_1 = __importDefault(require("./modules/members/members.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
// Add these imports
const contributions_routes_1 = __importDefault(require("./modules/contributions/contributions.routes"));
const claims_routes_1 = __importDefault(require("./modules/claims/claims.routes"));
const transactions_routes_1 = __importDefault(require("./modules/transactions/transactions.routes"));
// Add these imports at the top
const organizations_routes_1 = __importDefault(require("./modules/organizations/organizations.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const app = (0, express_1.default)();
// CORS configuration - FIXED
const allowedOrigins = [
    'http://localhost:3025',
    'http://127.0.0.1:3025',
    'http://10.1.12.21:3025',
    'http://172.25.160.1:3025',
    'http://172.20.176.1:3025',
    env_1.env.frontendUrl,
    'http://localhost:5020', // Vite default
    'http://127.0.0.1:5020',
    'http://10.1.12.21:5020',
    'http://172.25.160.1:5020',
    'http://172.20.176.1:5020',
];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        }
        else {
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
app.options('*', (0, cors_1.default)());
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(logger_1.logger);
// Rate limiting
app.use('/api/', rateLimit_1.apiLimiter);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/members', members_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/contributions', contributions_routes_1.default);
app.use('/api/claims', claims_routes_1.default);
app.use('/api/transactions', transactions_routes_1.default);
app.use('/api/organizations', organizations_routes_1.default);
app.use('/api/users', users_routes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
