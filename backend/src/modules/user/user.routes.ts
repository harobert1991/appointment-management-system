import { UserController } from './user.controller';
import { RouteConfig } from '../../utils/routeLoader';
import { UserRole } from './user.schema';

const controller = new UserController();

export const routes: RouteConfig[] = [
  {
    method: 'post',
    path: '/users',
    handler: controller.createUser,
    description: 'Create a new user',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        role: { type: 'string', enum: Object.values(UserRole), required: true },
        firstName: { type: 'string', required: true },
        lastName: { type: 'string', required: true },
        email: { type: 'string', format: 'email', required: true },
        phone: { type: 'string', required: false },
        address: {
          type: 'object',
          required: false,
          properties: {
            street: { type: 'string', required: true },
            city: { type: 'string', required: true },
            state: { type: 'string', required: true },
            postalCode: { type: 'string', required: true },
            country: { type: 'string', required: true }
          }
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
          error: 'Failed to create user'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/users/:id',
    handler: controller.getUserById,
    description: 'Get user by ID',
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
          error: 'User not found'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          error: 'Failed to get user'
        }
      }
    ]
  }
]; 