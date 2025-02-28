import fs from 'fs/promises';
import path from 'path';
import { RouteConfig } from './routeLoader';

interface PostmanRequest {
  name: string;
  request: {
    method: string;
    header: Array<{ key: string; value: string }>;
    url: {
      raw: string;
      host: string[];
      path: string[];
    };
    description?: string;
    body?: {
      mode: 'raw';
      raw: string;
      options: {
        raw: {
          language: 'json';
        };
      };
    };
  };
  response: [];
}

interface PostmanFolder {
  name: string;
  item: (PostmanRequest | PostmanFolder)[];
}

interface PostmanCollection {
  info: {
    name: string;
    schema: string;
  };
  item: (PostmanRequest | PostmanFolder)[];
  variable?: Array<{ key: string; value: string; type: string }>;
}

export async function generatePostmanCollection(routeConfigs: RouteConfig[]): Promise<void> {
  const collection: PostmanCollection = {
    info: {
      name: 'Appointment Management API',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: []
  };

  const baseUrl = '{{baseUrl}}';

  console.log('\n📮 Generating Postman Collection:');
  
  // Group routes by module
  const moduleGroups = routeConfigs.reduce((acc: Record<string, RouteConfig[]>, route) => {
    // Extract module name from path (e.g., /google-calendar/auth-url -> google-calendar)
    const moduleName = route.path.split('/')[1];
    if (!acc[moduleName]) {
      acc[moduleName] = [];
    }
    acc[moduleName].push(route);
    return acc;
  }, {});

  // Create folder for each module
  Object.entries(moduleGroups).forEach(([moduleName, routes]) => {
    console.log(`\n📁 Module: ${moduleName}`);
    
    const moduleFolder: PostmanFolder = {
      name: moduleName,
      item: routes.map(route => {
        console.log(`📝 ${route.method.toUpperCase()} ${route.path} - ${route.description}`);
        
        const request: PostmanRequest = {
          name: route.description,
          request: {
            method: route.method.toUpperCase(),
            header: Object.entries(route.input.headers).map(([key, value]) => ({
              key,
              value
            })),
            url: {
              raw: `${baseUrl}/api${route.path}`,
              host: [baseUrl],
              path: ['api', ...route.path.split('/').filter(Boolean)]
            },
            description: route.description
          },
          response: []
        };

        if (route.input.body) {
          const exampleBody = generateExampleBody(route.input.body);
          request.request.body = {
            mode: 'raw',
            raw: JSON.stringify(exampleBody, null, 2),
            options: {
              raw: {
                language: 'json'
              }
            }
          };
        }

        return request;
      })
    };

    collection.item.push(moduleFolder);
  });

  // Add variables to the collection
  collection.variable = [
    {
      key: 'baseUrl',
      value: process.env.API_BASE_URL || 'localhost:3000',
      type: 'string'
    }
  ];

  const outputPath = path.join(__dirname, '../../postman/collection.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(collection, null, 2));
  
  console.log(`\n✅ Postman collection generated: ${outputPath}\n`);
}

function generateExampleBody(schema: Record<string, any>): any {
  const example: Record<string, any> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (value.type === 'array' && value.items) {
      example[key] = [generateExampleBody(value.items)];
    } else if (value.type === 'object' && value.properties) {
      example[key] = generateExampleBody(value.properties);
    } else {
      example[key] = generateExampleValue(value);
    }
  }

  return example;
}

function generateExampleValue(field: any): any {
  if (field.enum) {
    return field.enum[0];
  }

  switch (field.type) {
    case 'string':
      if (field.format === 'date-time') {
        return new Date().toISOString();
      }
      if (field.format === 'email') {
        return 'example@email.com';
      }
      return 'example';
    case 'number':
      return field.min || 0;
    case 'boolean':
      return field.default ?? true;
    default:
      return null;
  }
} 