import { ProviderController } from './provider.controller';
import { RouteConfig } from '../../utils/routeLoader';

const controller = new ProviderController();

export const routes: RouteConfig[] = [
  {
    method: 'post',
    path: '/providers',
    handler: controller.createProvider,
    description: 'Create a new provider with associated user',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        servicesOffered: { type: 'array', required: true },
        availability: {
          type: 'array',
          required: false,
          properties: {
            dayOfWeek: { type: 'string', required: true },
            timeSlots: {
              type: 'array',
              required: true,
              properties: {
                startTime: { type: 'string', required: true },
                endTime: { type: 'string', required: true },
                requiresTravelTime: { type: 'boolean', required: true },
                spansOvernight: { type: 'boolean', required: true },
                locationId: { type: 'string', required: false },
                travelBuffer: { type: 'number', required: false }
              }
            }
          }
        },
        user: {
          type: 'object',
          required: true,
          properties: {
            email: { type: 'string', required: true },
            firstName: { type: 'string', required: true },
            lastName: { type: 'string', required: true },
            phone: { 
              type: 'string', 
              required: false
            },
            password: { type: 'string', required: true }
          }
        }
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request - Invalid Data',
        body: {
          error: 'string',
          details: 'array'
        }
      },
      {
        status: 409,
        description: 'Conflict - Email or Phone Already Exists',
        body: {
          error: 'string' // Will be either "email already exists" or "phone already exists"
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to create provider',
          message: 'string'
        }
      }
    ]
  }
];

