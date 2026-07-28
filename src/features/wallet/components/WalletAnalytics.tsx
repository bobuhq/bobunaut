import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  Flame,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { BuilderWalletEntry } from "../../../core/builder";
import {
  type WalletAnalyticsPeriod,
  useWalletAnalytics,
} from "../hooks/useWalletAnalytics";

type WalletAnalyticsProps = {
  ledger: BuilderWalletEntry[];
  formatGp: (value: number) => string;
};

const chartWidth = 720;
const chartHeight = 190;
const chartPadding = 18;

export function WalletAnalytics({
  ledger,
  formatGp,
}: WalletAnalyticsProps) {
  const [period, setPeriod] =
    useState<WalletAnalyticsPeriod>(7);

  const analytics = useWalletAnalytics(ledger, period);

  const chart = useMemo(() => {
    const values = analytics.days.map((day) =>
      Math.max(0, day.netGp),
    );

    const maximum = Math.max(1, ...values);
    const usableWidth = chartWidth - chartPadding * 2;
    const usableHeight = chartHeight - chartPadding * 2;

    const points = values.map((value, index) => {
      const x =
        chartPadding +
        (index / Math.max(1, values.length - 1)) *
          usableWidth;

      const y =
        chartHeight -
        chartPadding -
        (value / maximum) * usableHeight;

      return { x, y, value };
    });

    const line = points
      .map((point) => `${point.x},${point.y}`)
      .join(" ");

    const area =
      points.length > 0
        ? [
            `${points[0].x},${chartHeight - chartPadding}`,
            ...points.map(
              (point) => `${point.x},${point.y}`,
            ),
            `${
              points[points.length - 1].x
            },${chartHeight - chartPadding}`,
          ].join(" ")
        : "";

    return { points, line, area };
  }, [analytics.days]);

  const formatSignedGp = (value: number): string =>
    `${value >= 0 ? "+" : "-"}${formatGp(
      Math.abs(value),
    )} GP`;

  return (
    <section className="builder-wallet-analytics">
      <div className="builder-wallet-analytics-heading">
        <div>
          <span className="builder-wallet-analytics-label">
            GP INTELLIGENCE
          </span>
          <h2>Wallet Command Center</h2>
          <p>
            Live performance calculated from your secured GP
            ledger.
          </p>
        </div>

        <div
          className="builder-wallet-period-switch"
          aria-label="Analytics period"
        >
          {[7, 30].map((value) => (
            <button
              key={value}
              type="button"
              className={
                period === value
                  ? "builder-wallet-period-button builder-wallet-period-button--active"
                  : "builder-wallet-period-button"
              }
              onClick={() =>
                setPeriod(value as WalletAnalyticsPeriod)
              }
            >
              {value} Days
            </button>
          ))}
        </div>
      </div>

      <div className="builder-wallet-analytics-grid">
        <div className="builder-wallet-chart-panel">
          <div className="builder-wallet-chart-summary">
            <div>
              <span>Net GP Change</span>
              <strong>
                {formatSignedGp(analytics.netChangeGp)}
              </strong>
            </div>

            <div className="builder-wallet-chart-trend">
              <TrendingUp size={16} />
              Ledger synchronized
            </div>
          </div>

          <div className="builder-wallet-chart">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label={`${period}-day GP performance chart`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="builder-wallet-chart-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="rgba(37, 248, 154, 0.34)"
                  />
                  <stop
                    offset="100%"
                    stopColor="rgba(37, 248, 154, 0)"
                  />
                </linearGradient>

                <filter id="builder-wallet-chart-glow">
                  <feGaussianBlur
                    stdDeviation="4"
                    result="blur"
                  />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={ratio}
                  x1={chartPadding}
                  x2={chartWidth - chartPadding}
                  y1={chartHeight * ratio}
                  y2={chartHeight * ratio}
                  className="builder-wallet-chart-grid-line"
                />
              ))}

              {chart.area && (
                <polygon
                  points={chart.area}
                  fill="url(#builder-wallet-chart-fill)"
                />
              )}

              {chart.line && (
                <polyline
                  points={chart.line}
                  className="builder-wallet-chart-line"
                  filter="url(#builder-wallet-chart-glow)"
                />
              )}

              {chart.points.map((point, index) => (
                <circle
                  key={`${point.x}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={point.value > 0 ? 4 : 2.4}
                  className={
                    point.value > 0
                      ? "builder-wallet-chart-point builder-wallet-chart-point--active"
                      : "builder-wallet-chart-point"
                  }
                />
              ))}
            </svg>
          </div>

          <div className="builder-wallet-chart-axis">
            <span>
              {analytics.days[0]?.label ?? ""}
            </span>
            <span>
              {
                analytics.days[
                  Math.floor(analytics.days.length / 2)
                ]?.label
              }
            </span>
            <span>
              {analytics.days.at(-1)?.label ?? ""}
            </span>
          </div>
        </div>

        <div className="builder-wallet-insight-grid">
          <article className="builder-wallet-insight">
            <span className="builder-wallet-insight-icon">
              <Sparkles size={18} />
            </span>
            <div>
              <span>Today</span>
              <strong>
                {formatSignedGp(analytics.todayGp)}
              </strong>
            </div>
          </article>

          <article className="builder-wallet-insight">
            <span className="builder-wallet-insight-icon">
              <ChartNoAxesCombined size={18} />
            </span>
            <div>
              <span>{period}-Day Rewards</span>
              <strong>
                {formatGp(analytics.periodEarnedGp)} GP
              </strong>
            </div>
          </article>

          <article className="builder-wallet-insight">
            <span className="builder-wallet-insight-icon">
              <Activity size={18} />
            </span>
            <div>
              <span>Daily Average</span>
              <strong>
                {formatGp(analytics.dailyAverageGp)} GP
              </strong>
            </div>
          </article>

          <article className="builder-wallet-insight">
            <span className="builder-wallet-insight-icon">
              <Flame size={18} />
            </span>
            <div>
              <span>Best Day</span>
              <strong>
                {formatGp(analytics.bestDayGp)} GP
              </strong>
            </div>
          </article>

          <article className="builder-wallet-insight builder-wallet-insight--wide">
            <span className="builder-wallet-insight-icon">
              <CalendarDays size={18} />
            </span>
            <div>
              <span>Active Days</span>
              <strong>
                {analytics.activeDays} / {period}
              </strong>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
