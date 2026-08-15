import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ error: `المسار غير موجود: ${req.method} ${req.originalUrl}` });
};

/**
 * The single place deciding what error detail is safe to send. Operational
 * errors get a clean message; anything unexpected is logged server-side and
 * reported generically, so stack traces and driver errors never reach a client.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name?: string }).name;

    if (name === 'ValidationError') {
      res.status(400).json({ error: (err as Error).message });
      return;
    }

    if (name === 'CastError') {
      res.status(400).json({ error: 'صيغة المعرّف غير صالحة' });
      return;
    }

    // Duplicate key — in practice the slotKeys unique index.
    if ('code' in err && (err as { code?: number }).code === 11000) {
      res.status(409).json({ error: 'هذا الموعد محجوز بالفعل' });
      return;
    }
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    error: 'حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقًا.',
    ...(process.env.NODE_ENV === 'production'
      ? {}
      : { detail: err instanceof Error ? err.message : String(err) }),
  });
};
