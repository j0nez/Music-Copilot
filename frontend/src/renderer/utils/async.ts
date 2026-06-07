export const API_TIMEOUT = 30_000;

export async function withAbort<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number = API_TIMEOUT,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
