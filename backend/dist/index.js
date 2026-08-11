"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const startServer = async () => {
    try {
        // Test database connection
        await (0, database_1.query)('SELECT NOW()');
        console.log('✅ Database connected successfully');
        app_1.default.listen(env_1.env.port, () => {
            console.log(`🚀 Server running on port ${env_1.env.port}`);
            console.log(`📝 Environment: ${env_1.env.nodeEnv}`);
            console.log(`🔗 API URL: ${env_1.env.apiUrl}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
