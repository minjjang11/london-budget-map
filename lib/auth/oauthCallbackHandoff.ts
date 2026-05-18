/**
 * Do not redirect mobile browsers to maimomap:// — that only works from the native app.
 * Web OAuth completes on /map or /auth/callback via PKCE in the same browser tab.
 */
export function shouldHandOffWebCallbackToNativeApp(): boolean {
  return false;
}
