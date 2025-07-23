import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

interface MongoError extends Error {
  code?: number;
  keyPattern?: Record<string, any>;
  keyValue?: Record<string, any>;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: (req as any).user?.id,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Ressource non trouvée';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if ((err as MongoError).code === 11000) {
    const value = (err as MongoError).keyValue;
    const field = Object.keys(value || {})[0];
    const message = `Cette valeur de ${field} existe déjà. Veuillez utiliser une autre valeur`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values((err as any).errors).map((e: any) => e.message);
    const message = `Données invalides: ${errors.join('. ')}`;
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Token invalide. Veuillez vous reconnecter', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Votre token a expiré. Veuillez vous reconnecter', 401);
  }

  const appError = error as AppError;
  const statusCode = appError.statusCode || 500;
  const message = appError.message || 'Erreur serveur interne';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        error: err,
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
};

// Middleware pour gérer les routes non trouvées
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const message = `Route non trouvée: ${req.originalUrl}`;
  const error = new AppError(message, 404);
  next(error);
};

// Middleware pour gérer les promesses rejetées
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};