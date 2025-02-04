import fs from 'fs';
import path from 'path';
import {routes}  from '../src/modules/googleCalendarToken/googleCalendarToken.routes';
import RouteConfig from '../src/utils/generateRoutes';

interface PostmanRequest {
  name: string;
  request: {
    method: string;
    url: {
      raw: string;
      host: string[];
      path: string[];
      query?: Array<{ key: string; value: string }>;
    };
    header: Array<{ key: string; value: string }>;
    body?: {
      mode: string;
      raw: string;
    };
  };
}

function generatePostmanCollection(router: RouteConfig[]) {
  const collection = {
    info: {
      name: "Google Calendar API",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: router.map((route: RouteConfig) => {
      const request: PostmanRequest = {
        name: route.description,
        request: {
          method: route.method.toUpperCase(),
          url: {
            raw: `{{baseUrl}}${route.path}`,
            host: ["{{baseUrl}}"],
            path: route.path.split('/').filter(Boolean)
          },
          header: []
        }
      };

      if (route.inputValidation) {
        if (route.inputValidation.type === 'body') {
          request.request.header.push({
            key: "Content-Type",
            value: "application/json"
          });

          const bodyVars = Object.keys(route.inputValidation.schema.shape || {});
          const exampleBody = bodyVars.reduce((acc, key) => ({
            ...acc,
            [key]: `{{${key}}}`
          }), {});

          request.request.body = {
            mode: "raw",
            raw: JSON.stringify(exampleBody, null, 2)
          };
        }

        if (route.inputValidation.type === 'query') {
          const queryVars = Object.keys(route.inputValidation.schema.shape || {});
          request.request.url.query = queryVars.map(key => ({
            key,
            value: `{{${key}}}`
          }));
        }
      }

      return request;
    }),
    variable: [
      {
        key: "baseUrl",
        value: "http://localhost:3000",
        type: "string"
      }
    ]
  };

  // Add variables based on validation schemas
  const variables = new Set<string>();
  router.forEach(route => {
    if (route.inputValidation?.schema?.shape) {
      Object.keys(route.inputValidation.schema.shape).forEach(key => {
        variables.add(key);
      });
    }
  });

  collection.variable.push(
    ...Array.from(variables).map(key => ({
      key,
      value: `your_${key}_here`,
      type: "string"
    }))
  );

  return collection;
}

const outputPath = path.join(__dirname, '../postman/GoogleCalendarAPI.postman_collection.json');

// Ensure the directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Generate and write the collection
const collection = generatePostmanCollection(routes);
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

console.log(`Postman collection generated at: ${outputPath}`); 