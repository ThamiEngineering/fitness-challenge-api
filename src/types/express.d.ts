declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        resetTime?: Date;
        limit?: number;
        current?: number;
        remaining?: number;
      };
    }
  }
}

export { };

