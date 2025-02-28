import { GoogleCalendarController } from './googleCalendarToken.controller';
import { z } from 'zod';
import { RouteConfig } from '../../utils/routeLoader';

const controller = new GoogleCalendarController();

export const routes: RouteConfig[] = [
  {
    method: 'get',
    path: '/google-calendar/auth-url',
    handler: controller.getAuthUrl,
    description: 'Get Google OAuth URL',
    input: {
      headers: {
        'Content-Type': 'application/json'
      }
    },
    errorResponses: [
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to generate auth URL'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/google-calendar/callback',
    handler: controller.handleCallback,
    description: 'Handle Google Calendar OAuth callback',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      query: {
        code: { type: 'string', required: true },
        error: { type: 'string', required: false },
        state: { type: 'string', required: false }
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request',
        body: {
          error: 'Invalid callback parameters'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to handle OAuth callback'
        }
      }
    ]
  },
  {
    method: 'post',
    path: '/google-calendar/refresh-token',
    handler: controller.refreshToken,
    description: 'Refresh access token',
    input: {
      headers: {
        'Content-Type': 'application/json'
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request',
        body: {
          error: 'No refresh token available'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to refresh token'
        }
      }
    ]
  },
  {
    method: 'post',
    path: '/google-calendar/notifications',
    handler: controller.handlePushNotification,
    description: 'Handle Google Calendar push notifications',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        type: { type: 'string', required: true },
        resourceId: { type: 'string', required: true },
        resourceUri: { type: 'string', required: true }
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request',
        body: {
          error: 'Invalid notification payload'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to process notification'
        }
      }
    ]
  }
]; 