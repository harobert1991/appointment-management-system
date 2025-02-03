import { generateRoutes } from '../utils';
import { z } from 'zod';

const routes = generateRoutes([
  {
    path: '/example',
    method: 'get',
    handler: async (req, res) => {
      return { message: 'Hello World' };
    },
    description: 'Example endpoint',
    cache: {
      duration: 300, // 5 minutes
      keyFn: (req) => 'example-route'
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  {
    path: '/example/:id',
    method: 'post',
    handler: async (req, res) => {
      return { id: req.params.id, data: req.body };
    },
    inputValidation: {
      type: 'body',
      schema: z.object({
        name: z.string(),
        email: z.string().email()
      })
    },
    description: 'Create example'
  }
]);

export default routes; 