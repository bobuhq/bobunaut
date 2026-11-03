// Retry only PostgREST's specific transient clock-skew rejection. Never alter
// tokens, relax JWT checks, or retry permission / identity / validation errors.
export async function withXClockSkewRetry<T extends { error: { code?: string; message: string } | null }>(
  operation: () => PromiseLike<T>,
  sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const result = await operation();
    if (attempt >= 2 || result.error?.code !== "PGRST303" ||
      !result.error.message.includes("JWT issued at future")) return result;
    await sleep(1000 * (attempt + 1));
  }
}
