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
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: (error as any).errors.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        Logger.error('Unexpected validation error', error);
        res.status(500).json({ error: 'Internal server error during validation' });
      }
    }
  };
