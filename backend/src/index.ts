import express, { Request, Response } from 'express';
import { loadRoutes } from './utils/routeLoader';
import { connectDB } from './config';
import { logger } from './utils';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleCalendarService } from './modules/googleCalendarToken/googleCalendarToken.services';
import { TokenRefreshScheduler } from './modules/googleCalendarToken/utils/tokenRefreshScheduler';

// Add debug logs for .env loading
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3000;

const googleAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI!,
};

const googleCalendarService = GoogleCalendarService.getInstance({
  clientId: googleAuthConfig.clientId,
  clientSecret: googleAuthConfig.clientSecret,
  redirectUri: googleAuthConfig.redirectUri
});

// Initialize and start the token refresh scheduler only in non-test environment
const tokenRefreshScheduler = TokenRefreshScheduler.initialize(googleCalendarService);
if (process.env.NODE_ENV !== 'test') {
  tokenRefreshScheduler.startScheduler();
}

// Initialize express and middleware
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Appointment Management System API');
});

// Initialize the server
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Load routes once at startup
    const { router } = await loadRoutes();
    app.use('/api', router); // Changed to /api prefix for better organization

    // Start the server only after routes are loaded
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Handle graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down server...');
      tokenRefreshScheduler.stopScheduler();
      server.close(() => {
        logger.info('Server shut down complete');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();