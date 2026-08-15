import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Writes the *parsed* result back onto `req`, which is the part that matters:
 * Zod trims and coerces on the way through, so a controller reading `req.body`
 * gets clean, correctly typed data and never has to re-check it.
 */
export const validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
    if (parsed.body) req.body = parsed.body;
    if (parsed.params) req.params = parsed.params;
    // Getter-only on some Express/Node versions, so mutate rather than reassign.
    if (parsed.query) Object.assign(req.query, parsed.query);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return next(new AppError(message, 400));
    }
    next(error);
  }
};
