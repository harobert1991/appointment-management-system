import cron from 'node-cron';
import { GoogleCalendarService } from './googleCalendarService';
import { logger } from '../utils';

export class TokenRefreshScheduler {
  private static instance: TokenRefreshScheduler;
  private scheduler: cron.ScheduledTask | null = null;

  private constructor(private readonly calendarService: GoogleCalendarService) {}

  public static initialize(calendarService: GoogleCalendarService): TokenRefreshScheduler {
    if (!TokenRefreshScheduler.instance) {
      TokenRefreshScheduler.instance = new TokenRefreshScheduler(calendarService);
    }
    return TokenRefreshScheduler.instance;
  }

  public startScheduler(): void {
    if (this.scheduler) {
      logger.warn('Token refresh scheduler is already running');
      return;
    }

    // Schedule to run every hour
    this.scheduler = cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Running scheduled token refresh');
        await this.calendarService.getValidAccessToken();
        logger.info('Token refresh completed successfully');
      } catch (error) {
        logger.error('Scheduled token refresh failed:', error);
      }
    });

    logger.info('Token refresh scheduler started');
  }

  public stopScheduler(): void {
    if (this.scheduler) {
      this.scheduler.stop();
      this.scheduler = null;
      logger.info('Token refresh scheduler stopped');
    }
  }
} 