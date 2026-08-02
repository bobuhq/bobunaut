import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Clock3,
  Sparkles,
} from "lucide-react";

import MiningCore from "./components/MiningCore";
import MiningDashboardV4 from "./components/MiningDashboardV4";
import MiningHero from "./components/MiningHero";
import "./MiningLaunchV7.css";

import { useBuilderStore } from "../identity/hooks/useBuilderStore";
import { useLanguage } from "../../core/language";
import { useBuilderMiningSession } from "./hooks/useBuilderMiningSession";
import { useMiningStreak } from "./hooks/useMiningStreak";
import {
  miningHistoryService,
  type MiningHistoryEntry,
} from "./services/MiningHistoryService";

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000),
  );

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

const formatGp = (
  value: number,
  language: string,
): string =>
  value.toLocaleString(language, {
    maximumFractionDigits: 2,
  });

export default function BuilderMining() {
  const { language, t } = useLanguage();
  const builder = useBuilderStore();

  const [historyEntries, setHistoryEntries] =
    useState<MiningHistoryEntry[]>([]);

  const {
    miningState,
    busy,
    loading,
    errorMessage,
    showActivation,
    remainingTime,
    sessionProgress,
    sessionEarnedGp,
    isActive,
    claimable,
    handleMiningAction,
  } = useBuilderMiningSession();

  const loadMiningHistory = useCallback(
    async (): Promise<void> => {
      const builderId = builder.id.trim();

      if (!builderId || builderId === "builder-001") {
        setHistoryEntries([]);
        return;
      }

      try {
        const entries = await miningHistoryService.load(
          builderId,
          30,
        );

        setHistoryEntries(entries);
      } catch (error) {
        console.error(
          "Mining calendar data could not be loaded:",
          error,
        );
        setHistoryEntries([]);
      }
    },
    [builder.id],
  );

  useEffect(() => {
    void loadMiningHistory();
  }, [loadMiningHistory]);

  useEffect(() => {
    if (showActivation) {
      void loadMiningHistory();
    }
  }, [showActivation, loadMiningHistory]);

  const {
    streak,
    loading: streakLoading,
    errorMessage: streakErrorMessage,
  } = useMiningStreak(showActivation);

  const activeReferralCount = Math.min(
    Math.max(miningState?.activeReferralCount ?? 0, 0),
    25,
  );

  const remainingTimeLabel = formatRemaining(
    remainingTime,
  );

  const sessionStatus = claimable
    ? t("mining.status.readyToClaim")
    : isActive
      ? t("mining.status.active")
      : t("mining.status.inactive");

  return (
    <section className="mining-page mining-launch-v7">
      <MiningHero />

      <div className="mining-primary-grid">
        <MiningCore
          isActive={isActive}
          claimable={claimable}
          busy={busy || loading}
          remainingTime={remainingTimeLabel}
          sessionProgress={sessionProgress}
          sessionEarnedGp={sessionEarnedGp}
          onAction={handleMiningAction}
        />

        <aside className="mining-session-panel">
          <div className="mining-panel-heading">
            <div>
              <span className="mining-panel-kicker">
                {t("mining.session.kicker")}
              </span>
              <h2>{t("mining.session.title")}</h2>
            </div>

            <span
              className={`mining-live-dot ${
                isActive || claimable ? "is-active" : ""
              }`}
            />
          </div>

          <p className="mining-session-copy">
            {errorMessage
              ? errorMessage
              : claimable
                ? t("mining.session.claimableDescription")
                : isActive
                  ? t("mining.session.activeDescription", {
                      count: activeReferralCount,
                      builderLabel:
                        activeReferralCount === 1
                          ? t("mining.session.builderSingular")
                          : t("mining.session.builderPlural"),
                    })
                  : t("mining.session.inactiveDescription")}
          </p>

          <div className="mining-session-countdown">
            <Clock3 size={18} />
            <span>
              {loading
                ? t("mining.session.synchronizing")
                : claimable
                  ? t("mining.session.rewardReady")
                  : isActive
                    ? t("mining.session.remaining", {
                        time: remainingTimeLabel,
                      })
                    : t("mining.session.readyForActivation")}
            </span>
          </div>

          <div className="mining-session-facts">
            <div>
              <span>{t("mining.session.status")}</span>
              <strong>{sessionStatus}</strong>
            </div>

            <div>
              <span>{t("mining.session.activeBuilders")}</span>
              <strong>{activeReferralCount}</strong>
            </div>

            <div>
              <span>{t("mining.session.baseRate")}</span>
              <strong>
                {(miningState?.baseRatePerHour ?? 0).toFixed(2)} GP/h
              </strong>
            </div>

            <div>
              <span>{t("mining.session.referralBonus")}</span>
              <strong>
                +{(miningState?.referralBonusRate ?? 0).toFixed(2)} GP/h
              </strong>
            </div>

            <div>
              <span>{t("mining.session.sessionReward")}</span>
              <strong>
                {formatGp(miningState?.rewardGp ?? 0, language)} GP
              </strong>
            </div>

            <div>
              <span>{t("mining.session.walletGp")}</span>
              <strong>
                {formatGp(miningState?.walletGp ?? 0, language)}
              </strong>
            </div>
          </div>

          <div className="mining-session-verification">
            <span />
            {t("mining.session.serverVerified")}
          </div>
        </aside>
      </div>

      <MiningDashboardV4
        streak={streak}
        streakLoading={streakLoading}
        streakErrorMessage={streakErrorMessage}
        historyEntries={historyEntries}
        sessionProgress={sessionProgress}
        remainingTimeLabel={remainingTimeLabel}
        isActive={isActive}
        claimable={claimable}
        rewardGp={miningState?.rewardGp ?? 0}
        baseRatePerHour={
          miningState?.baseRatePerHour ?? 0
        }
        referralBonusRate={
          miningState?.referralBonusRate ?? 0
        }
        totalRatePerHour={
          miningState?.totalRatePerHour ?? 0
        }
        walletGp={miningState?.walletGp ?? 0}
        activeReferralCount={activeReferralCount}
      />

      {showActivation && (
        <div className="mining-activation">
          <div className="mining-activation-card">
            <div className="mining-activation-orb">
              <Sparkles size={46} />
            </div>

            <h2>
              {claimable
                ? t("mining.activation.claimedTitle")
                : t("mining.activation.activatedTitle")}
            </h2>

            <p>
              {claimable
                ? t("mining.activation.claimedDescription")
                : t("mining.activation.activatedDescription")}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
