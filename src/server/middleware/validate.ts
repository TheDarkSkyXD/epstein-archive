import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errorHandler.js';

/**
 * Higher-order function that returns a middleware for validating request data against a Zod schema.
 * @param schema The Zod schema to validate against (body, query, or params)
 * @param source The source of the data to validate ('body' | 'query' | 'params')
 */
export const validate = (schema: AnyZodObject, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'params' ? req.params : source === 'query' ? req.query : req.body;
      const validatedData = await schema.parseAsync(data);

      // Replace original data with validated/typed data
      if (source === 'params') req.params = validatedData as any;
      else if (source === 'query') req.query = validatedData as any;
      else req.body = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        return next(new ValidationError('Input validation failed', details));
      }
      next(error);
    }
  };
};

// Common Schemas
import { z } from 'zod';

export const entitySchema = z.object({
  full_name: z.string().min(3).max(100),
  primary_role: z.string().min(2).max(100).optional(),
  entity_type: z.enum(['Person', 'Organization', 'Location', 'Event']).optional(),
  red_flag_rating: z.number().int().min(0).max(5).optional(),
  bio: z.string().max(2000).optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.preprocess((val) => Number(val), z.number().int().min(1).max(100)).optional(),
});
