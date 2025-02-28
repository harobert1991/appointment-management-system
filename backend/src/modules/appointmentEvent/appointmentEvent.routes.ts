import { AppointmentType, AppointmentStatus } from './appointmentEvent.schema';
import { AppointmentEventController } from './appointmentEvent.controller';

const controller = new AppointmentEventController();

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
    method: 'post',
    path: '/appointment-events',
    handler: controller.createAppointment,
    description: 'Create a new appointment event',
    input: {
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer <JWT_TOKEN>', // Not implemented yet
      },
      body: {
        title: { type: 'string', required: true },
        description: { type: 'string', required: false },
        appointmentType: {
          type: 'string',
          enum: Object.values(AppointmentType),
          required: true
        },
        startDateTime: { type: 'string', format: 'date-time', required: true },
        endDateTime: { type: 'string', format: 'date-time', required: true },
        location: { type: 'string', required: false },
        participants: {
          type: 'array',
          required: true,
          items: {
            userId: { type: 'string', required: true },
            role: { type: 'string', enum: ['provider', 'client', 'other'], required: true },
            name: { type: 'string', required: true },
            email: { type: 'string', format: 'email', required: false },
            phone: { type: 'string', required: false }
          }
        },
        providerId: { type: 'string', required: false },
        reminderSettings: {
          type: 'array',
          required: false,
          items: {
            type: { type: 'string', enum: ['email', 'sms', 'push'], required: true },
            timeBeforeEvent: { type: 'number', min: 5, max: 10080, required: true },
            isEnabled: { type: 'boolean', default: true }
          }
        }
      }
    },
    // middleware: [authenticateUser], // Not implemented yet
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request - Validation Error',
        body: {
          error: 'string',
          details: ['string']
        }
      },
      {
        status: 400,
        description: 'Bad Request - Scheduling Conflict',
        body: {
          error: 'Provider has a scheduling conflict'
        }
      },
      {
        status: 400,
        description: 'Bad Request - Invalid Date Range',
        body: {
          error: 'End date must be after start date'
        }
      },
      {
        status: 400,
        description: 'Bad Request - Duration Too Short',
        body: {
          error: 'Appointment must be at least 15 minutes long'
        }
      },
      // {
      //   status: 401,
      //   description: 'Unauthorized',
      //   body: {
      //     error: 'Authentication required'
      //   }
      // }, // Not implemented yet
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to create appointment'
        }
      }
    ]
  }
];