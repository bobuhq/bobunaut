import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Gem,
  Orbit,
  RadioTower,
  ShieldCheck,
  Sparkles,
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
  sessionId: string | null;
  serverNow: string | null;
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const toUtcDateKey = (value: Date): string =>
  [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(
      2,
      "0",
    ),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");

const createCalendarDays = (
  entries: MiningHistoryEntry[],
): CalendarDay[] => {
  const claimedDays = new Set(
    entries.map((entry) => {
      const source =
        entry.endsAt ?? entry.createdAt;

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
      today:
        key === toUtcDateKey(today),
    });
  }

  return days;
};

const getNextMilestone = (
  currentStreak: number,
): {
  target: number;
  label: string;
} => {
  if (currentStreak < 7) {
    return {
      target: 7,
      label: "7 Day Consistency",
    };
  }

  if (currentStreak < 30) {
    return {
      target: 30,
      label: "30 Day Mining Discipline",
    };
  }

  if (currentStreak < 100) {
    return {
      target: 100,
      label: "100 Day Mining Veteran",
    };
  }

  return {
    target:
      Math.ceil((currentStreak + 1) / 100) *
      100,
    label: "Legendary Mining Streak",
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
  sessionId,
  serverNow,
  activeReferralCount,
}: MiningDashboardV4Props) {
  const currentStreak =
    streak?.currentStreakDays ?? 0;

  const bestStreak =
    streak?.bestStreakDays ?? 0;

  const totalSessions =
    streak?.totalClaimedSessions ?? 0;

  const lifetimeGp =
    streak?.lifetimeMinedGp ?? 0;

  const calendarDays =
    createCalendarDays(historyEntries);

  const nextMilestone =
    getNextMilestone(currentStreak);

  const milestoneProgress = Math.min(
    100,
    (
      currentStreak /
      Math.max(nextMilestone.target, 1)
    ) *
      100,
  );

  const milestoneDaysRemaining = Math.max(
    0,
    nextMilestone.target - currentStreak,
  );

  const sessionStatus = claimable
    ? "Ready to Claim"
    : isActive
      ? "Mining Active"
      : "Ready to Activate";

  const intelligenceMessage = claimable
    ? "Your verified session is complete. Claim the reward to update Personal GP and mining history."
    : isActive
      ? `Your mining network is online with ${activeReferralCount} active Builder${
          activeReferralCount === 1 ? "" : "s"
        } supporting the current rate.`
      : "Activate a new server-verified 24-hour session to continue building your mining consistency.";

  const quote =
    currentStreak >= 30
      ? "Civilizations are built by Builders who return every day."
      : currentStreak >= 7
        ? "Consistency transforms activity into reputation."
        : "The universe rewards consistency, not luck.";

  return (
    <section className="mining-v4">
      <div className="mining-v4-heading">
        <div>
          <span className="mining-v4-eyebrow">
            <Sparkles size={15} />
            Server-Authoritative Intelligence
          </span>

          <h2>Mining Command Center</h2>

          <p>
            Live session, streak and lifetime mining
            intelligence verified by BOBU Core.
          </p>
        </div>

        <span
          className={`mining-v4-live-status ${
            isActive || claimable
              ? "is-online"
              : ""
          }`}
        >
          <RadioTower size={14} />
          {sessionStatus}
        </span>
      </div>

      {streakErrorMessage && (
        <div className="mining-v4-error">
          {streakErrorMessage}
        </div>
      )}

      <div className="mining-v4-stat-grid">
        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon is-fire">
            <Flame size={21} />
          </span>

          <span>Current Streak</span>

          <strong>
            {streakLoading
              ? "—"
              : `${currentStreak} Days`}
          </strong>

          <small>
            {streak?.streakActiveToday
              ? "Protected today"
              : "Complete today's session"}
          </small>
        </article>

        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon">
            <Trophy size={21} />
          </span>

          <span>Best Streak</span>

          <strong>
            {streakLoading
              ? "—"
              : `${bestStreak} Days`}
          </strong>

          <small>Verified lifetime record</small>
        </article>

        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon is-gp">
            <Gem size={21} />
          </span>

          <span>Lifetime Mined</span>

          <strong>
            {streakLoading
              ? "—"
              : `${formatGp(lifetimeGp)} GP`}
          </strong>

          <small>Claimed mining rewards</small>
        </article>

        <article className="mining-v4-stat">
          <span className="mining-v4-stat-icon">
            <CheckCircle2 size={21} />
          </span>

          <span>Claimed Sessions</span>

          <strong>
            {streakLoading
              ? "—"
              : totalSessions.toLocaleString(
                  "en-US",
                )}
          </strong>

          <small>Server-verified completions</small>
        </article>
      </div>

      <div className="mining-v4-main-grid">
        <article className="mining-v4-panel">
          <div className="mining-v4-panel-heading">
            <div>
              <span>
                <Activity size={15} />
                Session Intelligence
              </span>

              <h3>{sessionStatus}</h3>
            </div>

            <ShieldCheck size={22} />
          </div>

          <p>{intelligenceMessage}</p>

          <div className="mining-v4-session-facts">
            <div>
              <span>Progress</span>
              <strong>
                {sessionProgress.toFixed(2)}%
              </strong>
            </div>

            <div>
              <span>Time Remaining</span>
              <strong>{remainingTimeLabel}</strong>
            </div>

            <div>
              <span>Session Reward</span>
              <strong>{formatGp(rewardGp)} GP</strong>
            </div>

            <div>
              <span>Base Rate</span>
              <strong>
                {baseRatePerHour.toFixed(2)} GP/h
              </strong>
            </div>

            <div>
              <span>Referral Bonus</span>
              <strong>
                +{referralBonusRate.toFixed(2)} GP/h
              </strong>
            </div>

            <div>
              <span>Total Rate</span>
              <strong>
                {totalRatePerHour.toFixed(2)} GP/h
              </strong>
            </div>
          </div>

          <div className="mining-v4-progress">
            <span
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, sessionProgress),
                )}%`,
              }}
            />
          </div>
        </article>

        <article className="mining-v4-panel mining-v4-milestone">
          <div className="mining-v4-panel-heading">
            <div>
              <span>
                <Orbit size={15} />
                Next Milestone
              </span>

              <h3>{nextMilestone.label}</h3>
            </div>

            <Zap size={22} />
          </div>

          <div className="mining-v4-milestone-value">
            <strong>{currentStreak}</strong>
            <span>/ {nextMilestone.target} days</span>
          </div>

          <div className="mining-v4-progress">
            <span
              style={{
                width: `${milestoneProgress}%`,
              }}
            />
          </div>

          <p>
            {milestoneDaysRemaining > 0
              ? `${milestoneDaysRemaining} consecutive claimed day${
                  milestoneDaysRemaining === 1
                    ? ""
                    : "s"
                } remaining to reach this milestone.`
              : "Milestone reached. Continue mining to advance toward the next consistency record."}
          </p>
        </article>
      </div>

      <div className="mining-v4-main-grid">
        <article className="mining-v4-panel">
          <div className="mining-v4-panel-heading">
            <div>
              <span>
                <CalendarDays size={15} />
                30 Day Activity
              </span>

              <h3>Mining Calendar</h3>
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
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  },
                )}: ${
                  day.claimed
                    ? "Claimed"
                    : "No claimed session"
                }`}
              >
                <span>{day.day}</span>
              </div>
            ))}
          </div>

          <div className="mining-v4-calendar-legend">
            <span>
              <i className="is-claimed" />
              Claimed
            </span>

            <span>
              <i className="is-today" />
              Today
            </span>

            <span>
              <i />
              No claim
            </span>
          </div>
        </article>

        <article className="mining-v4-panel">
          <div className="mining-v4-panel-heading">
            <div>
              <span>
                <Clock3 size={15} />
                Lifetime Signal
              </span>

              <h3>Mining Intelligence</h3>
            </div>
          </div>

          <div className="mining-v4-command-meta">
            <div>
              <span>Session ID</span>
              <strong title={sessionId ?? undefined}>
                {sessionId
                  ? sessionId.length > 20
                    ? `${sessionId.slice(
                        0,
                        9,
                      )}…${sessionId.slice(-7)}`
                    : sessionId
                  : "No active session"}
              </strong>
            </div>

            <div>
              <span>Wallet Balance</span>
              <strong>
                {formatGp(walletGp)} GP
              </strong>
            </div>

            <div>
              <span>Server Time</span>
              <strong>
                {formatDateTime(serverNow)}
              </strong>
            </div>
          </div>

          <div className="mining-v4-intelligence-list">
            <div>
              <CheckCircle2 size={17} />

              <span>
                Last verified claim
                <strong>
                  {formatDateTime(
                    streak?.lastClaimedAt ?? null,
                  )}
                </strong>
              </span>
            </div>

            <div>
              <ShieldCheck size={17} />

              <span>
                Streak status
                <strong>
                  {streak?.streakActiveToday
                    ? "Protected today"
                    : "Awaiting today's claim"}
                </strong>
              </span>
            </div>

            <div>
              <Orbit size={17} />

              <span>
                Active network support
                <strong>
                  {activeReferralCount} Builders
                </strong>
              </span>
            </div>
          </div>

          <blockquote>
            “{quote}”
          </blockquote>
        </article>
      </div>
    </section>
  );
}
