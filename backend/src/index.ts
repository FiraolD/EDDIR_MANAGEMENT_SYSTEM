import app from './app';
import { env } from './config/env';
import { query } from './config/database';

const startServer = async () => {
  try {
    // Test database connection
    await query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    app.listen(env.port, () => {
      console.log(`🚀 Server running on port ${env.port}`);
      console.log(`📝 Environment: ${env.nodeEnv}`);
      console.log(`🔗 API URL: ${env.apiUrl}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();