import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Express predates async/await: if an async handler rejects, Express never finds
 * out and the request hangs until it times out. Catching the rejection and
 * passing it to `next(error)` is what lets a service simply
 * `throw new AppError('...', 404)` and still produce a clean JSON response.
 */
export const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
