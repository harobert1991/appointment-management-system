import express, { Request, Response } from 'express';
import routes from './routes';
import { connectDB } from './config';
import { logger } from './utils';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleCalendarService } from './services/googleCalendarService';
import { GoogleCalendarAuth } from './utils/googleAuth';
import { TokenRefreshScheduler } from './services/tokenRefreshScheduler';

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

const googleAuth = GoogleCalendarAuth.getInstance(googleAuthConfig);
const googleCalendarService = GoogleCalendarService.getInstance(googleAuth);

// Initialize and start the token refresh scheduler
const tokenRefreshScheduler = TokenRefreshScheduler.initialize(googleCalendarService);
tokenRefreshScheduler.startScheduler();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Appointment Management System API');
});

// Mount all routes
app.use('/', routes);

// Initialize the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the server
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

startServer();