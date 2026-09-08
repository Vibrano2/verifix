import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { Logger } from '../utils/logger';

export const validate = (schema: z.ZodObject<any, any>) => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params && typeof parsed.params === 'object') req.params = parsed.params as any;
      if (parsed.query && typeof parsed.query === 'object') req.query = parsed.query as any;
      next();
    } catch (error: any) {
      const issues = error?.issues || error?.errors || [];
      if (error instanceof ZodError || error?.name === 'ZodError' || issues.length > 0) {
        res.status(400).json({
          error: 'Validation failed',
          details: issues.map((err: any) => ({
            field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
            message: err.message
          }))
        });
      } else {
        Logger.error('Unexpected validation error', error);
        res.status(500).json({ error: 'Internal server error during validation' });
      }
    }
  };
