"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Scrollable shell: scrollbar thumb only visible briefly while the user scrolls. */
export function LegalDocLayout({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const bumpScrollIndicator = useCallback(() => {
    setActive(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setActive(false), 900);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <main
      onScroll={bumpScrollIndicator}
      className={`budget-legal-scroll h-dvh w-full overflow-y-auto bg-budget-white text-budget-text ${
        active ? "budget-legal-scroll--active" : ""
      }`}
    >
      {children}
    </main>
  );
}
