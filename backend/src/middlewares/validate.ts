import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * The gate every endpoint's input passes through, used as
 * `validate(someSchema)` in the routes/ files.
 *
 * Given a schema shaped like `{ body?, query?, params? }` it checks the request
 * against it and, on success, writes the *parsed* result back onto `req`. That
 * second part matters: Zod trims strings and coerces types on the way through,
 * so a controller reading `req.body` gets clean, correctly typed data and never
 * has to re-check it.
 *
 * On failure nothing downstream runs — the request goes straight to the error
 * handler with a 400 listing which fields were wrong.
 */
export const validate = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
    if (parsed.body) req.body = parsed.body;
    if (parsed.params) req.params = parsed.params;
    // req.query is a getter-only property on some Express/Node versions; mutate in place instead of reassigning.
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
