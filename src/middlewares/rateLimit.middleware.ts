import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Limiteur général pour toutes les requêtes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        retryAfter: req.rateLimit?.resetTime,
      },
    });
  },
});

// Limiteur strict pour l'authentification
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur pour la création de contenu
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'Limite de création atteinte, veuillez réessayer dans une heure',
  skipSuccessfulRequests: false,
});

// Limiteur pour les uploads de fichiers
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Limite d\'upload atteinte, veuillez réessayer dans une heure',
});

// Limiteur pour les requêtes d'API sensibles (comme les exports de données)
export const sensitiveLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: 'Limite quotidienne atteinte pour cette action',
});

// Créer un limiteur personnalisé
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