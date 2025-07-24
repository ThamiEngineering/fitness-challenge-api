import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        retryAfter: (req as any).rateLimit?.resetTime,
      },
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'Limite de création atteinte, veuillez réessayer dans une heure',
  skipSuccessfulRequests: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Limite d\'upload atteinte, veuillez réessayer dans une heure',
});

export const sensitiveLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: 'Limite quotidienne atteinte pour cette action',
});

export const createCustomLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Trop de requêtes, veuillez réessayer plus tard',
    standardHeaders: true,
    legacyHeaders: false,
  });
};