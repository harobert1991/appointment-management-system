import express, { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { z } from 'zod';

// Create a cache instance
const cache = new NodeCache();

// Types
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteConfig {
  path: string;
  method: HttpMethod;
  handler: (req: Request, res: Response) => Promise<any>;
  inputValidation?: {
    type: 'params' | 'body' | 'query';
    schema: z.ZodSchema;
  };
  cache?: {
    duration: number;
    keyFn: (req: Request) => string;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  description?: string;
}

// Default rate limiter
const defaultRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});

export function generateRoutes(routeConfigs: RouteConfig[]) {
  const router = express.Router();

  routeConfigs.forEach(config => {
    const {
      path,
      method,
      handler,
      inputValidation,
      cache: cacheConfig,
      rateLimit: rateLimitConfig,
      description
    } = config;

    // Create middleware array
    const middlewares: (RateLimitRequestHandler | ((req: Request, res: Response, next: NextFunction) => void))[] = [];

    // Add rate limiting if configured
    if (rateLimitConfig) {
      const customLimiter = rateLimit({
        windowMs: rateLimitConfig.windowMs,
        max: rateLimitConfig.max
      });
      middlewares.push(customLimiter);
    } else {
      middlewares.push(defaultRateLimiter);
    }

    // Create the route handler
    const routeHandler = async (req: Request, res: Response) => {
      try {
        // Input validation
        if (inputValidation) {
          const input = req[inputValidation.type];
          try {
            inputValidation.schema.parse(input);
          } catch (error) {
            if (error instanceof z.ZodError) {
              return res.status(400).json({
                error: 'Invalid input',
                details: error.errors
              });
            }
          }
        }

        // Cache handling
        if (cacheConfig) {
          const cacheKey = cacheConfig.keyFn(req);
          const cachedData = cache.get(cacheKey);

          if (cachedData) {
            return res.json(cachedData);
          }

          const data = await handler(req, res);
          cache.set(cacheKey, data, cacheConfig.duration);
          return res.json(data);
        }

        // Regular handling without cache
        const data = await handler(req, res);
        return res.json(data);

      } catch (error) {
        console.error(`Error in ${path}:`, error);
        return res.status(500).json({
          error: 'Internal server error',
          path,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    // Register the route
    router[method](path, ...middlewares, routeHandler);

    // Log route registration
    console.log(`Route registered: ${method.toUpperCase()} ${path}${description ? ` - ${description}` : ''}`);
  });

  return router;
} 