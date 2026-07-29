import {
  useEffect,
  type ReactNode,
} from "react";

import { useAuthSession } from "../auth/useAuthSession";
import {
  attributePendingBuilderInvite,
  restoreAuthenticatedBuilder,
} from "../builder";
import { preferencesService } from "../preferences";
import { builderStore } from "../../store/builderStore";

interface ApplicationBootstrapProps {
  children: ReactNode;
}

/**
 * Coordinates application-level restore and reset operations.
 *
 * This component is intentionally independent from the UI.
 * Web and future mobile clients can follow the same bootstrap flow:
 *
 * 1. Resolve authenticated session.
 * 2. Attribute a pending Builder invitation.
 * 3. Restore Builder and Preferences state.
 * 4. Reset all client stores after logout.
 */
export function ApplicationBootstrap({
  children,
}: ApplicationBootstrapProps) {
  const { session, loading } = useAuthSession();
  const builderId = session?.user.id;

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!builderId) {
      builderStore.reset();
      preferencesService.reset();
      return;
    }

    let cancelled = false;

    const bootstrapApplication =
      async (): Promise<void> => {
        try {
          /*
           * Invitation attribution must complete before the
           * Builder snapshot is loaded. Otherwise referral data
           * restored immediately afterward could be stale.
           */
          await attributePendingBuilderInvite();
        } catch (error) {
          console.error(
            "Builder invite attribution failed:",
            error,
          );
        }

        if (cancelled) {
          return;
        }

        const restoreResults =
          await Promise.allSettled([
            restoreAuthenticatedBuilder(builderId),
            preferencesService.restore(builderId),
          ]);

        if (cancelled) {
          return;
        }

        const [
          builderRestore,
          preferencesRestore,
        ] = restoreResults;

        if (builderRestore.status === "rejected") {
          console.error(
            "Authenticated Builder restore failed:",
            builderRestore.reason,
          );
        }

        if (
          preferencesRestore.status === "rejected"
        ) {
          console.error(
            "Authenticated preferences restore failed:",
            preferencesRestore.reason,
          );
        }
      };

    void bootstrapApplication();

    return () => {
      cancelled = true;
    };
  }, [loading, builderId]);

  return children;
}
