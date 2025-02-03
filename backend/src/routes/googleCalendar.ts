import { Router } from 'express';
import { GoogleCalendarController } from '../controllers/googleCalendarController';
import { generateRoutes } from '../utils';
import RouteConfig from '../utils/generateRoutes';
import { z } from 'zod';


const controller = new GoogleCalendarController();

export const routes: RouteConfig[] = [
    {
      path: '/auth-url',
      method: 'get',
      handler: controller.getAuthUrl,
      description: 'Get Google OAuth URL'
    },
    {
      path: '/google_calendar_callback',
      method: 'get',
      handler: controller.handleCallback,
      description: 'Handle Google Calendar OAuth callback',
      inputValidation: {
        type: 'query',
        schema: z.object({
          code: z.string(),
          error: z.string().optional(),
          state: z.string().optional()
        })
      }
    },
    {
      path: '/refresh-token',
      method: 'post',
      handler: controller.refreshToken,
      description: 'Refresh access token'
    },
    {
      path: '/push-notification',
      method: 'post',
      handler: controller.handlePushNotification,
      description: 'Handle Google Calendar push notifications'
    },
    {
      path: '/test-refresh',
      method: 'post',
      handler: controller.testRefreshToken,
      description: 'Test token refresh functionality'
    }
  ]

const router = generateRoutes(routes);

export default router; 