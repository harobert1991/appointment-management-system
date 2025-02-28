import { OrganizationController } from './organization.controller';
import { RouteConfig } from '../../utils/routeLoader';

const controller = new OrganizationController();

export const routes: RouteConfig[] = [
  {
    method: 'post',
    path: '/organizations',
    handler: controller.createOrganization,
    description: 'Create a new organization',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        name: { type: 'string', required: false },
        description: { type: 'string', required: false },
        address: {
          type: 'object',
          required: false,
          properties: {
            street: { type: 'string', required: false },
            city: { type: 'string', required: false },
            state: { type: 'string', required: false },
            postalCode: { type: 'string', required: false },
            country: { type: 'string', required: false }
          }
        },
        contact: {
          type: 'object',
          required: false,
          properties: {
            email: { type: 'string', format: 'email', required: false },
            phone: { type: 'string', required: false },
            website: { type: 'string', required: false },
            whatsappBusinessAccountId: { type: 'string', required: false },
            whatsappPhoneNumberId: { type: 'string', required: false }
          }
        },
        businessDetails: {
          type: 'object',
          required: false,
          properties: {
            taxId: { type: 'string', required: false },
            registrationNumber: { type: 'string', required: false }
          }
        },
        isActive: { type: 'boolean', required: false }
      }
    },
    errorResponses: [
      {
        status: 409,
        description: 'Conflict - Organization Name Already Exists',
        body: {
          success: false,
          error: 'Conflict',
          details: 'string'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          success: false,
          error: 'Failed to create organization',
          details: 'string'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/organizations/:id',
    handler: controller.getOrganizationById,
    description: 'Get organization by ID',
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
          success: false,
          error: 'Not Found',
          details: 'Organization not found'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          success: false,
          error: 'Failed to get organization',
          details: 'string'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/organizations',
    handler: controller.getAllOrganizations,
    description: 'Get all organizations with optional filtering',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      query: {
        isActive: { type: 'string', required: false }
      }
    },
    errorResponses: [
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          success: false,
          error: 'Failed to get organizations',
          details: 'string'
        }
      }
    ]
  },
  {
    method: 'put',
    path: '/organizations/:id',
    handler: controller.updateOrganization,
    description: 'Update an organization',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        id: { type: 'string', required: true }
      },
      body: {
        name: { type: 'string', required: false },
        description: { type: 'string', required: false },
        address: {
          type: 'object',
          required: false,
          properties: {
            street: { type: 'string', required: false },
            city: { type: 'string', required: false },
            state: { type: 'string', required: false },
            postalCode: { type: 'string', required: false },
            country: { type: 'string', required: false }
          }
        },
        contact: {
          type: 'object',
          required: false,
          properties: {
            email: { type: 'string', format: 'email', required: false },
            phone: { type: 'string', required: false },
            website: { type: 'string', required: false },
            whatsappBusinessAccountId: { type: 'string', required: false },
            whatsappPhoneNumberId: { type: 'string', required: false }
          }
        },
        businessDetails: {
          type: 'object',
          required: false,
          properties: {
            taxId: { type: 'string', required: false },
            registrationNumber: { type: 'string', required: false }
          }
        },
        isActive: { type: 'boolean', required: false }
      }
    },
    errorResponses: [
      {
        status: 404,
        description: 'Not Found',
        body: {
          success: false,
          error: 'Not Found',
          details: 'Organization not found'
        }
      },
      {
        status: 409,
        description: 'Conflict - Organization Name Already Exists',
        body: {
          success: false,
          error: 'Conflict',
          details: 'string'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          success: false,
          error: 'Failed to update organization',
          details: 'string'
        }
      }
    ]
  },
  {
    method: 'delete',
    path: '/organizations/:id',
    handler: controller.deleteOrganization,
    description: 'Delete an organization',
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
          success: false,
          error: 'Not Found',
          details: 'Organization not found'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          success: false,
          error: 'Failed to delete organization',
          details: 'string'
        }
      }
    ]
  },
  {
    method: 'get',
    path: '/organizations/search',
    handler: controller.searchOrganizations,
    description: 'Search organizations by term',
    input: {
      headers: {
        'Content-Type': 'application/json'
      },
      query: {
        term: { type: 'string', required: true }
      }
    },
    errorResponses: [
      {
        status: 400,
        description: 'Bad Request',
        body: {
          success: false,
          error: 'Bad Request',
          details: 'Search term is required'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          success: false,
          error: 'Failed to search organizations',
          details: 'string'
        }
      }
    ]
  },
  {
    method: 'delete',
    path: '/organizations/delete-all',
    handler: controller.deleteAllOrganizations,
    description: 'Delete all organizations (development only)',
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
          details: 'This operation is not allowed in production environment'
        }
      },
      {
        status: 500,
        description: 'Internal Server Error',
        body: {
          success: false,
          error: 'Failed to delete organizations',
          details: 'string'
        }
      }
    ]
  }
];
