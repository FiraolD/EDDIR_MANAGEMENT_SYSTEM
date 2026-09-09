"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.env.jwt.secret, {
        expiresIn: env_1.env.jwt.expiresIn,
        issuer: env_1.env.jwt.issuer,
        audience: env_1.env.jwt.audience,
        algorithm: 'HS256',
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.env.jwt.refreshSecret, {
        expiresIn: env_1.env.jwt.refreshExpiresIn,
        issuer: env_1.env.jwt.issuer,
        audience: env_1.env.jwt.audience,
        algorithm: 'HS256',
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, env_1.env.jwt.secret, { algorithms: ['HS256'], issuer: env_1.env.jwt.issuer, audience: env_1.env.jwt.audience });
    }
    catch (error) {
        return null;
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, env_1.env.jwt.refreshSecret, { algorithms: ['HS256'], issuer: env_1.env.jwt.issuer, audience: env_1.env.jwt.audience });
    }
    catch (error) {
        return null;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
