import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { supabase } from "../../lib/supabase";
import { builderStore } from "../../store/builderStore";

import { useAuthSession } from "../auth/useAuthSession";
import {
  attributePendingBuilderInvite,
  restoreAuthenticatedBuilder,
  savePendingBuilderInviteCode,
} from "../builder";
import { coreEngine } from "../engine";
import {
  achievementRepository,
} from "../game/repository/AchievementRepository";
import {
  missionRepository,
} from "../game/repository/MissionRepository";
import {
  achievementProgressRestoreService,
} from "../game/services/AchievementProgressRestoreService";
import {
  missionProgressRestoreService,
} from "../game/services/MissionProgressRestoreService";
import {
  preferencesService,
  preferencesStore,
} from "../preferences";

interface ApplicationBootstrapProps {
  children: ReactNode;
}

/**
 * Coordinates authenticated application restore.
 *
 * Security and consistency guarantees:
 *
 * - Previous Builder state is removed immediately on session change.
 * - Only the latest bootstrap generation may start Core Engine.
 * - Delayed queries cannot publish progress for a different session.
 * - Builder restore is mandatory; optional module failures are isolated.
 * - Logout clears all authenticated in-memory state.
 */
export function ApplicationBootstrap({
  children,
}: ApplicationBootstrapProps) {
  const { session, loading } = useAuthSession();
  const builderId = session?.user.id;

  const bootstrapGeneration = useRef(0);

  useEffect(() => {
    const generation =
      ++bootstrapGeneration.current;

    let cancelled = false;

    const isCurrentGeneration = (): boolean =>
      !cancelled &&
      bootstrapGeneration.current === generation;

    /*
     * Stop event processing and remove the previous authenticated
     * Builder immediately. This prevents account A data from being
     * rendered while account B is restoring.
     */
    coreEngine.stop();

    builderStore.reset();
    preferencesStore.beginRestore();
    missionRepository.reset();
    achievementRepository.reset();

    /*
     * Capture the canonical referral URL before authentication.
     *
     * Example:
     * https://bobunaut.com/?ref=BOBU-A1B2C3
     *
     * The invite remains session-scoped until an authenticated
     * Builder can be attributed by the server-side RPC.
     */
    const referralUrl = new URL(window.location.href);
    const referralCode =
      referralUrl.searchParams.get("ref");

    if (referralCode) {
      savePendingBuilderInviteCode(referralCode);

      /*
       * Consume only the referral query parameter so it cannot
       * be captured repeatedly after attribution/session changes.
       * Preserve OAuth and any unrelated query parameters.
       */
      referralUrl.searchParams.delete("ref");

      window.history.replaceState(
        {},
        document.title,
        `${referralUrl.pathname}${referralUrl.search}${referralUrl.hash}`,
      );
    }

    if (loading || !builderId) {
      return () => {
        cancelled = true;
      };
    }

    const bootstrapApplication =
      async (): Promise<void> => {
        try {
          /*
           * Referral attribution must finish before Builder restore,
           * otherwise the restored network snapshot may be stale.
           */
          await attributePendingBuilderInvite();
        } catch (error) {
          console.error(
            "Builder invite attribution failed:",
            error,
          );
        }

        if (!isCurrentGeneration()) {
          return;
        }

        const [
          builderRestore,
          preferencesRestore,
        ] = await Promise.allSettled([
          restoreAuthenticatedBuilder(builderId),
          preferencesService.restore(builderId),
        ]);

        if (!isCurrentGeneration()) {
          return;
        }

        /*
         * Builder restore is the mandatory Core dependency.
         * Do not start engines with an absent or failed identity.
         */
        if (
          builderRestore.status === "rejected" ||
          builderRestore.value === null
        ) {
          console.error(
            "Authenticated Builder restore failed:",
            builderRestore.status === "rejected"
              ? builderRestore.reason
              : "Authenticated session changed during restore.",
          );

          builderStore.reset();
          return;
        }

        if (
          preferencesRestore.status === "rejected"
        ) {
          console.error(
            "Authenticated preferences restore failed:",
            preferencesRestore.reason,
          );
        }

        const [
          missionRestore,
          achievementRestore,
        ] = await Promise.allSettled([
          missionProgressRestoreService.restore(
            builderId,
          ),
          achievementProgressRestoreService.restore(
            builderId,
          ),
        ]);

        if (!isCurrentGeneration()) {
          return;
        }

        if (missionRestore.status === "rejected") {
          console.error(
            "Mission progress restore failed:",
            missionRestore.reason,
          );
        }

        if (
          achievementRestore.status === "rejected"
        ) {
          console.error(
            "Achievement progress restore failed:",
            achievementRestore.reason,
          );
        }

        /*
         * Verify the active authenticated owner one final time before
         * enabling GP, network and game event processing.
         */
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (
          !isCurrentGeneration() ||
          currentSession?.user.id !== builderId
        ) {
          return;
        }

        coreEngine.start();
      };

    void bootstrapApplication();

    return () => {
      cancelled = true;
    };
  }, [loading, builderId]);

  return children;
}
