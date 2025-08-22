import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
}

export function errorHandler(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Route not found',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  });
}
