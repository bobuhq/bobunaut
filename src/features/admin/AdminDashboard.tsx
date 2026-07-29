import {
  Activity,
  CircleUserRound,
  Database,
  Gift,
  Network,
  Pickaxe,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { useAdminAccess } from "../../core/admin/useAdminAccess";
import { useAdminAnalytics } from "../../core/admin/useAdminAnalytics";
import { useAdminLiveOperations } from "../../core/admin/useAdminLiveOperations";
import { useAdminMetrics } from "../../core/admin/useAdminMetrics";
import { AdminLayout } from "./AdminLayout";
import { AdminMetricCard } from "./components/AdminMetricCard";
import { AdminUniverseHealth } from "./components/AdminUniverseHealth";
import "./AdminDashboard.css";

const numberFormatter = new Intl.NumberFormat("en-US");

const dateTimeFormatter = new Intl.DateTimeFormat(
  "en-US",
  {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
);

function getBuilderName(
  displayName: string | null,
  username: string | null,
): string {
  return displayName || username || "Unknown Builder";
}

export default function AdminDashboard() {
  const { access } = useAdminAccess();
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useAdminMetrics();

  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
  } = useAdminAnalytics();

  const {
    operations,
    loading: operationsLoading,
    refreshing: operationsRefreshing,
    error: operationsError,
    refresh: refreshOperations,
  } = useAdminLiveOperations();

  const role = access?.role ?? "admin";

  const dashboardCards = [
    {
      label: "Total Builders",
      value: metricsLoading
        ? "—"
        : numberFormatter.format(
            metrics?.totalBuilders ?? 0,
          ),
      status: metricsError
        ? "Metrics unavailable"
        : metricsLoading
          ? "Loading live data"
          : "Live Builder profiles",
      icon: Users,
    },
    {
      label: "Active Today",
      value: metricsLoading
        ? "—"
        : numberFormatter.format(
            metrics?.activeToday ?? 0,
          ),
      status: metricsError
        ? "Metrics unavailable"
        : metricsLoading
          ? "Loading live data"
          : "Activity tracking pending",
      icon: Activity,
    },
    {
      label: "Total GP",
      value: metricsLoading
        ? "—"
        : numberFormatter.format(metrics?.totalGp ?? 0),
      status: metricsError
        ? "Metrics unavailable"
        : metricsLoading
          ? "Loading live data"
          : "Live GP balance total",
      icon: Sparkles,
    },
    {
      label: "Active Miners",
      value: metricsLoading
        ? "—"
        : numberFormatter.format(
            metrics?.activeMiners ?? 0,
          ),
      status: metricsError
        ? "Metrics unavailable"
        : metricsLoading
          ? "Loading live data"
          : "Active 24-hour sessions",
      icon: Pickaxe,
    },
  ] as const;

  return (
    <AdminLayout role={role}>
      <section className="admin-dashboard">
        <div className="admin-dashboard__stars" />

        <div className="admin-dashboard__content">
          <header className="admin-dashboard__hero">
            <div>
              <span className="admin-dashboard__eyebrow">
                ADMIN DASHBOARD
              </span>

              <h1>Control Center</h1>

              <p>
                Monitor Builders, rewards, mining activity and
                the operational state of the BOBU Universe.
              </p>
            </div>

            <div className="admin-dashboard__authority">
              <ShieldCheck size={19} />

              <div>
                <span>Authority verified</span>
                <strong>{role.toUpperCase()}</strong>
              </div>
            </div>
          </header>

          <section
            className="admin-dashboard__cards"
            aria-label="Universe metrics"
          >
            {dashboardCards.map((card) => (
              <AdminMetricCard
                key={card.label}
                {...card}
              />
            ))}
          </section>

          <section className="admin-live-operations">
            <header className="admin-live-operations__header">
              <div>
                <span className="admin-dashboard__section-label">
                  LIVE OPERATIONS
                </span>

                <h2>Universe activity stream</h2>

                <p>
                  Server-authoritative Builder, reward, mining,
                  verification and referral activity.
                </p>
              </div>

              <div className="admin-live-operations__controls">
                {operations?.generatedAt ? (
                  <span>
                    Updated{" "}
                    {dateTimeFormatter.format(
                      new Date(operations.generatedAt),
                    )}
                  </span>
                ) : null}

                <button
                  type="button"
                  disabled={operationsRefreshing}
                  onClick={() =>
                    void refreshOperations()
                  }
                >
                  <RefreshCw
                    size={15}
                    className={
                      operationsRefreshing
                        ? "admin-live-operations__refresh-icon"
                        : undefined
                    }
                  />

                  Refresh
                </button>
              </div>
            </header>

            <div className="admin-live-operations__summary">
              <article>
                <CircleUserRound size={17} />
                <span>New Builders Today</span>
                <strong>
                  {operationsLoading
                    ? "—"
                    : numberFormatter.format(
                        operations?.metrics
                          .newBuildersToday ?? 0,
                      )}
                </strong>
              </article>

              <article>
                <Pickaxe size={17} />
                <span>Mining Now</span>
                <strong>
                  {operationsLoading
                    ? "—"
                    : numberFormatter.format(
                        operations?.metrics
                          .activeMiners ?? 0,
                      )}
                </strong>
              </article>

              <article>
                <Gift size={17} />
                <span>GP Credits Today</span>
                <strong>
                  {operationsLoading
                    ? "—"
                    : numberFormatter.format(
                        operations?.metrics
                          .gpCreditsToday ?? 0,
                      )}
                </strong>
              </article>

              <article>
                <UserCheck size={17} />
                <span>Verifications Today</span>
                <strong>
                  {operationsLoading
                    ? "—"
                    : numberFormatter.format(
                        operations?.metrics
                          .verificationsToday ?? 0,
                      )}
                </strong>
              </article>

              <article>
                <Network size={17} />
                <span>Referrals Today</span>
                <strong>
                  {operationsLoading
                    ? "—"
                    : numberFormatter.format(
                        operations?.metrics
                          .referralsToday ?? 0,
                      )}
                </strong>
              </article>
            </div>

            <div className="admin-live-operations__feed">
              {operationsError ? (
                <div className="admin-live-operations__state">
                  <strong>
                    Live Operations unavailable
                  </strong>

                  <span>{operationsError}</span>

                  <button
                    type="button"
                    onClick={() =>
                      void refreshOperations()
                    }
                  >
                    Try again
                  </button>
                </div>
              ) : operationsLoading ? (
                <div className="admin-live-operations__state">
                  <strong>
                    Loading operational activity
                  </strong>

                  <span>
                    Reading the latest server-authoritative
                    events.
                  </span>
                </div>
              ) : !operations ||
                operations.events.length === 0 ? (
                <div className="admin-live-operations__state">
                  <strong>No recent operations</strong>

                  <span>
                    New Builder events will appear here.
                  </span>
                </div>
              ) : (
                operations.events.map((event) => (
                  <article
                    key={event.eventId}
                    className="admin-live-operations__event"
                  >
                    <div
                      className={`admin-live-operations__event-icon admin-live-operations__event-icon--${event.eventType}`}
                    >
                      {event.eventType ===
                      "mining_started" ? (
                        <Pickaxe size={16} />
                      ) : event.eventType ===
                        "mining_claimed" ? (
                        <Sparkles size={16} />
                      ) : event.eventType ===
                        "builder_joined" ? (
                        <Users size={16} />
                      ) : event.eventType ===
                        "referral_created" ? (
                        <Network size={16} />
                      ) : event.eventType ===
                        "identity_verified" ? (
                        <UserCheck size={16} />
                      ) : (
                        <Gift size={16} />
                      )}
                    </div>

                    <div className="admin-live-operations__event-content">
                      <div>
                        <strong>{event.title}</strong>

                        <span>
                          {getBuilderName(
                            event.displayName,
                            event.username,
                          )}
                        </span>
                      </div>

                      <p>{event.description}</p>

                      <time dateTime={event.occurredAt}>
                        {dateTimeFormatter.format(
                          new Date(event.occurredAt),
                        )}
                      </time>
                    </div>

                    {event.amount !== null ? (
                      <strong
                        className={`admin-live-operations__amount admin-live-operations__amount--${event.entryType ?? "neutral"}`}
                      >
                        {event.entryType === "debit"
                          ? "−"
                          : event.entryType === "credit"
                            ? "+"
                            : ""}
                        {numberFormatter.format(
                          event.amount,
                        )}{" "}
                        GP
                      </strong>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          {!analyticsError &&
          !analyticsLoading &&
          analytics ? (
            <AdminUniverseHealth
              items={analytics.health}
              compact
            />
          ) : null}

          <section className="admin-dashboard__systems">
            <div>
              <span className="admin-dashboard__section-label">
                SYSTEM STATUS
              </span>

              <h2>Admin Security v1 online</h2>

              <p>
                Role-based access is verified through Supabase
                before this console is rendered.
              </p>
            </div>

            <div className="admin-dashboard__system-indicator">
              <Database size={18} />
              <span>
                {metricsError
                  ? "Metrics connection unavailable"
                  : "Supabase connected"}
              </span>
              <i />
            </div>
          </section>
        </div>
      </section>
    </AdminLayout>
  );
}
