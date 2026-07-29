import type {
  ComponentType,
  SVGProps,
} from "react";

type MetricIcon = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: number | string;
  }
>;

type AdminMetricCardProps = {
  label: string;
  value: string;
  status: string;
  icon: MetricIcon;
};

export function AdminMetricCard({
  label,
  value,
  status,
  icon: Icon,
}: AdminMetricCardProps) {
  return (
    <article className="admin-metric-card">
      <div className="admin-metric-card__top">
        <div className="admin-metric-card__icon">
          <Icon size={21} />
        </div>

        <span className="admin-metric-card__signal" />
      </div>

      <span className="admin-metric-card__label">
        {label}
      </span>

      <strong className="admin-metric-card__value">
        {value}
      </strong>

      <small className="admin-metric-card__status">
        {status}
      </small>
    </article>
  );
}
