import { Request, Response } from 'express';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

export default interface RouteConfig {
  path: string;
  method: HttpMethod;
  handler: (req: Request, res: Response) => Promise<void | Response>;
  description: string;
  inputValidation?: {
    type: 'body' | 'query';
    schema: any;
  };
} 