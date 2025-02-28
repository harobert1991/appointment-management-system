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
        organizationId: { type: 'string', required: true },
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
      },
      {
        status: 404,
        description: 'Not Found - Organization Not Found',
        body: {
          success: false,
          error: 'Not Found',
          details: 'Organization not found'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/providers/:providerId/available-slots',
    handler: controller.getAvailableTimeSlots,
    description: 'Get available time slots for a provider on specific dates',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        providerId: { type: 'string', required: true }
      },
      query: {
        dates: { 
          type: 'array',
          required: true
        },
        appointmentTypeId: { 
          type: 'string', 
          required: true
        },
        locationId: { 
          type: 'string', 
          required: false
        }
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request - Invalid Parameters',
        body: {
          success: false,
          error: 'Validation Error',
          details: 'string'
        }
      },
      {
        status: 404,
        description: 'Provider or Appointment Type Not Found',
        body: {
          success: false,
          error: 'Not Found',
          details: 'string'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          success: false,
          error: 'Failed to get available time slots',
          details: 'string'
        }
      }
    ]
  },
  {
    method: 'delete',
    path: '/providers/cleanup',
    handler: controller.deleteAllProviders,
    description: 'Delete all providers (development only)',
    input: {
      headers: {
        'Content-Type': 'application/json'
      }
    },
    errorResponses: [
      {
        status: 403,
        description: 'Forbidden in Production',
        body: {
          success: false,
          error: 'Forbidden',
          details: 'string'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          success: false,
          error: 'Failed to delete providers',
          details: 'string'
        }
      }
    ]
  }
];

