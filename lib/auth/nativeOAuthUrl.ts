import { NATIVE_OAUTH_REDIRECT } from "@/lib/site/oauthRedirects";

export type NativeOAuthUrlMeta = {
  isMaimomapScheme: boolean;
  isAuthCallbackPath: boolean;
  hasCode: boolean;
  hasAccessToken: boolean;
  hasError: boolean;
  errorMessage: string | null;
};

export function parseNativeOAuthUrlMeta(rawUrl: string): NativeOAuthUrlMeta {
  const lower = rawUrl.toLowerCase();
  const isMaimomapScheme = lower.includes("maimomap://");
  const isAuthCallbackPath = /auth\/callback/i.test(rawUrl);

  let hasCode = false;
  let hasAccessToken = false;
  let hasError = false;
  let errorMessage: string | null = null;

  try {
    const q = rawUrl.indexOf("?");
    const h = rawUrl.indexOf("#");
    const params = new URLSearchParams();
    if (q >= 0) {
      const end = h > q ? h : rawUrl.length;
      new URLSearchParams(rawUrl.slice(q + 1, end)).forEach((v, k) => params.set(k, v));
    }
    if (h >= 0) {
      new URLSearchParams(rawUrl.slice(h + 1)).forEach((v, k) => params.set(k, v));
    }
    hasCode = params.has("code");
    hasAccessToken = params.has("access_token");
    hasError = params.has("error") || params.has("error_description");
    errorMessage = params.get("error_description") ?? params.get("error");
  } catch {
    hasCode = /[?&#]code=/.test(rawUrl);
    hasAccessToken = /[?&#]access_token=/.test(rawUrl);
    hasError = /[?&#]error=/.test(rawUrl);
  }

  return {
    isMaimomapScheme,
    isAuthCallbackPath,
    hasCode,
    hasAccessToken,
    hasError,
    errorMessage,
  };
}

/** True for `maimomap://auth/callback` returns with OAuth params (or OAuth errors). */
export function isNativeOAuthReturnUrl(url: string): boolean {
  const meta = parseNativeOAuthUrlMeta(url);
  if (!meta.isMaimomapScheme) return false;
  if (meta.hasCode || meta.hasAccessToken || meta.hasError) return true;
  return meta.isAuthCallbackPath && url.startsWith(NATIVE_OAUTH_REDIRECT);
}
