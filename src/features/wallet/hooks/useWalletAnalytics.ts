import { useMemo } from "react";

import type { BuilderWalletEntry } from "../../../core/builder";

export type WalletAnalyticsPeriod = 7 | 30;

export type WalletAnalyticsDay = {
  date: string;
  label: string;
  earnedGp: number;
  spentGp: number;
  netGp: number;
};

export type WalletAnalyticsSnapshot = {
  period: WalletAnalyticsPeriod;
  todayGp: number;
  periodEarnedGp: number;
  periodSpentGp: number;
  netChangeGp: number;
  dailyAverageGp: number;
  bestDayGp: number;
  activeDays: number;
  days: WalletAnalyticsDay[];
};

const getDateKey = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const createPeriodDays = (
  period: WalletAnalyticsPeriod,
): WalletAnalyticsDay[] => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  return Array.from({ length: period }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (period - 1 - index));

    return {
      date: getDateKey(date),
      label: formatter.format(date),
      earnedGp: 0,
      spentGp: 0,
      netGp: 0,
    };
  });
};

export function useWalletAnalytics(
  ledger: BuilderWalletEntry[],
  period: WalletAnalyticsPeriod,
): WalletAnalyticsSnapshot {
  return useMemo(() => {
    const days = createPeriodDays(period);
    const dayMap = new Map(
      days.map((day) => [day.date, day]),
    );

    for (const entry of ledger) {
      const entryDate = new Date(entry.createdAt);

      if (Number.isNaN(entryDate.getTime())) {
        continue;
      }

      const day = dayMap.get(getDateKey(entryDate));

      if (!day) {
        continue;
      }

      if (entry.type === "credit") {
        day.earnedGp += entry.amount;
      } else {
        day.spentGp += entry.amount;
      }

      day.netGp = day.earnedGp - day.spentGp;
    }

    const periodEarnedGp = days.reduce(
      (total, day) => total + day.earnedGp,
      0,
    );

    const periodSpentGp = days.reduce(
      (total, day) => total + day.spentGp,
      0,
    );

    const activeDays = days.filter(
      (day) => day.earnedGp > 0 || day.spentGp > 0,
    ).length;

    const bestDayGp = Math.max(
      0,
      ...days.map((day) => day.netGp),
    );

    return {
      period,
      todayGp: days.at(-1)?.netGp ?? 0,
      periodEarnedGp,
      periodSpentGp,
      netChangeGp: periodEarnedGp - periodSpentGp,
      dailyAverageGp:
        activeDays > 0
          ? Math.round(periodEarnedGp / activeDays)
          : 0,
      bestDayGp,
      activeDays,
      days,
    };
  }, [ledger, period]);
}
