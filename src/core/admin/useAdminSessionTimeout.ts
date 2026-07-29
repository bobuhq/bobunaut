import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1_000;
const ACTIVITY_THROTTLE_MS = 1_000;
const STORAGE_KEY = "bobu_admin_last_activity";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

export function useAdminSessionTimeout(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): void {
  const navigate = useNavigate();

  useEffect(() => {
    let intervalId: number | null = null;
    let lastActivityWriteAt = 0;
    let signingOut = false;

    async function expireSession() {
      if (signingOut) {
        return;
      }

      signingOut = true;

      try {
        sessionStorage.removeItem(STORAGE_KEY);
        await supabase.auth.signOut();
      } finally {
        navigate(
          "/admin/login?reason=expired",
          {
            replace: true,
          },
        );
      }
    }

    function writeActivity() {
      const now = Date.now();

      if (
        now - lastActivityWriteAt <
        ACTIVITY_THROTTLE_MS
      ) {
        return;
      }

      lastActivityWriteAt = now;

      sessionStorage.setItem(
        STORAGE_KEY,
        String(now),
      );
    }

    function checkExpiration() {
      const storedValue =
        sessionStorage.getItem(STORAGE_KEY);

      const lastActivity = Number(storedValue);

      if (
        !Number.isFinite(lastActivity) ||
        lastActivity <= 0
      ) {
        writeActivity();
        return;
      }

      if (
        Date.now() - lastActivity >=
        timeoutMs
      ) {
        void expireSession();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkExpiration();
      }
    }

    if (!sessionStorage.getItem(STORAGE_KEY)) {
      writeActivity();
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(
        eventName,
        writeActivity,
        {
          passive: true,
        },
      );
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    intervalId = window.setInterval(
      checkExpiration,
      15_000,
    );

    checkExpiration();

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(
          eventName,
          writeActivity,
        );
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [navigate, timeoutMs]);
}
