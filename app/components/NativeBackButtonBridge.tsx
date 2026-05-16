"use client";

import { useEffect, useRef } from "react";
import { syncCapacitorNativePlatform } from "@/lib/site/getSupabaseOAuthRedirectTo";

/**
 * Android hardware back: delegate to app UI stack (tabs, sheets, modals).
 * Returning `true` means the event was handled; root map does not exit the app.
 */
export function NativeBackButtonBridge({ onBack }: { onBack: () => boolean }) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!syncCapacitorNativePlatform()) return;
    const platform = (
      window as unknown as { Capacitor?: { getPlatform?: () => string } }
    ).Capacitor?.getPlatform?.();
    if (platform !== "android") return;

    let handle: { remove: () => Promise<void> } | undefined;

    void (async () => {
      const { App } = await import("@capacitor/app");
      handle = await App.addListener("backButton", () => {
        onBackRef.current();
      });
    })();

    return () => {
      void handle?.remove();
    };
  }, []);

  return null;
}
