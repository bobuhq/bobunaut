import {
  Check,
  ExternalLink,
  Image,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";

import {
  AdminMarsPixelAdsService,
  type AdminMarsPixelCreativeStatus,
} from "../../core/admin/AdminMarsPixelAdsService";
import { useAdminAccess } from "../../core/admin/useAdminAccess";
import { useAdminMarsPixelAds } from "../../core/admin/useAdminMarsPixelAds";
import { AdminLayout } from "./AdminLayout";
import "./AdminDashboard.css";

const PAGE_SIZE = 25;

export default function AdminMarsPixelAds() {
  const { access } = useAdminAccess();
  const role = access?.role ?? "admin";

  const [status, setStatus] =
    useState<AdminMarsPixelCreativeStatus | null>(
      "under_review",
    );
  const [page, setPage] = useState(0);
  const [moderatingId, setModeratingId] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);

  const {
    creatives,
    loading,
    error,
    refresh,
  } = useAdminMarsPixelAds({
    status,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const canGoBack = page > 0;
  const canGoForward =
    creatives.length === PAGE_SIZE;

  async function moderate(
    creativeId: string,
    decision: "approve" | "reject",
  ) {
    setModeratingId(creativeId);
    setActionError(null);

    try {
      await AdminMarsPixelAdsService
        .moderateCreative(creativeId, decision);

      await refresh();
    } catch (caughtError: unknown) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Moderation action failed.",
      );
    } finally {
      setModeratingId(null);
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
                MARS PIXEL MODERATION
              </span>

              <h1>Mars Pixel Ads</h1>

              <p>
                Review advertiser creatives before they become
                publicly visible across the Mars Pixel surface.
              </p>
            </div>

            <div className="admin-dashboard__authority">
              <ShieldCheck size={19} />

              <div>
                <span>Moderation authority</span>
                <strong>{role.toUpperCase()}</strong>
              </div>
            </div>
          </header>

          <section className="admin-builders__toolbar admin-operations__toolbar">
            <div className="admin-mars-ads__filters">
              <select
                value={status ?? "all"}
                aria-label="Filter creative status"
                onChange={(event) => {
                  const value = event.target.value;

                  setStatus(
                    value === "all"
                      ? null
                      : value as AdminMarsPixelCreativeStatus,
                  );
                  setPage(0);
                }}
              >
                <option value="under_review">
                  Under Review
                </option>
                <option value="active">Active</option>
                <option value="suspended">
                  Suspended
                </option>
                <option value="archived">
                  Archived
                </option>
                <option value="all">All</option>
              </select>
            </div>

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

          {actionError ? (
            <div className="admin-mars-ads__action-error">
              {actionError}
            </div>
          ) : null}

          <section className="admin-builders__panel">
            <div className="admin-builders__panel-header">
              <div>
                <Image size={19} />

                <div>
                  <span>CREATIVE QUEUE</span>
                  <strong>
                    {loading
                      ? "Loading creatives"
                      : `${creatives.length} creatives loaded`}
                  </strong>
                </div>
              </div>

              <span className="admin-builders__page-label">
                PAGE {page + 1}
              </span>
            </div>

            {error ? (
              <div className="admin-builders__state">
                <strong>
                  Unable to load Mars Pixel Ads
                </strong>
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
                <strong>Loading Mars Pixel Ads</strong>
                <span>
                  Reading protected creative moderation data.
                </span>
              </div>
            ) : creatives.length === 0 ? (
              <div className="admin-builders__state">
                <strong>No creatives found</strong>
                <span>
                  There are no Mars Pixel creatives matching
                  this status.
                </span>
              </div>
            ) : (
              <div className="admin-mars-ads__grid">
                {creatives.map((creative) => {
                  const busy =
                    moderatingId === creative.creativeId;

                  return (
                    <article
                      className="admin-mars-ads__card"
                      key={creative.creativeId}
                    >
                      <div className="admin-mars-ads__image">
                        <img
                          src={creative.imageUrl}
                          alt={creative.title}
                          loading="lazy"
                        />
                      </div>

                      <div className="admin-mars-ads__body">
                        <div className="admin-mars-ads__heading">
                          <div>
                            <span>
                              {creative.advertiserName ||
                                "Unnamed advertiser"}
                            </span>
                            <h2>{creative.title}</h2>
                          </div>

                          <span
                            className={`admin-mars-ads__status admin-mars-ads__status--${creative.creativeStatus}`}
                          >
                            {creative.creativeStatus
                              .replace("_", " ")}
                          </span>
                        </div>

                        {creative.description ? (
                          <p>
                            {creative.description}
                          </p>
                        ) : null}

                        <div className="admin-mars-ads__meta">
                          <span>
                            {creative.pixelCount} PIXELS
                          </span>
                          <span>
                            {creative.width}×{creative.height}
                          </span>
                          <span>
                            X {creative.xStart} · Y{" "}
                            {creative.yStart}
                          </span>
                        </div>

                        <a
                          className="admin-mars-ads__destination"
                          href={creative.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {creative.destinationUrl}
                          <ExternalLink size={14} />
                        </a>

                        {creative.creativeStatus ===
                        "under_review" ? (
                          <div className="admin-mars-ads__actions">
                            <button
                              type="button"
                              className="admin-mars-ads__approve"
                              disabled={
                                moderatingId !== null
                              }
                              onClick={() =>
                                void moderate(
                                  creative.creativeId,
                                  "approve",
                                )
                              }
                            >
                              <Check size={16} />
                              {busy
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              className="admin-mars-ads__reject"
                              disabled={
                                moderatingId !== null
                              }
                              onClick={() =>
                                void moderate(
                                  creative.creativeId,
                                  "reject",
                                )
                              }
                            >
                              <X size={16} />
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="admin-builders__pagination">
              <span>
                Showing page {page + 1} · Up to{" "}
                {PAGE_SIZE} creatives per page
              </span>

              <div>
                <button
                  type="button"
                  disabled={!canGoBack || loading}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(current - 1, 0),
                    )
                  }
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={!canGoForward || loading}
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </AdminLayout>
  );
}
