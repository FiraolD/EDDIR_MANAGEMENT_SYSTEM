"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
const isPlaceholderSecret = (secret) => !secret || secret.length < 32 || /change[-_ ]?this|your[-_ ]|default[-_ ]|development[-_ ]only/i.test(secret);
if (nodeEnv === 'production' && (isPlaceholderSecret(jwtSecret) || isPlaceholderSecret(jwtRefreshSecret))) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be configured with at least 32 characters in production');
}
exports.env = {
    nodeEnv,
    port: parseInt(process.env.PORT || '5020'),
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5434'),
        name: process.env.DB_NAME || 'EMS',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    },
    jwt: {
        secret: jwtSecret || 'development-only-access-secret-change-me',
        refreshSecret: jwtRefreshSecret || 'development-only-refresh-secret-change-me',
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d'),
        refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
        issuer: process.env.JWT_ISSUER || 'eddir-management-api',
        audience: process.env.JWT_AUDIENCE || 'eddir-management-client',
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3025',
    apiUrl: process.env.API_URL || 'http://localhost:5020',
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
};
