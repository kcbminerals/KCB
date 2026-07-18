"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Interval between background refreshes while the app stays open. */
const REFRESH_EVERY_MS = 2 * 60 * 1000;
/** Don't hammer the server when focus/visibility events fire in bursts. */
const MIN_GAP_MS = 10 * 1000;

/**
 * Keeps the data on screen fresh without manual reloading: re-fetches from
 * the server whenever the app is brought back to the foreground (phone
 * unlocked, tab re-opened) and every couple of minutes while it stays open.
 */
export default function AutoRefresh() {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    // The initial render itself is fresh.
    if (lastRefresh.current === 0) lastRefresh.current = Date.now();
    const refresh = () => {
      if (Date.now() - lastRefresh.current < MIN_GAP_MS) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_EVERY_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
