"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5020'),
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5434'),
        name: process.env.DB_NAME || 'EMS',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'Fira@0412',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-me',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me',
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d'),
        refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3025',
    apiUrl: process.env.API_URL || 'http://localhost:5020',
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    },
};
