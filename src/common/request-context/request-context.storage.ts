import { AsyncLocalStorage } from 'node:async_hooks';

/** Данные одного HTTP-запроса в AsyncLocalStorage. */
export interface RequestContextStore {
  requestId: string;
}

/** Контекст запроса для логов и трейсинга (устанавливается в `requestIdMiddleware`). */
export const requestContext = new AsyncLocalStorage<RequestContextStore>();

/** Текущий `request-id` из контекста или `undefined` вне цепочки middleware. */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
