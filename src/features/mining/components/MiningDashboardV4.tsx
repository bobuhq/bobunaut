import {
  CalendarDays,
  CheckCircle2,
  Flame,
  Gem,
  Network,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";

import { useLanguage } from "../../../core/language";

import type {
  MiningHistoryEntry,
} from "../services/MiningHistoryService";
import type {
  MiningStreakSnapshot,
} from "../services/MiningStreakService";

type MiningDashboardV4Props = {
  streak: MiningStreakSnapshot | null;
  streakLoading: boolean;
  streakErrorMessage: string | null;
  historyEntries: MiningHistoryEntry[];
  sessionProgress: number;
  remainingTimeLabel: string;
  isActive: boolean;
  claimable: boolean;
  rewardGp: number;
  baseRatePerHour: number;
  referralBonusRate: number;
  totalRatePerHour: number;
  walletGp: number;
  activeReferralCount: number;
};

type CalendarDay = {
  key: string;
  day: number;
  date: Date;
  claimed: boolean;
  today: boolean;
};

const formatGp = (
  value: number,
  language: string,
): string =>
  value.toLocaleString(language, {
    maximumFractionDigits: 2,
  });

const formatDateTime = (
  value: string | null,
  language: string,
  unavailableLabel: string,
): string => {
  if (!value) {
    return unavailableLabel;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return unavailableLabel;
  }

  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const toUtcDateKey = (value: Date): string =>
  [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");

const createCalendarDays = (
  entries: MiningHistoryEntry[],
): CalendarDay[] => {
  const claimedDays = new Set(
    entries.map((entry) => {
      const source = entry.endsAt ?? entry.createdAt;
      return toUtcDateKey(new Date(source));
    }),
  );

  const today = new Date();
  const days: CalendarDay[] = [];

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - offset,
      ),
    );

    const key = toUtcDateKey(date);

    days.push({
      key,
      day: date.getUTCDate(),
      date,
      claimed: claimedDays.has(key),
      today: key === toUtcDateKey(today),
    });
  }

  return days;
};

const getNextMilestone = (
  currentStreak: number,
): { target: number; labelKey: string } => {
  if (currentStreak < 7) {
    return {
      target: 7,
      labelKey: "mining.dashboard.milestone7",
    };
  }

  if (currentStreak < 30) {
    return {
      target: 30,
      labelKey: "mining.dashboard.milestone30",
    };
  }

  if (currentStreak < 100) {
    return {
      target: 100,
      labelKey: "mining.dashboard.milestone100",
    };
  }

  return {
    target:
      Math.ceil((currentStreak + 1) / 100) * 100,
    labelKey:
      "mining.dashboard.milestoneLegendary",
  };
};

export default function MiningDashboardV4({
  streak,
  streakLoading,
  streakErrorMessage,
  historyEntries,
  sessionProgress,
  remainingTimeLabel,
  isActive,
  claimable,
  rewardGp,
  baseRatePerHour,
  referralBonusRate,
  totalRatePerHour,
  walletGp,
  activeReferralCount,
}: MiningDashboardV4Props) {
  const { language, t } = useLanguage();

  const currentStreak = streak?.currentStreakDays ?? 0;
  const bestStreak = streak?.bestStreakDays ?? 0;
  const totalSessions = streak?.totalClaimedSessions ?? 0;
  const lifetimeGp = streak?.lifetimeMinedGp ?? 0;
  const calendarDays = createCalendarDays(historyEntries);
  const milestone = getNextMilestone(currentStreak);
  const milestoneProgress = Math.min(
    100,
    (currentStreak / Math.max(milestone.target, 1)) * 100,
  );

  const miningStateLabel = claimable
    ? t("mining.status.rewardReady")
    : isActive
      ? t("mining.core.miningActive")
      : t("mining.status.readyToActivate");

  return (
    <section className="mining-v4">
      {streakErrorMessage && (
        <div className="mining-v4-error">
          {streakErrorMessage}
        </div>
      )}

      <div className="mining-v4-stat-grid">
        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon is-fire">
            <Flame size={22} />
          </span>
          <span>{t("mining.dashboard.currentStreak")}</span>
          <strong>
            {streakLoading
              ? "—"
              : t("mining.dashboard.days", {
                  count: currentStreak,
                })}
          </strong>
        </article>

        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon">
            <Trophy size={22} />
          </span>
          <span>{t("mining.dashboard.bestStreak")}</span>
          <strong>
            {streakLoading
              ? "—"
              : t("mining.dashboard.days", {
                  count: bestStreak,
                })}
          </strong>
        </article>

        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon is-gp">
            <Gem size={22} />
          </span>
          <span>{t("mining.dashboard.lifetimeMined")}</span>
          <strong>
            {streakLoading
              ? "—"
              : `${formatGp(lifetimeGp, language)} GP`}
          </strong>
        </article>

        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon">
            <CheckCircle2 size={22} />
          </span>
          <span>{t("mining.dashboard.claimedSessions")}</span>
          <strong>
            {streakLoading
              ? "—"
              : totalSessions.toLocaleString(language)}
          </strong>
        </article>
      </div>

      <div className="mining-v4-bottom-grid">
        <article className="mining-v4-panel mining-v4-calendar-panel">
          <div className="mining-v4-panel-heading">
            <div>
              <span>
                <CalendarDays size={15} />
                {t("mining.dashboard.verifiedActivity")}
              </span>
              <h3>{t("mining.dashboard.calendarTitle")}</h3>
            </div>
          </div>

          <div className="mining-v4-calendar">
            {calendarDays.map((day) => (
              <div
                key={day.key}
                className={[
                  "mining-v4-calendar-day",
                  day.claimed ? "is-claimed" : "",
                  day.today ? "is-today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={`${day.date.toLocaleDateString(
                  language,
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  },
                )}: ${
                  day.claimed
                    ? t("mining.dashboard.claimed")
                    : t("mining.dashboard.noClaim")
                }`}
              >
                {day.day}
              </div>
            ))}
          </div>

          <div className="mining-v4-calendar-legend">
            <span>
              <i className="is-claimed" />
              {t("mining.dashboard.claimed")}
            </span>
            <span>
              <i className="is-today" />
              {t("mining.dashboard.today")}
            </span>
            <span>
              <i />
              {t("mining.dashboard.noClaim")}
            </span>
          </div>
        </article>

        <article className="mining-v4-panel mining-v4-intelligence-panel">
          <div className="mining-v4-panel-heading">
            <div>
              <span>
                <ShieldCheck size={15} />
                {t("mining.dashboard.bobuCore")}
              </span>
              <h3>{t("mining.dashboard.intelligenceTitle")}</h3>
            </div>
          </div>

          <div className="mining-v4-intelligence-grid">
            <div>
              <Zap size={17} />
              <span>
                {t("mining.dashboard.miningState")}
                <strong>{miningStateLabel}</strong>
              </span>
            </div>

            <div>
              <Network size={17} />
              <span>
                {t("mining.dashboard.networkSupport")}
                <strong>
                  {t("mining.dashboard.builders", {
                    count: activeReferralCount,
                  })}
                </strong>
              </span>
            </div>

            <div>
              <Gem size={17} />
              <span>
                {t("mining.dashboard.walletBalance")}
                <strong>
                  {formatGp(walletGp, language)} GP
                </strong>
              </span>
            </div>

            <div>
              <ShieldCheck size={17} />
              <span>
                {t("mining.dashboard.lastVerifiedClaim")}
                <strong>
                  {formatDateTime(
                    streak?.lastClaimedAt ?? null,
                    language,
                    t("mining.dashboard.noClaimRecorded"),
                  )}
                </strong>
              </span>
            </div>
          </div>

          <div className="mining-v4-rate-strip">
            <div>
              <span>{t("mining.dashboard.base")}</span>
              <strong>{baseRatePerHour.toFixed(2)} GP/h</strong>
            </div>
            <div>
              <span>{t("mining.dashboard.referral")}</span>
              <strong>
                +{referralBonusRate.toFixed(0)} GP
              </strong>
            </div>
            <div>
              <span>{t("mining.dashboard.total")}</span>
              <strong>{totalRatePerHour.toFixed(2)} GP/h</strong>
            </div>
          </div>

          <div className="mining-v4-milestone">
            <div>
              <span>{t("mining.dashboard.nextMilestone")}</span>
              <strong>{t(milestone.labelKey)}</strong>
            </div>
            <span>{currentStreak}/{milestone.target}</span>
          </div>

          <div className="mining-v4-progress">
            <span style={{ width: `${milestoneProgress}%` }} />
          </div>

          <div className="mining-v4-session-strip">
            <span>
              {t("mining.dashboard.progress", {
                value: sessionProgress.toFixed(1),
              })}
            </span>
            <span>{remainingTimeLabel}</span>
            <span>
              {formatGp(rewardGp, language)} GP
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
