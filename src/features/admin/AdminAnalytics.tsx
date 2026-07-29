import {
  Activity,
  ChartNoAxesCombined,
  CircleUserRound,
  Gift,
  Network,
  Pickaxe,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

import { useAdminAccess } from "../../core/admin/useAdminAccess";
import { useAdminAnalytics } from "../../core/admin/useAdminAnalytics";
import { AdminLayout } from "./AdminLayout";
import { AdminTrendChart } from "./components/AdminTrendChart";
import { AdminUniverseHealth } from "./components/AdminUniverseHealth";
import "./AdminDashboard.css";

const numberFormatter = new Intl.NumberFormat(
  "en-US",
);

const rateFormatter = new Intl.NumberFormat(
  "en-US",
  {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  },
);

const dateFormatter = new Intl.DateTimeFormat(
  "en-US",
  {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  },
);

function builderName(
  displayName: string | null,
  username: string | null,
): string {
  return displayName || username || "Unnamed Builder";
}

export default function AdminAnalytics() {
  const { access } = useAdminAccess();

  const {
    analytics,
    loading,
    refreshing,
    error,
    refresh,
  } = useAdminAnalytics();

  const role = access?.role ?? "admin";

  return (
    <AdminLayout role={role}>
      <section className="admin-dashboard">
        <div className="admin-dashboard__stars" />

        <div className="admin-dashboard__content">
          <header className="admin-dashboard__hero">
            <div>
              <span className="admin-dashboard__eyebrow">
                UNIVERSE INTELLIGENCE
              </span>

              <h1>Analytics</h1>

              <p>
                Track Builder growth, GP circulation,
                mining activity, identity progress and
                referral expansion.
              </p>
            </div>

            <div className="admin-dashboard__authority">
              <ShieldCheck size={19} />

              <div>
                <span>Analytics authority</span>
                <strong>{role.toUpperCase()}</strong>
              </div>
            </div>
          </header>

          <div className="admin-analytics__toolbar">
            <span>
              {analytics?.generatedAt
                ? `Updated ${dateFormatter.format(
                    new Date(analytics.generatedAt),
                  )}`
                : "Waiting for analytics"}
            </span>

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "admin-builders__refresh-icon--loading"
                    : undefined
                }
              />

              Refresh
            </button>
          </div>

          {error ? (
            <section className="admin-builders__panel">
              <div className="admin-builders__state">
                <strong>
                  Unable to load Analytics
                </strong>

                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => void refresh()}
                >
                  Try again
                </button>
              </div>
            </section>
          ) : loading || !analytics ? (
            <section className="admin-builders__panel">
              <div className="admin-builders__state">
                <strong>Loading Analytics</strong>

                <span>
                  Calculating authoritative Universe data.
                </span>
              </div>
            </section>
          ) : (
            <>
              <section className="admin-analytics__overview">
                <article>
                  <CircleUserRound size={18} />
                  <span>Total Builders</span>
                  <strong>
                    {numberFormatter.format(
                      analytics.builders.total,
                    )}
                  </strong>
                  <small>
                    {analytics.builders.growthPercent >= 0
                      ? "+"
                      : ""}
                    {rateFormatter.format(
                      analytics.builders
                        .growthPercent,
                    )}
                    % vs previous 30 days
                  </small>
                </article>

                <article>
                  <Sparkles size={18} />
                  <span>Total Wallet GP</span>
                  <strong>
                    {numberFormatter.format(
                      analytics.gp.walletTotal,
                    )}
                  </strong>
                  <small>
                    {numberFormatter.format(
                      analytics.gp.creditsMonth,
                    )}{" "}
                    GP credited in 30 days
                  </small>
                </article>

                <article>
                  <Pickaxe size={18} />
                  <span>Mining Now</span>
                  <strong>
                    {numberFormatter.format(
                      analytics.mining.active,
                    )}
                  </strong>
                  <small>
                    {numberFormatter.format(
                      analytics.mining.expired,
                    )}{" "}
                    expired and unprocessed
                  </small>
                </article>

                <article>
                  <Network size={18} />
                  <span>Referral Network</span>
                  <strong>
                    {numberFormatter.format(
                      analytics.referrals.total,
                    )}
                  </strong>
                  <small>
                    Largest direct network:{" "}
                    {numberFormatter.format(
                      analytics.referrals
                        .largestNetwork,
                    )}
                  </small>
                </article>
              </section>

              <section className="admin-analytics__trend-grid">
                <article>
                  <header>
                    <CircleUserRound size={17} />
                    <div>
                      <span>BUILDER GROWTH</span>
                      <strong>Last 30 days</strong>
                    </div>
                  </header>

                  <AdminTrendChart
                    points={analytics.builderTrend}
                  />

                  <footer>
                    <span>
                      Today{" "}
                      <strong>
                        {numberFormatter.format(
                          analytics.builders.today,
                        )}
                      </strong>
                    </span>

                    <span>
                      7D{" "}
                      <strong>
                        {numberFormatter.format(
                          analytics.builders.week,
                        )}
                      </strong>
                    </span>

                    <span>
                      30D{" "}
                      <strong>
                        {numberFormatter.format(
                          analytics.builders.month,
                        )}
                      </strong>
                    </span>
                  </footer>
                </article>

                <article>
                  <header>
                    <Gift size={17} />
                    <div>
                      <span>GP CREDITS</span>
                      <strong>Last 30 days</strong>
                    </div>
                  </header>

                  <AdminTrendChart
                    points={analytics.gpTrend}
                    valueSuffix=" GP"
                  />

                  <footer>
                    <span>
                      Today{" "}
                      <strong>
                        {numberFormatter.format(
                          analytics.gp.creditsToday,
                        )}
                      </strong>
                    </span>

                    <span>
                      7D{" "}
                      <strong>
                        {numberFormatter.format(
                          analytics.gp.creditsWeek,
                        )}
                      </strong>
                    </span>

                    <span>
                      30D{" "}
                      <strong>
                        {numberFormatter.format(
                          analytics.gp.creditsMonth,
                        )}
                      </strong>
                    </span>
                  </footer>
                </article>

                <article>
                  <header>
                    <Pickaxe size={17} />
                    <div>
                      <span>MINING STARTS</span>
                      <strong>Last 30 days</strong>
                    </div>
                  </header>

                  <AdminTrendChart
                    points={analytics.miningTrend}
                  />

                  <footer>
                    <span>
                      Started today{" "}
                      <strong>
                        {numberFormatter.format(
                          analytics.mining
                            .startedToday,
                        )}
                      </strong>
                    </span>

                    <span>
                      Claimed today{" "}
                      <strong>
                        {numberFormatter.format(
                          analytics.mining
                            .claimedToday,
                        )}
                      </strong>
                    </span>
                  </footer>
                </article>
              </section>

              <section className="admin-analytics__detail-grid">
                <article>
                  <header>
                    <Pickaxe size={18} />
                    <div>
                      <span>MINING INTELLIGENCE</span>
                      <strong>Session distribution</strong>
                    </div>
                  </header>

                  <div>
                    <span>
                      Active
                      <strong>
                        {numberFormatter.format(
                          analytics.mining.active,
                        )}
                      </strong>
                    </span>

                    <span>
                      Expired
                      <strong>
                        {numberFormatter.format(
                          analytics.mining.expired,
                        )}
                      </strong>
                    </span>

                    <span>
                      Completed
                      <strong>
                        {numberFormatter.format(
                          analytics.mining.completed,
                        )}
                      </strong>
                    </span>

                    <span>
                      Claimed
                      <strong>
                        {numberFormatter.format(
                          analytics.mining.claimed,
                        )}
                      </strong>
                    </span>

                    <span>
                      Average Reward
                      <strong>
                        {rateFormatter.format(
                          analytics.mining
                            .averageReward,
                        )}{" "}
                        GP
                      </strong>
                    </span>

                    <span>
                      Average Rate
                      <strong>
                        {rateFormatter.format(
                          analytics.mining.averageRate,
                        )}
                      </strong>
                    </span>
                  </div>
                </article>

                <article>
                  <header>
                    <UserCheck size={18} />
                    <div>
                      <span>IDENTITY INTELLIGENCE</span>
                      <strong>Verified platforms</strong>
                    </div>
                  </header>

                  <div>
                    <span>
                      Telegram
                      <strong>
                        {numberFormatter.format(
                          analytics.verification
                            .telegram,
                        )}
                      </strong>
                    </span>

                    <span>
                      X
                      <strong>
                        {numberFormatter.format(
                          analytics.verification.x,
                        )}
                      </strong>
                    </span>

                    <span>
                      Instagram
                      <strong>
                        {numberFormatter.format(
                          analytics.verification
                            .instagram,
                        )}
                      </strong>
                    </span>

                    <span>
                      Fully Verified
                      <strong>
                        {numberFormatter.format(
                          analytics.verification
                            .fullyVerified,
                        )}
                      </strong>
                    </span>

                    <span>
                      Pending Records
                      <strong>
                        {numberFormatter.format(
                          analytics.verification
                            .pending,
                        )}
                      </strong>
                    </span>
                  </div>
                </article>

                <article>
                  <header>
                    <ChartNoAxesCombined size={18} />
                    <div>
                      <span>TOP BUILDERS</span>
                      <strong>GP leaderboard snapshot</strong>
                    </div>
                  </header>

                  <div className="admin-analytics__leaderboard">
                    {analytics.leaderboard.map(
                      (builder, index) => (
                        <div key={builder.builderId}>
                          <i>{index + 1}</i>

                          <span>
                            <strong>
                              {builderName(
                                builder.displayName,
                                builder.username,
                              )}
                            </strong>

                            <small>
                              Level {builder.level} ·{" "}
                              {builder.referralCount} referrals
                            </small>
                          </span>

                          <b>
                            {numberFormatter.format(
                              builder.gp,
                            )}{" "}
                            GP
                          </b>
                        </div>
                      ),
                    )}
                  </div>
                </article>
              </section>

              <AdminUniverseHealth
                items={analytics.health}
              />
            </>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
