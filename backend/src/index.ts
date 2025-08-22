import { App, AppConfig } from './app';

// Load configuration from environment variables
const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
    password: process.env.REDIS_PASSWORD
  }
};

// Create and start the application
const app = new App(config);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
app.start().catch((error) => {
  console.error('💥 Failed to start server:', error);
  process.exit(1);
});
