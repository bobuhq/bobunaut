import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  KeyRound,
  Network,
  Pickaxe,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  useState,
  type FormEvent,
} from "react";

import type { AdminBuilder } from "../../core/admin/AdminBuildersService";
import { useAdminAccess } from "../../core/admin/useAdminAccess";
import { useAdminBuilderDetail } from "../../core/admin/useAdminBuilderDetail";
import { useAdminBuilders } from "../../core/admin/useAdminBuilders";
import { AdminLayout } from "./AdminLayout";
import "./AdminDashboard.css";

const PAGE_SIZE = 25;

const numberFormatter = new Intl.NumberFormat("en-US");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

function getBuilderName(builder: AdminBuilder): string {
  return (
    builder.displayName ||
    builder.username ||
    "Unnamed Builder"
  );
}

function IdentityBadge({
  label,
  verified,
}: {
  label: string;
  verified: boolean;
}) {
  return (
    <span
      className={`admin-builder-card__identity-badge ${
        verified
          ? "admin-builder-card__identity-badge--verified"
          : ""
      }`}
    >
      {verified ? <BadgeCheck size={13} /> : null}
      {label}
    </span>
  );
}

export default function AdminBuilders() {
  const { access } = useAdminAccess();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedBuilder, setSelectedBuilder] =
    useState<AdminBuilder | null>(null);
  const [copiedBuilderId, setCopiedBuilderId] =
    useState(false);

  const {
    builders,
    loading,
    error,
    refresh,
  } = useAdminBuilders({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search,
  });

  const {
    detail: builderDetail,
    loading: builderDetailLoading,
    error: builderDetailError,
    refresh: refreshBuilderDetail,
  } = useAdminBuilderDetail(
    selectedBuilder?.builderId ?? null,
  );

  const role = access?.role ?? "admin";
  const canGoBack = page > 0;
  const canGoForward = builders.length === PAGE_SIZE;

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setPage(0);
    setSearch(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearch("");
    setPage(0);
  }

  async function handleCopyBuilderId(
    builderId: string,
  ) {
    try {
      await navigator.clipboard.writeText(builderId);
      setCopiedBuilderId(true);

      window.setTimeout(() => {
        setCopiedBuilderId(false);
      }, 1_500);
    } catch {
      setCopiedBuilderId(false);
    }
  }

  return (
    <AdminLayout role={role}>
      <section className="admin-dashboard">
        <div className="admin-dashboard__stars" />

        <div className="admin-dashboard__content">
          <header className="admin-dashboard__hero">
            <div>
              <span className="admin-dashboard__eyebrow">
                BUILDER INTELLIGENCE
              </span>

              <h1>Builders</h1>

              <p>
                Inspect Builder progression, identity verification,
                GP, Passport and mining activity.
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

          <section className="admin-builders__toolbar">
            <form
              className="admin-builders__search"
              onSubmit={handleSearchSubmit}
            >
              <Search size={18} />

              <input
                type="search"
                value={searchInput}
                placeholder="Search username, display name or invite code"
                aria-label="Search Builders"
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
              />

              {search ? (
                <button
                  type="button"
                  className="admin-builders__clear"
                  onClick={handleClearSearch}
                >
                  Clear
                </button>
              ) : null}

              <button type="submit">
                Search
              </button>
            </form>

            <button
              type="button"
              className="admin-builders__refresh"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw
                size={17}
                className={
                  loading
                    ? "admin-builders__refresh-icon--loading"
                    : undefined
                }
              />

              Refresh
            </button>
          </section>

          <section className="admin-builders__panel">
            <div className="admin-builders__panel-header">
              <div>
                <Users size={19} />

                <div>
                  <span>BUILDER DIRECTORY</span>

                  <strong>
                    {loading
                      ? "Loading Builders"
                      : `${builders.length} Builders loaded`}
                  </strong>
                </div>
              </div>

              <span className="admin-builders__page-label">
                PAGE {page + 1}
              </span>
            </div>

            {error ? (
              <div className="admin-builders__state">
                <strong>Unable to load Builders</strong>
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => void refresh()}
                >
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="admin-builders__state">
                <strong>Loading Builder Intelligence</strong>

                <span>
                  Securely requesting Builder data from Supabase.
                </span>
              </div>
            ) : builders.length === 0 ? (
              <div className="admin-builders__state">
                <strong>No Builders found</strong>

                <span>
                  No Builder profiles matched the current request.
                </span>
              </div>
            ) : (
              <div className="admin-builder-grid">
                {builders.map((builder) => {
                  const primaryName =
                    getBuilderName(builder);

                  return (
                    <article
                      key={builder.builderId}
                      className="admin-builder-card"
                    >
                      <header className="admin-builder-card__header">
                        <div className="admin-builder-card__profile">
                          <div className="admin-builder-card__avatar">
                            {primaryName
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>{primaryName}</strong>

                            <span>
                              {builder.username
                                ? `@${builder.username}`
                                : builder.builderId.slice(0, 12)}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`admin-builders__status ${
                            builder.miningActive
                              ? "admin-builders__status--active"
                              : "admin-builders__status--inactive"
                          }`}
                        >
                          <Pickaxe size={13} />

                          {builder.miningActive
                            ? "Mining"
                            : "Offline"}
                        </span>
                      </header>

                      <div className="admin-builder-card__badges">
                        {builder.verified ? (
                          <span className="admin-builder-card__badge admin-builder-card__badge--verified">
                            <BadgeCheck size={13} />
                            Verified
                          </span>
                        ) : null}

                        {builder.genesisBuilder ? (
                          <span className="admin-builder-card__badge admin-builder-card__badge--genesis">
                            <Sparkles size={13} />
                            Genesis
                          </span>
                        ) : null}

                        <span
                          className={`admin-builder-card__badge ${
                            builder.passportUnlocked
                              ? "admin-builder-card__badge--passport"
                              : ""
                          }`}
                        >
                          <KeyRound size={13} />
                          {builder.passportUnlocked
                            ? "Passport"
                            : "Passport Locked"}
                        </span>
                      </div>

                      <div className="admin-builder-card__metrics">
                        <div>
                          <span>GP</span>
                          <strong>
                            {numberFormatter.format(builder.gp)}
                          </strong>
                        </div>

                        <div>
                          <span>LEVEL</span>
                          <strong>{builder.level}</strong>
                        </div>


                        <div>
                          <span>REFERRALS</span>
                          <strong>
                            {numberFormatter.format(
                              builder.referralCount,
                            )}
                          </strong>
                        </div>
                      </div>


                      <div className="admin-builder-card__identities">
                        <IdentityBadge
                          label="Telegram"
                          verified={
                            builder.identity.telegram
                          }
                        />

                        <IdentityBadge
                          label="X"
                          verified={builder.identity.x}
                        />

                        <IdentityBadge
                          label="Instagram"
                          verified={
                            builder.identity.instagram
                          }
                        />

                        <IdentityBadge
                          label="Wallet"
                          verified={builder.identity.wallet}
                        />
                      </div>

                      <button
                        type="button"
                        className="admin-builder-card__view"
                        onClick={() =>
                          setSelectedBuilder(builder)
                        }
                      >
                        View Builder
                        <ChevronRight size={16} />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {!error && !loading ? (
              <footer className="admin-builders__pagination">
                <span>
                  Showing page {page + 1} · Up to{" "}
                  {PAGE_SIZE} Builders per page
                </span>

                <div>
                  <button
                    type="button"
                    disabled={!canGoBack}
                    onClick={() =>
                      setPage((current) =>
                        Math.max(current - 1, 0),
                      )
                    }
                  >
                    <ChevronLeft size={17} />
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={!canGoForward}
                    onClick={() =>
                      setPage((current) => current + 1)
                    }
                  >
                    Next
                    <ChevronRight size={17} />
                  </button>
                </div>
              </footer>
            ) : null}
          </section>
        </div>
      </section>

      {selectedBuilder ? (
        <div
          className="admin-builder-drawer__backdrop"
          role="presentation"
          onClick={() => setSelectedBuilder(null)}
        >
          <aside
            className="admin-builder-drawer admin-builder-drawer--wide"
            role="dialog"
            aria-modal="true"
            aria-label="Builder Intelligence details"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-builder-drawer__header">
              <div>
                <span>BUILDER INTELLIGENCE</span>
                <strong>
                  {getBuilderName(selectedBuilder)}
                </strong>
              </div>

              <button
                type="button"
                aria-label="Close Builder details"
                onClick={() => setSelectedBuilder(null)}
              >
                <X size={19} />
              </button>
            </header>

            <div className="admin-builder-drawer__content">
              <section className="admin-builder-drawer__passport">
                <div className="admin-builder-drawer__avatar">
                  {getBuilderName(selectedBuilder)
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <span>BUILDER PASSPORT</span>
                  <strong>
                    {getBuilderName(selectedBuilder)}
                  </strong>
                  <small>
                    {selectedBuilder.username
                      ? `@${selectedBuilder.username}`
                      : "No username"}
                  </small>
                </div>
              </section>

              {builderDetailError ? (
                <section className="admin-builders__state">
                  <strong>
                    Unable to load Builder Intelligence
                  </strong>

                  <span>{builderDetailError}</span>

                  <button
                    type="button"
                    onClick={() =>
                      void refreshBuilderDetail()
                    }
                  >
                    Try again
                  </button>
                </section>
              ) : builderDetailLoading || !builderDetail ? (
                <section className="admin-builders__state">
                  <strong>
                    Loading Builder Intelligence
                  </strong>

                  <span>
                    Requesting wallet, mining and referral
                    history.
                  </span>
                </section>
              ) : (
                <>
                  <section className="admin-builder-drawer__stats admin-builder-drawer__stats--four">
                    <div>
                      <Trophy size={17} />
                      <span>Current GP</span>
                      <strong>
                        {numberFormatter.format(
                          builderDetail.wallet.currentGp,
                        )}
                      </strong>
                    </div>

                    <div>
                      <Sparkles size={17} />
                      <span>Lifetime Credits</span>
                      <strong>
                        {numberFormatter.format(
                          builderDetail.wallet
                            .lifetimeCredits,
                        )}
                      </strong>
                    </div>

                    <div>
                      <ShieldCheck size={17} />
                      <span>Lifetime Debits</span>
                      <strong>
                        {numberFormatter.format(
                          builderDetail.wallet
                            .lifetimeDebits,
                        )}
                      </strong>
                    </div>

                    <div>
                      <Network size={17} />
                      <span>Net Ledger GP</span>
                      <strong>
                        {numberFormatter.format(
                          builderDetail.wallet.lifetimeNet,
                        )}
                      </strong>
                    </div>
                  </section>

                  <section className="admin-builder-drawer__section">
                    <h3>GP Intelligence</h3>

                    <div className="admin-builder-drawer__rows">
                      <div>
                        <span>Social Verification GP</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.wallet.socialGp,
                          )}{" "}
                          GP
                        </strong>
                      </div>

                      <div>
                        <span>Mining GP</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.wallet.miningGp,
                          )}{" "}
                          GP
                        </strong>
                      </div>

                      <div>
                        <span>Mission GP</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.wallet.missionGp,
                          )}{" "}
                          GP
                        </strong>
                      </div>

                      <div>
                        <span>Referral GP</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.wallet.referralGp,
                          )}{" "}
                          GP
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="admin-builder-drawer__section">
                    <h3>Mining Intelligence</h3>

                    <div className="admin-builder-drawer__rows">
                      <div>
                        <span>Status</span>
                        <strong>
                          {builderDetail.mining.active
                            ? "Active"
                            : "Inactive"}
                        </strong>
                      </div>

                      <div>
                        <span>Total Sessions</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.mining
                              .totalSessions,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Claimed Sessions</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.mining
                              .claimedSessions,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Completed Sessions</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.mining
                              .completedSessions,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Lifetime Mining Reward</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.mining
                              .lifetimeRewardGp,
                          )}{" "}
                          GP
                        </strong>
                      </div>

                      <div>
                        <span>Last Claim</span>
                        <strong>
                          {builderDetail.mining.lastClaimedAt
                            ? dateFormatter.format(
                                new Date(
                                  builderDetail.mining
                                    .lastClaimedAt,
                                ),
                              )
                            : "No claims"}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="admin-builder-drawer__section">
                    <h3>Identity Intelligence</h3>

                    <div className="admin-builder-drawer__identity-list">
                      <IdentityBadge
                        label="Telegram"
                        verified={
                          builderDetail.identity.telegram
                        }
                      />

                      <IdentityBadge
                        label="X"
                        verified={builderDetail.identity.x}
                      />

                      <IdentityBadge
                        label="Instagram"
                        verified={
                          builderDetail.identity.instagram
                        }
                      />

                      <IdentityBadge
                        label="Wallet"
                        verified={
                          builderDetail.identity.wallet
                        }
                      />
                    </div>
                  </section>

                  <section className="admin-builder-drawer__section">
                    <h3>Referral Intelligence</h3>

                    <div className="admin-builder-drawer__rows">
                      <div>
                        <span>Parent Builder</span>
                        <strong>
                          {builderDetail.referral
                            .parentDisplayName ||
                            builderDetail.referral
                              .parentUsername ||
                            "Genesis"}
                        </strong>
                      </div>

                      <div>
                        <span>Referral Status</span>
                        <strong>
                          {builderDetail.referral.status ??
                            "No parent"}
                        </strong>
                      </div>

                      <div>
                        <span>Direct Referrals</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.referral
                              .directReferralCount,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Invite Code</span>
                        <strong>
                          {builderDetail.profile.inviteCode ??
                            "—"}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="admin-builder-drawer__section">
                    <h3>Recent Reward Activity</h3>

                    {builderDetail.recentLedger.length ===
                    0 ? (
                      <div className="admin-builder-intelligence__empty">
                        No ledger activity.
                      </div>
                    ) : (
                      <div className="admin-builder-intelligence__timeline">
                        {builderDetail.recentLedger.map(
                          (entry) => (
                            <article key={entry.ledgerId}>
                              <div>
                                <strong>
                                  {entry.rewardType
                                    .replace(/[_-]+/g, " ")
                                    .replace(
                                      /\b\w/g,
                                      (character) =>
                                        character.toUpperCase(),
                                    )}
                                </strong>

                                <span>
                                  {entry.provider ?? "System"} ·{" "}
                                  {dateFormatter.format(
                                    new Date(
                                      entry.createdAt,
                                    ),
                                  )}
                                </span>
                              </div>

                              <strong
                                className={`admin-builder-intelligence__amount admin-builder-intelligence__amount--${entry.entryType}`}
                              >
                                {entry.entryType === "debit"
                                  ? "−"
                                  : "+"}
                                {numberFormatter.format(
                                  entry.amount,
                                )}{" "}
                                GP
                              </strong>
                            </article>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  <section className="admin-builder-drawer__section">
                    <h3>Recent Mining Activity</h3>

                    {builderDetail.recentMining.length ===
                    0 ? (
                      <div className="admin-builder-intelligence__empty">
                        No mining sessions.
                      </div>
                    ) : (
                      <div className="admin-builder-intelligence__timeline">
                        {builderDetail.recentMining.map(
                          (session) => (
                            <article key={session.sessionId}>
                              <div>
                                <strong>
                                  {session.status.toUpperCase()}
                                </strong>

                                <span>
                                  {dateFormatter.format(
                                    new Date(
                                      session.startedAt,
                                    ),
                                  )}{" "}
                                  →{" "}
                                  {dateFormatter.format(
                                    new Date(session.endsAt),
                                  )}
                                </span>
                              </div>

                              <strong>
                                {numberFormatter.format(
                                  session.rewardGp,
                                )}{" "}
                                GP
                              </strong>
                            </article>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  <section className="admin-builder-drawer__section">
                    <h3>Account Details</h3>

                    <div className="admin-builder-drawer__rows">
                      <div>
                        <span>
                          <CalendarDays size={15} />
                          Joined
                        </span>

                        <strong>
                          {dateFormatter.format(
                            new Date(
                              builderDetail.profile.createdAt,
                            ),
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Level</span>
                        <strong>
                          {builderDetail.profile.level}
                        </strong>
                      </div>


                      <div>
                        <span>Reputation</span>
                        <strong>
                          {numberFormatter.format(
                            builderDetail.profile.reputation,
                          )}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section className="admin-builder-drawer__section">
                    <h3>Builder ID</h3>

                    <button
                      type="button"
                      className="admin-builder-drawer__copy"
                      onClick={() =>
                        void handleCopyBuilderId(
                          selectedBuilder.builderId,
                        )
                      }
                    >
                      <code>
                        {selectedBuilder.builderId}
                      </code>

                      <span>
                        <Copy size={15} />
                        {copiedBuilderId
                          ? "Copied"
                          : "Copy"}
                      </span>
                    </button>
                  </section>
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </AdminLayout>
  );
}
