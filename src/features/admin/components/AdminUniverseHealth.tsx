import {
  Activity,
  CircleDot,
} from "lucide-react";

import type {
  AdminUniverseHealthItem,
} from "../../../core/admin/AdminAnalyticsService";

type AdminUniverseHealthProps = {
  items: AdminUniverseHealthItem[];
  compact?: boolean;
};

export function AdminUniverseHealth({
  items,
  compact = false,
}: AdminUniverseHealthProps) {
  return (
    <section
      className={`admin-health ${
        compact ? "admin-health--compact" : ""
      }`}
    >
      <header>
        <div>
          <Activity size={18} />

          <div>
            <span>UNIVERSE HEALTH</span>
            <strong>Core engine status</strong>
          </div>
        </div>

        <small>
          Server-authoritative diagnostics
        </small>
      </header>

      <div className="admin-health__grid">
        {items.map((item) => (
          <article key={item.engine}>
            <CircleDot
              size={16}
              className={`admin-health__icon admin-health__icon--${item.status}`}
            />

            <div className="admin-health__identity">
              <strong>{item.engine}</strong>
              <span>{item.detail}</span>
            </div>

            <div className="admin-health__live-metric">
              <strong>{item.metric}</strong>
              <span>{item.metricLabel}</span>
            </div>

            <small
              className={`admin-health__status admin-health__status--${item.status}`}
            >
              {item.status}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
