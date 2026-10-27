/**
 * Small timing helpers.
 *
 * `Promise.withResolvers()` keeps the control flow linear — the caller gets the
 * promise and the resolver without an executor callback wrapping the logic.
 */

/** Resolve after `ms` milliseconds. */
export function delay(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}
