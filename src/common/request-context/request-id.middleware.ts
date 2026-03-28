import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { requestContext } from './request-context.storage';

interface RequestWithId extends Request {
  requestId?: string;
}

const HEADER = 'x-request-id';

/** Безопасное подмножество для входящих correlation id (в духе W3C trace context). */
const INCOMING_ID = /^[a-zA-Z0-9._-]{1,128}$/;

function sanitizeIncomingId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed || !INCOMING_ID.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

/**
 * Задаёт `req.requestId`, заголовок ответа `X-Request-Id` и AsyncLocalStorage
 * для Winston и остального кода по цепочке запроса.
 */
export const requestIdMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction,
) => {
  const incoming = sanitizeIncomingId(req.headers[HEADER]);
  const id = incoming ?? randomUUID();

  req.requestId = id;
  res.setHeader('X-Request-Id', id);

  requestContext.run({ requestId: id }, () => {
    next();
  });
};
