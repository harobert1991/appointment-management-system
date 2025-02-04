import { Request, Response } from 'express';
import { GoogleCalendarService } from './googleCalendarToken.services';
import { logger } from '../../utils';

export class GoogleCalendarController {
  /**
   * Generate the Google OAuth2 Authorization URL
   */
  public async getAuthUrl(req: Request, res: Response) {
    try {
      const service = GoogleCalendarService.getInstance();
      const url = service.getAuthUrl();
      res.json({ url });
    } catch (error) {
      logger.error('Error generating auth URL:', error);
      res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
  }

  /**
   * Handle OAuth callback and exchange the authorization code for tokens
   */
  public async handleCallback(req: Request, res: Response) {
    try {
      const service = GoogleCalendarService.getInstance();
      const { code } = req.query;
      const tokens = await service.exchangeCodeForTokens(code as string);
      res.json({ tokens });
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.status(500).json({ error: 'Failed to exchange authorization code' });
    }
  }

  /**
   * Refresh the global access token
   */
  public async refreshToken(req: Request, res: Response) {
    try {
      const service = GoogleCalendarService.getInstance();
      const tokens = await service.getValidAccessToken(); // Automatically refreshes if needed
      res.json({ tokens });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }

  /**
   * Handle push notifications from Google Calendar
   */
  public async handlePushNotification(req: Request, res: Response) {
    try {
      const channelId = req.headers['x-goog-channel-id'];
      const resourceId = req.headers['x-goog-resource-id'];
      const state = req.headers['x-goog-resource-state'];
      const changed = req.headers['x-goog-changed'];

      logger.info('Received calendar push notification:', {
        channelId,
        resourceId,
        state,
        changed,
      });

      if (!channelId || !resourceId) {
        return res.status(400).json({ error: 'Invalid push notification' });
      }

      switch (state) {
        case 'sync':
          logger.info('Calendar sync initiated');
          break;
        case 'exists':
          logger.info('Calendar changes detected:', changed);
          break;
        case 'not_exists':
          logger.info('Calendar resource deleted');
          break;
        default:
          logger.warn('Unknown calendar state:', state);
      }

      return res.status(200).json({ message: 'Notification processed successfully' });
    } catch (error) {
      logger.error('Push notification error:', error);
      return res.status(500).json({
        error: 'Failed to process push notification',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Test the token refresh scheduler
   */
  public async testRefreshToken(req: Request, res: Response) {
    try {
      const service = GoogleCalendarService.getInstance();
      
      // First get current token
      const currentToken = await service.getValidAccessToken();
      
      // Force a token refresh
      const refreshedToken = await service.refreshAccessToken(currentToken);
      
      res.json({ 
        message: 'Token refresh test completed',
        previousToken: currentToken,
        newToken: refreshedToken
      });
    } catch (error) {
      logger.error('Token refresh test error:', error);
      res.status(500).json({ 
        error: 'Failed to test token refresh',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}