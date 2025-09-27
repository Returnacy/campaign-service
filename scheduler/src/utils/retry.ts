export async function retryWithBackoff<T>(fn: () => Promise<T>, attempts: number, delayMs: number) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > attempts) throw err;
      const backoff = delayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}
