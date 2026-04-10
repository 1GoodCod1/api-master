import type { Logger } from '@nestjs/common';

/**
 * Execute a promise as a fire-and-forget side effect with standardised error logging.
 *
 * Replaces ad-hoc `.catch((e) => this.logger.error('...', e))` patterns
 * with a consistent format:
 * `[side-effect] <context> failed: <message>`
 *
 * @example
 * fireAndForget(this.analytics.incrementViews(id), this.logger, 'incrementViews');
 * fireAndForget(this.emailDrip.startChain(id, 'lead_closed'), this.logger, 'lead_closed drip');
 */
export function fireAndForget(
  promise: Promise<unknown>,
  logger: Pick<Logger, 'error'>,
  context: string,
): void {
  promise.catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      `[side-effect] ${context} failed: ${msg}`,
      err instanceof Error ? err.stack : undefined,
    );
  });
}
