import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Lets a controller `throw` instead of writing try/catch.
 *
 * Express predates async/await: if an async handler rejects, Express never
 * finds out and the request just hangs until it times out. Wrapping the
 * handler catches the rejection and passes it to `next(error)`, which is the
 * one route to the central error handler in middlewares/errorHandler.ts.
 *
 * That is why every route below is written `asyncHandler(controller.thing)` —
 * it means a service can simply `throw new AppError('...', 404)` anywhere and
 * the client still gets a clean JSON response.
 */
export const asyncHandler = (fn: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
