import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function asyncHandler(handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>) {
  return (request: Request, response: Response, next: NextFunction): void => {
    void handler(request, response, next).catch(next);
  };
}

export function notFound(request: Request, _response: Response, next: NextFunction): void {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route exists for ${request.method} ${request.path}.`));
}

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction): void {
  const correlationId = response.locals.correlationId as string;
  let appError: AppError;
  if (error instanceof AppError) appError = error;
  else if (error instanceof ZodError) {
    appError = new AppError(400, 'VALIDATION_ERROR', 'The request contains invalid data.', {
      issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  } else if (error instanceof SyntaxError && 'body' in error) {
    appError = new AppError(400, 'INVALID_JSON', 'The request body is not valid JSON.');
  } else {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(JSON.stringify({ level: 'error', correlationId, method: request.method, path: request.path, message }));
    appError = new AppError(500, 'INTERNAL_ERROR', 'The request could not be completed.');
  }
  response.status(appError.status).json({
    code: appError.code,
    message: appError.message,
    status: appError.status,
    correlationId,
    ...(appError.details ? { details: appError.details } : {}),
  });
}
