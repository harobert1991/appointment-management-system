import fs from 'fs/promises';
import path from 'path';
import { Router } from 'express';
import { generatePostmanCollection } from './postmanGenerator';

export interface RouteConfig {
  method: string;
  path: string;
  handler: Function;
  description: string;
  input: {
    headers: Record<string, string>;
    body?: Record<string, SchemaField>;
    params?: Record<string, SchemaField>;
    query?: Record<string, SchemaField>;
  };
  middleware?: Function[];
  errorResponses: Array<{
    status: number;
    description: string;
    body: Record<string, any>;
  }>;
}

interface SchemaField {
  type: string;
  required: boolean;
  enum?: string[];
  format?: string;
  min?: number;
  max?: number;
  default?: any;
  properties?: Record<string, SchemaField>;
}

export async function loadRoutes(): Promise<{ router: Router; routeConfigs: RouteConfig[] }> {
  const router = Router();
  const routeConfigs: RouteConfig[] = [];
  const modulesPath = path.join(__dirname, '..', 'modules');

  try {
    const modules = await fs.readdir(modulesPath);
    console.log('\n🚀 Loading Routes:');

    for (const moduleDir of modules) {
      const modulePath = path.join(modulesPath, moduleDir);
      const stats = await fs.stat(modulePath);

      if (stats.isDirectory()) {
        const routesPath = path.join(modulePath, `${moduleDir}.routes.ts`);
        try {
          await fs.access(routesPath);
          
          const routeModule = require(routesPath);
          const routes = routeModule.routes;
          
          if (Array.isArray(routes)) {
            routes.forEach((route: RouteConfig) => {
              const { method, path: routePath, handler, middleware = [] } = route;
              (router as any)[method.toLowerCase()](
                routePath,
                ...middleware,
                handler
              );
              routeConfigs.push(route);
              console.log(`📍 ${method.toUpperCase()} ${routePath}`);
            });
          }
        } catch (error) {
          console.log(`⚠️  No routes found for module: ${moduleDir}`);
          continue;
        }
      }
    }

    // Generate Postman collection
    await generatePostmanCollection(routeConfigs);
    
    console.log(`\n✅ Total routes loaded: ${routeConfigs.length}\n`);

    return { router, routeConfigs };
  } catch (error) {
    console.error('Error loading routes:', error);
    throw error;
  }
} 