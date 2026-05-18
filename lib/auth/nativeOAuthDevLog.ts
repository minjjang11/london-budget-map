/** Dev-only native OAuth logs (Xcode console). Set NEXT_PUBLIC_AUTH_DEBUG=1 for release simulator builds. */
export function nativeOAuthDevLog(...args: unknown[]): void {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_AUTH_DEBUG?.trim() !== "1"
  ) {
    return;
  }
  console.log("[auth:native-oauth]", ...args);
}

export function redactOAuthUrlForLog(rawUrl: string): string {
  return rawUrl
    .replace(/code=[^&#]+/gi, "code=[redacted]")
    .replace(/access_token=[^&#]+/gi, "access_token=[redacted]")
    .replace(/refresh_token=[^&#]+/gi, "refresh_token=[redacted]");
}
