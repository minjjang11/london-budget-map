export function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutP = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeoutP]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
