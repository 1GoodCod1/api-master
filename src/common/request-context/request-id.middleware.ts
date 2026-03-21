import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { requestContext } from './request-context.storage';

const HEADER = 'x-request-id';

/** Safe subset for inbound correlation ids (W3C trace context allows similar) */
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
 * Sets `req.requestId`, `X-Request-Id` response header, and AsyncLocalStorage
 * for Winston and downstream code.
 */
export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = sanitizeIncomingId(req.headers[HEADER]);
  const id = incoming ?? randomUUID();

  req.requestId = id;
  res.setHeader('X-Request-Id', id);

  requestContext.run({ requestId: id }, () => {
    next();
  });
};
