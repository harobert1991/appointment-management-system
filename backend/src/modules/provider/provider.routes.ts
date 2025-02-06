import { Router } from 'express';
import { ProviderController } from './provider.controller';
import { validateRequest } from '../../middleware/validateRequest';
import { checkAvailabilitySchema, updateAvailabilitySchema } from './provider.schema';

const controller = new ProviderController();

interface RouteConfig {
  method: string;
  path: string;
  handler: Function;
  description: string;
  input: {
    headers: Record<string, string>;
    body?: Record<string, any>;
    params?: Record<string, string>;
    query?: Record<string, string>;
  };
  middleware?: Function[];
  errorResponses: Array<{
    status: number;
    description: string;
    body: Record<string, any>;
  }>;
}

export const routes: RouteConfig[] = [
  {
    method: 'get',
    path: '/:providerId/availability',
    handler: controller.getAvailability,
    description: 'Get provider availability for a specific date and duration',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        providerId: 'string'
      },
      query: {
        date: 'YYYY-MM-DD formatted date string',
        duration: 'number in minutes',
        locationId: 'optional location ID string'
      }
    },
    middleware: [validateRequest(checkAvailabilitySchema)],
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request - Invalid Parameters',
        body: {
          error: 'string'
        }
      },
      {
        status: 404,
        description: 'Provider Not Found',
        body: {
          error: 'Provider not found'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/:providerId/availability/:date',
    handler: controller.getSpecificDateAvailability,
    description: 'Get provider availability for a specific date',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        providerId: 'string',
        date: 'YYYY-MM-DD formatted date string'
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request - Invalid Date Format',
        body: {
          error: 'string'
        }
      },
      {
        status: 404,
        description: 'Provider Not Found',
        body: {
          error: 'Provider not found'
        }
      }
    ]
  },
  {
    method: 'put',
    path: '/:providerId/availability',
    handler: controller.updateAvailability,
    description: 'Update provider availability',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        providerId: 'string'
      },
      body: {
        availability: 'Array of availability objects'
      }
    },
    middleware: [validateRequest(updateAvailabilitySchema)],
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request - Invalid Availability Format',
        body: {
          error: 'string'
        }
      },
      {
        status: 400,
        description: 'Bad Request - Scheduling Conflict',
        body: {
          error: 'Cannot update availability due to existing appointments'
        }
      },
      {
        status: 404,
        description: 'Provider Not Found',
        body: {
          error: 'Provider not found'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/:providerId/time-slots',
    handler: controller.getTimeSlots,
    description: 'Get available time slots for a specific date, duration and location',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        providerId: 'string'
      },
      query: {
        date: 'YYYY-MM-DD formatted date string',
        duration: 'number in minutes',
        locationId: 'optional location ID string'
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request - Invalid Parameters',
        body: {
          error: 'string'
        }
      },
      {
        status: 404,
        description: 'Provider Not Found',
        body: {
          error: 'Provider not found'
        }
      }
    ]
  }
];

// Create router and register routes
export const providerRouter = Router();

routes.forEach(route => {
  const { method, path, handler, middleware = [] } = route;
  (providerRouter as any)[method](path, ...middleware, handler);
}); 