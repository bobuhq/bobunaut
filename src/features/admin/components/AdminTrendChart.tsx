import type {
  AdminAnalyticsTrendPoint,
} from "../../../core/admin/AdminAnalyticsService";

type AdminTrendChartProps = {
  points: AdminAnalyticsTrendPoint[];
  valueSuffix?: string;
};

const numberFormatter = new Intl.NumberFormat(
  "en-US",
);

export function AdminTrendChart({
  points,
  valueSuffix = "",
}: AdminTrendChartProps) {
  const maximum = Math.max(
    ...points.map((point) => point.value),
    1,
  );

  return (
    <div
      className="admin-analytics__chart"
      aria-label="30-day trend"
    >
      {points.map((point) => {
        const height = Math.max(
          (point.value / maximum) * 100,
          point.value > 0 ? 8 : 2,
        );

        return (
          <div
            key={point.date}
            className="admin-analytics__chart-column"
            title={`${point.date}: ${numberFormatter.format(
              point.value,
            )}${valueSuffix}`}
          >
            <i style={{ height: `${height}%` }} />
          </div>
        );
      })}
    </div>
  );
}
