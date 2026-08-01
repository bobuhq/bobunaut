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

const formatGp = (value: number): string =>
  value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const formatDateTime = (
  value: string | null,
): string => {
  if (!value) {
    return "No claim recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No claim recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
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
): { target: number; label: string } => {
  if (currentStreak < 7) {
    return { target: 7, label: "7 Day Consistency" };
  }

  if (currentStreak < 30) {
    return { target: 30, label: "30 Day Discipline" };
  }

  if (currentStreak < 100) {
    return { target: 100, label: "100 Day Veteran" };
  }

  return {
    target: Math.ceil((currentStreak + 1) / 100) * 100,
    label: "Legendary Streak",
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
    ? "Reward Ready"
    : isActive
      ? "Mining Active"
      : "Ready to Activate";

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
          <span>Current Streak</span>
          <strong>
            {streakLoading ? "—" : `${currentStreak} Days`}
          </strong>
        </article>

        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon">
            <Trophy size={22} />
          </span>
          <span>Best Streak</span>
          <strong>
            {streakLoading ? "—" : `${bestStreak} Days`}
          </strong>
        </article>

        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon is-gp">
            <Gem size={22} />
          </span>
          <span>Lifetime Mined</span>
          <strong>
            {streakLoading ? "—" : `${formatGp(lifetimeGp)} GP`}
          </strong>
        </article>

        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon">
            <CheckCircle2 size={22} />
          </span>
          <span>Claimed Sessions</span>
          <strong>
            {streakLoading
              ? "—"
              : totalSessions.toLocaleString("en-US")}
          </strong>
        </article>
      </div>

      <div className="mining-v4-bottom-grid">
        <article className="mining-v4-panel mining-v4-calendar-panel">
          <div className="mining-v4-panel-heading">
            <div>
              <span>
                <CalendarDays size={15} />
                Verified Activity
              </span>
              <h3>30 Day Mining Calendar</h3>
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
                title={`${day.date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}: ${day.claimed ? "Claimed" : "No claim"}`}
              >
                {day.day}
              </div>
            ))}
          </div>

          <div className="mining-v4-calendar-legend">
            <span><i className="is-claimed" />Claimed</span>
            <span><i className="is-today" />Today</span>
            <span><i />No claim</span>
          </div>
        </article>

        <article className="mining-v4-panel mining-v4-intelligence-panel">
          <div className="mining-v4-panel-heading">
            <div>
              <span>
                <ShieldCheck size={15} />
                BOBU Core
              </span>
              <h3>Mining Intelligence</h3>
            </div>
          </div>

          <div className="mining-v4-intelligence-grid">
            <div>
              <Zap size={17} />
              <span>Mining State<strong>{miningStateLabel}</strong></span>
            </div>

            <div>
              <Network size={17} />
              <span>Network Support<strong>{activeReferralCount} Builders</strong></span>
            </div>

            <div>
              <Gem size={17} />
              <span>Wallet Balance<strong>{formatGp(walletGp)} GP</strong></span>
            </div>

            <div>
              <ShieldCheck size={17} />
              <span>Last Verified Claim<strong>{formatDateTime(streak?.lastClaimedAt ?? null)}</strong></span>
            </div>
          </div>

          <div className="mining-v4-rate-strip">
            <div><span>Base</span><strong>{baseRatePerHour.toFixed(2)} GP/h</strong></div>
            <div><span>Referral</span><strong>+{referralBonusRate.toFixed(2)} GP/h</strong></div>
            <div><span>Total</span><strong>{totalRatePerHour.toFixed(2)} GP/h</strong></div>
          </div>

          <div className="mining-v4-milestone">
            <div>
              <span>Next Milestone</span>
              <strong>{milestone.label}</strong>
            </div>
            <span>{currentStreak}/{milestone.target}</span>
          </div>

          <div className="mining-v4-progress">
            <span style={{ width: `${milestoneProgress}%` }} />
          </div>

          <div className="mining-v4-session-strip">
            <span>Progress {sessionProgress.toFixed(1)}%</span>
            <span>{remainingTimeLabel}</span>
            <span>{formatGp(rewardGp)} GP</span>
          </div>
        </article>
      </div>
    </section>
  );
}
