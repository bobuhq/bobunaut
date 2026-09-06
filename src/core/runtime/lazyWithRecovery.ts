import {
  lazy,
  type ComponentType,
  type LazyExoticComponent,
} from "react";

const LAZY_RECOVERY_KEY = "bobu:lazy-chunk-recovery-at";
const RECOVERY_WINDOW_MS = 30_000;

const reloadWithCacheBust = () => {
  const now = Date.now();
  const previousRecovery = Number(
    sessionStorage.getItem(LAZY_RECOVERY_KEY) ?? "0",
  );

  if (
    Number.isFinite(previousRecovery) &&
    previousRecovery > 0 &&
    now - previousRecovery < RECOVERY_WINDOW_MS
  ) {
    return false;
  }

  sessionStorage.setItem(
    LAZY_RECOVERY_KEY,
    String(now),
  );

  const url = new URL(window.location.href);

  url.searchParams.set(
    "__bobu_reload",
    String(now),
  );

  window.location.replace(
    url.toString(),
  );

  return true;
};

export function lazyWithRecovery<
  T extends ComponentType<any>,
>(
  loader: () => Promise<{
    default: T;
  }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const loadedModule = await loader();

      sessionStorage.removeItem(
        LAZY_RECOVERY_KEY,
      );

      return loadedModule;
    } catch (error) {
      const reloadStarted =
        reloadWithCacheBust();

      if (reloadStarted) {
        /*
         * Keep React Suspense pending while the browser
         * navigates to the fresh deployment.
         */
        return await new Promise<never>(
          () => undefined,
        );
      }

      throw error;
    }
  });
}
