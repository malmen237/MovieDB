import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Simple in-memory rate limiter middleware
 * For production with multiple instances, use Redis-based rate limiting
 */
export class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Use IP address as the key
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${ip}`;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();

      if (!this.store[key] || this.store[key].resetTime < now) {
        // Reset the counter
        this.store[key] = {
          count: 1,
          resetTime: now + this.windowMs
        };
        return next();
      }

      this.store[key].count++;

      if (this.store[key].count > this.maxRequests) {
        const retryAfter = Math.ceil((this.store[key].resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', this.store[key].resetTime.toString());

        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
        });
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (this.maxRequests - this.store[key].count).toString());
      res.setHeader('X-RateLimit-Reset', this.store[key].resetTime.toString());

      next();
    };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Create rate limiters for different endpoints
// General API rate limiter: 100 requests per minute
export const generalRateLimiter = new RateLimiter(60000, 100);

// Stricter rate limiter for write operations: 30 requests per minute
export const writeRateLimiter = new RateLimiter(60000, 30);

// Very strict for import operations: 5 requests per 5 minutes
export const importRateLimiter = new RateLimiter(300000, 5);

// TMDB search rate limiter: 40 requests per minute (to respect TMDB limits)
export const tmdbRateLimiter = new RateLimiter(60000, 40);
