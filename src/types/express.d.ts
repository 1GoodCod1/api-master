export {};

declare global {
  namespace Express {
    interface Request {
      /** Correlation id (from X-Request-Id or generated). Set by requestIdMiddleware. */
      requestId?: string;
    }
  }
}
