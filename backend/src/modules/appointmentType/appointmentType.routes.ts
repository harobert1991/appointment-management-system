import { AppointmentTypeController } from './appointmentType.controller';
import { RouteConfig } from '../../utils/routeLoader';

const controller = new AppointmentTypeController();

export const routes: RouteConfig[] = [
  {
    method: 'post',
    path: '/appointment-types',
    handler: controller.createAppointmentType,
    description: 'Create a new appointment type',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        name: { type: 'string', required: true },
        duration: { type: 'number', required: true },
        organizationId: { type: 'string', required: true },
        description: { type: 'string', required: false },
        bufferTimeBefore: { type: 'number', required: false },
        bufferTimeAfter: { type: 'number', required: false },
        price: { type: 'number', required: false },
        category: { type: 'string', required: false },
        isActive: { type: 'boolean', required: false },
        locations: {
          type: 'array',
          required: false,
          properties: {
            name: { type: 'string', required: true },
            address: { type: 'string', required: false },
            type: { type: 'string', enum: ['virtual', 'physical'], required: true },
            coordinates: {
              type: 'object',
              required: false,
              properties: {
                latitude: { type: 'number', required: true },
                longitude: { type: 'number', required: true }
              }
            }
          }
        },
        resourcesRequired: { 
          type: 'array', 
          required: false,
          properties: { value: { type: 'string', required: false } }
        },
        tags: { 
          type: 'array', 
          required: false,
          properties: { value: { type: 'string', required: false } }
        }
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request - Validation Error',
        body: {
          error: 'string'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to create appointment type'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/appointment-types/:id',
    handler: controller.getAppointmentTypeById,
    description: 'Get appointment type by ID',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true }
      }
    },
    errorResponses: [
      {
        status: 404,
        description: 'Not Found',
        body: {
          error: 'Appointment type not found'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to get appointment type'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/appointment-types',
    handler: controller.getAllAppointmentTypes,
    description: 'Get all appointment types with optional filters',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      query: {
        organizationId: { type: 'string', required: true },
        category: { type: 'string', required: false },
        tags: { type: 'string', required: false },
        isActive: { type: 'boolean', required: false }
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request - Invalid Filter',
        body: {
          error: 'string'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to get appointment types'
        }
      }
    ]
  },
  {
    method: 'put',
    path: '/appointment-types/:id',
    handler: controller.updateAppointmentType,
    description: 'Update an appointment type',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true }
      },
      body: {
        name: { type: 'string', required: false },
        duration: { type: 'number', required: false },
        description: { type: 'string', required: false },
        bufferTimeBefore: { type: 'number', required: false },
        bufferTimeAfter: { type: 'number', required: false },
        price: { type: 'number', required: false },
        category: { type: 'string', required: false },
        isActive: { type: 'boolean', required: false },
        locations: {
          type: 'array',
          required: false,
          properties: {
            name: { type: 'string', required: true },
            address: { type: 'string', required: false },
            type: { type: 'string', enum: ['virtual', 'physical'], required: true },
            coordinates: {
              type: 'object',
              required: false,
              properties: {
                latitude: { type: 'number', required: true },
                longitude: { type: 'number', required: true }
              }
            }
          }
        },
        resourcesRequired: { 
          type: 'array', 
          required: false,
          properties: { value: { type: 'string', required: false } }
        },
        tags: { 
          type: 'array', 
          required: false,
          properties: { value: { type: 'string', required: false } }
        }
      }
    },
    errorResponses: [
      {
        status: 404,
        description: 'Not Found',
        body: {
          error: 'Appointment type not found'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to update appointment type'
        }
      }
    ]
  },
  {
    method: 'delete',
    path: '/appointment-types/cleanup',
    handler: controller.cleanupAppointmentTypes,
    description: 'Delete all appointment types (for testing purposes)',
    input: {
      headers: {
        'Content-Type': 'application/json'
      }
    },
    errorResponses: [
      {
        status: 403,
        description: 'Forbidden - Not available in production',
        body: {
          error: 'Operation not allowed'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to cleanup appointment types'
        }
      }
    ]
  },
  {
    method: 'delete',
    path: '/appointment-types/:id',
    handler: controller.deleteAppointmentType,
    description: 'Delete an appointment type',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true }
      }
    },
    errorResponses: [
      {
        status: 404,
        description: 'Not Found',
        body: {
          error: 'Appointment type not found'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to delete appointment type'
        }
      }
    ]
  }
]; 