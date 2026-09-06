import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { Logger } from '../utils/logger';

export const validate = (schema: z.ZodObject<any, any>) => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
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
        res.status(500).json({ error: error?.message || 'Internal server error during validation' });
      }
    }
  };
