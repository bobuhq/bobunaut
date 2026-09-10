import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Image,
  Pencil,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

import {
  AdminMarsPixelAdsService,
  type AdminMarsPixelAllocation,
  type AdminMarsPixelAllocationAction,
} from "../../core/admin/AdminMarsPixelAdsService";
import { useAdminAccess } from "../../core/admin/useAdminAccess";
import { useAdminMarsPixelAds } from "../../core/admin/useAdminMarsPixelAds";
import { AdminLayout } from "./AdminLayout";
import "./AdminDashboard.css";

type FilterValue =
  | "all"
  | "owned"
  | "released"
  | "under_review"
  | "active"
  | "suspended"
  | "archived"
  | "no_creative";

type ActionDialogState = {
  allocation: AdminMarsPixelAllocation;
  action: AdminMarsPixelAllocationAction;
} | null;

type EditState = {
  allocation: AdminMarsPixelAllocation;
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  ctaLabel: string;
  linksJson: string;
  reason: string;
} | null;

function shortValue(
  value: string | null,
  start = 8,
  end = 6,
) {
  if (!value) {
    return "—";
  }

  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function formatSol(
  lamports: number | null,
) {
  if (lamports === null) {
    return "—";
  }

  return `${(lamports / 1_000_000_000).toLocaleString(
    undefined,
    {
      maximumFractionDigits: 9,
    },
  )} SOL`;
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

export default function AdminMarsPixelAds() {
  const {
    access,
    loading: accessLoading,
  } = useAdminAccess();

  const role = access?.role ?? "analyst";

  const canManage =
    Boolean(access?.active) &&
    (role === "owner" || role === "admin");

  const {
    allocations,
    loading,
    error,
    refresh,
  } = useAdminMarsPixelAds(canManage);

  const [filter, setFilter] =
    useState<FilterValue>("all");

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const [actionError, setActionError] =
    useState<string | null>(null);

  const [actionDialog, setActionDialog] =
    useState<ActionDialogState>(null);

  const [actionReason, setActionReason] =
    useState("");

  const [editState, setEditState] =
    useState<EditState>(null);

  const managedAllocations = useMemo(
    () =>
      allocations.filter(
        (allocation) =>
          allocation.allocationStatus === "owned",
      ),
    [allocations],
  );

  const filteredAllocations = useMemo(() => {
    return managedAllocations.filter((allocation) => {
      if (filter === "all" || filter === "owned") {
        return true;
      }

      if (filter === "no_creative") {
        return allocation.creativeId === null;
      }

      return allocation.creativeStatus === filter;
    });
  }, [managedAllocations, filter]);

  const ownedCount = managedAllocations.length;

  const noCreativeCount = managedAllocations.filter(
    (allocation) =>
      allocation.creativeId === null,
  ).length;

  async function moderate(
    allocation: AdminMarsPixelAllocation,
    decision: "approve" | "reject",
  ) {
    if (!allocation.creativeId) {
      return;
    }

    setBusyId(allocation.allocationId);
    setActionError(null);

    try {
      await AdminMarsPixelAdsService
        .moderateCreative(
          allocation.creativeId,
          decision,
        );

      await refresh();
    } catch (caughtError: unknown) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Moderation action failed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function openAction(
    allocation: AdminMarsPixelAllocation,
    action: AdminMarsPixelAllocationAction,
  ) {
    setActionError(null);
    setActionReason("");
    setActionDialog({
      allocation,
      action,
    });
  }

  async function confirmAction() {
    if (!actionDialog) {
      return;
    }

    if (actionReason.trim().length < 3) {
      setActionError(
        "A reason of at least 3 characters is required.",
      );
      return;
    }

    const {
      allocation,
      action,
    } = actionDialog;

    setBusyId(allocation.allocationId);
    setActionError(null);

    try {
      await AdminMarsPixelAdsService.manageAllocation(
        allocation.allocationId,
        action,
        actionReason.trim(),
      );

      setActionDialog(null);
      setActionReason("");
      await refresh();
    } catch (caughtError: unknown) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Allocation action failed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(
    allocation: AdminMarsPixelAllocation,
  ) {
    if (!allocation.creativeId) {
      return;
    }

    setActionError(null);

    setEditState({
      allocation,
      title: allocation.creativeTitle ?? "",
      description:
        allocation.creativeDescription ?? "",
      imageUrl:
        allocation.creativeImageUrl ?? "",
      destinationUrl:
        allocation.creativeDestinationUrl ?? "",
      ctaLabel:
        allocation.creativeCtaLabel ?? "",
      linksJson: JSON.stringify(
        allocation.creativeLinks ?? [],
        null,
        2,
      ),
      reason: "",
    });
  }

  async function saveEdit() {
    if (!editState?.allocation.creativeId) {
      return;
    }

    if (editState.reason.trim().length < 3) {
      setActionError(
        "A reason of at least 3 characters is required.",
      );
      return;
    }

    let links: unknown;

    try {
      links = JSON.parse(editState.linksJson || "[]");
    } catch {
      setActionError(
        "Links must contain valid JSON.",
      );
      return;
    }

    setBusyId(editState.allocation.allocationId);
    setActionError(null);

    try {
      await AdminMarsPixelAdsService.editCreative({
        creativeId:
          editState.allocation.creativeId,
        title: editState.title,
        description: editState.description,
        imageUrl: editState.imageUrl,
        destinationUrl:
          editState.destinationUrl,
        ctaLabel: editState.ctaLabel,
        links,
        reason: editState.reason.trim(),
      });

      setEditState(null);
      await refresh();
    } catch (caughtError: unknown) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Creative edit failed.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const actionLabel =
    actionDialog?.action === "hide"
      ? "Hide Ad"
      : actionDialog?.action === "restore"
        ? "Restore Ad"
        : actionDialog?.action === "remove_creative"
          ? "Remove Creative"
          : "Cancel & Release Territory";

  return (
    <AdminLayout role={role}>
      <section className="admin-dashboard">
        <div className="admin-dashboard__stars" />

        <div className="admin-dashboard__content">
          <header className="admin-dashboard__hero">
            <div>
              <span className="admin-dashboard__eyebrow">
                MARS PIXEL CONTROL
              </span>

              <h1>Mars Pixel Ads</h1>

              <p>
                Manage owned territories, advertiser creatives,
                moderation and Devnet payment context.
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

          {!accessLoading && !canManage ? (
            <section className="admin-builders__panel">
              <div className="admin-builders__state">
                <strong>
                  Owner or admin authority required
                </strong>
                <span>
                  Mars Pixel allocation management is currently
                  restricted to active owner/admin accounts.
                </span>
              </div>
            </section>
          ) : (
            <>
              <section className="admin-mars-ads__summary">
                <div>
                  <span>TOTAL TERRITORIES</span>
                  <strong>{allocations.length}</strong>
                </div>

                <div>
                  <span>OWNED</span>
                  <strong>{ownedCount}</strong>
                </div>

                <div>
                  <span>NO CREATIVE</span>
                  <strong>{noCreativeCount}</strong>
                </div>
              </section>

              <section className="admin-builders__toolbar admin-operations__toolbar">
                <div className="admin-mars-ads__filters">
                  <select
                    value={filter}
                    aria-label="Filter Mars Pixel territories"
                    onChange={(event) =>
                      setFilter(
                        event.target.value as FilterValue,
                      )
                    }
                  >
                    <option value="all">
                      All Territories
                    </option>
                    <option value="owned">Owned</option>
                    <option value="released">
                      Released
                    </option>
                    <option value="under_review">
                      Under Review
                    </option>
                    <option value="active">Active Ads</option>
                    <option value="suspended">
                      Hidden / Suspended
                    </option>
                    <option value="archived">
                      Archived Creative
                    </option>
                    <option value="no_creative">
                      No Creative
                    </option>
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
                      <span>ALLOCATION CONTROL</span>
                      <strong>
                        {loading
                          ? "Loading territories"
                          : `${filteredAllocations.length} of ${managedAllocations.length} territories`}
                      </strong>
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className="admin-builders__state">
                    <strong>
                      Unable to load Mars Pixel allocations
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
                    <strong>
                      Loading Mars Pixel territories
                    </strong>
                    <span>
                      Reading protected allocation and payment data.
                    </span>
                  </div>
                ) : filteredAllocations.length === 0 ? (
                  <div className="admin-builders__state">
                    <strong>No territories found</strong>
                    <span>
                      No Mars Pixel allocations match this filter.
                    </span>
                  </div>
                ) : (
                  <div className="admin-mars-ads__grid">
                    {filteredAllocations.map(
                      (allocation) => {
                        const busy =
                          busyId === allocation.allocationId;

                        return (
                          <article
                            className="admin-mars-ads__card"
                            key={allocation.allocationId}
                          >
                            <div className="admin-mars-ads__image">
                              {allocation.creativeImageUrl ? (
                                <img
                                  src={
                                    allocation.creativeImageUrl
                                  }
                                  alt={
                                    allocation.creativeTitle ??
                                    "Mars Pixel creative"
                                  }
                                  loading="lazy"
                                />
                              ) : (
                                <div className="admin-mars-ads__no-image">
                                  <Image size={26} />
                                  <span>NO CREATIVE IMAGE</span>
                                </div>
                              )}
                            </div>

                            <div className="admin-mars-ads__body">
                              <div className="admin-mars-ads__heading">
                                <div>
                                  <span>
                                    {allocation.advertiserName ||
                                      "No advertiser profile"}
                                  </span>

                                  <h2>
                                    {allocation.creativeTitle ||
                                      `Territory ${allocation.width}×${allocation.height}`}
                                  </h2>
                                </div>

                                <div className="admin-mars-ads__status-stack">
                                  <span
                                    className={`admin-mars-ads__status admin-mars-ads__status--${allocation.allocationStatus}`}
                                  >
                                    {allocation.allocationStatus}
                                  </span>

                                  {allocation.creativeStatus ? (
                                    <span
                                      className={`admin-mars-ads__status admin-mars-ads__status--${allocation.creativeStatus}`}
                                    >
                                      {allocation.creativeStatus.replace(
                                        "_",
                                        " ",
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {allocation.creativeDescription ? (
                                <p>
                                  {
                                    allocation.creativeDescription
                                  }
                                </p>
                              ) : null}

                              <div className="admin-mars-ads__meta">
                                <span>
                                  {allocation.pixelCount} PIXELS
                                </span>
                                <span>
                                  {allocation.width}×
                                  {allocation.height}
                                </span>
                                <span>
                                  X {allocation.xStart} · Y{" "}
                                  {allocation.yStart}
                                </span>
                                {allocation.colorKey ? (
                                  <span>
                                    {allocation.colorKey}
                                  </span>
                                ) : null}
                              </div>

                              <div className="admin-mars-ads__details">
                                <div>
                                  <span>BUILDER</span>
                                  <strong>
                                    {shortValue(
                                      allocation.ownerBuilderId,
                                    )}
                                  </strong>
                                </div>

                                <div>
                                  <span>WALLET</span>
                                  <strong>
                                    {shortValue(
                                      allocation.buyerWallet,
                                    )}
                                  </strong>
                                </div>

                                <div>
                                  <span>PAYMENT</span>
                                  <strong>
                                    {allocation.paymentStatus ??
                                      "—"}
                                  </strong>
                                </div>

                                <div>
                                  <span>AMOUNT</span>
                                  <strong>
                                    {formatSol(
                                      allocation.amountLamports,
                                    )}
                                  </strong>
                                </div>

                                <div>
                                  <span>NETWORK</span>
                                  <strong>
                                    {allocation.paymentNetwork ??
                                      "—"}
                                  </strong>
                                </div>

                                <div>
                                  <span>CREATED</span>
                                  <strong>
                                    {formatDate(
                                      allocation.createdAt,
                                    )}
                                  </strong>
                                </div>
                              </div>

                              {allocation.transactionSignature ? (
                                <div className="admin-mars-ads__signature">
                                  <span>TRANSACTION</span>
                                  <code>
                                    {shortValue(
                                      allocation.transactionSignature,
                                      12,
                                      10,
                                    )}
                                  </code>
                                </div>
                              ) : null}

                              {allocation.creativeDestinationUrl ? (
                                <a
                                  className="admin-mars-ads__destination"
                                  href={
                                    allocation.creativeDestinationUrl
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {
                                    allocation.creativeDestinationUrl
                                  }
                                  <ExternalLink size={14} />
                                </a>
                              ) : null}

                              {allocation.creativeStatus ===
                              "under_review" ? (
                                <div className="admin-mars-ads__actions">
                                  <button
                                    type="button"
                                    className="admin-mars-ads__approve"
                                    disabled={
                                      busyId !== null
                                    }
                                    onClick={() =>
                                      void moderate(
                                        allocation,
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
                                      busyId !== null
                                    }
                                    onClick={() =>
                                      void moderate(
                                        allocation,
                                        "reject",
                                      )
                                    }
                                  >
                                    <X size={16} />
                                    Reject
                                  </button>
                                </div>
                              ) : null}

                              {allocation.allocationStatus ===
                              "owned" ? (
                                <div className="admin-mars-ads__management">
                                  {allocation.creativeId ? (
                                    <button
                                      type="button"
                                      disabled={busyId !== null}
                                      onClick={() =>
                                        openEdit(allocation)
                                      }
                                    >
                                      <Pencil size={15} />
                                      Edit
                                    </button>
                                  ) : null}

                                  {allocation.creativeStatus ===
                                  "active" ? (
                                    <button
                                      type="button"
                                      disabled={busyId !== null}
                                      onClick={() =>
                                        openAction(
                                          allocation,
                                          "hide",
                                        )
                                      }
                                    >
                                      <EyeOff size={15} />
                                      Hide
                                    </button>
                                  ) : null}

                                  {allocation.creativeStatus ===
                                  "suspended" ? (
                                    <button
                                      type="button"
                                      disabled={busyId !== null}
                                      onClick={() =>
                                        openAction(
                                          allocation,
                                          "restore",
                                        )
                                      }
                                    >
                                      <Eye size={15} />
                                      Restore
                                    </button>
                                  ) : null}

                                  {allocation.creativeId &&
                                  allocation.creativeStatus !==
                                    "archived" ? (
                                    <button
                                      type="button"
                                      disabled={busyId !== null}
                                      onClick={() =>
                                        openAction(
                                          allocation,
                                          "remove_creative",
                                        )
                                      }
                                    >
                                      <RotateCcw size={15} />
                                      Remove Creative
                                    </button>
                                  ) : null}

                                  <button
                                    type="button"
                                    className="admin-mars-ads__danger"
                                    disabled={busyId !== null}
                                    onClick={() =>
                                      openAction(
                                        allocation,
                                        "release",
                                      )
                                    }
                                  >
                                    <Trash2 size={15} />
                                    Cancel & Release
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </section>

      {actionDialog ? (
        <div
          className="admin-mars-ads__modal-backdrop"
          role="presentation"
        >
          <div
            className="admin-mars-ads__modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-mars-ads__modal-heading">
              <div>
                <span>MARS PIXEL ADMIN ACTION</span>
                <h2>{actionLabel}</h2>
              </div>

              <button
                type="button"
                onClick={() => setActionDialog(null)}
              >
                <X size={18} />
              </button>
            </div>

            {actionDialog.action === "release" ? (
              <div className="admin-mars-ads__warning">
                This releases the territory and makes the pixels
                available again. It does not send a SOL refund.
                Payment and transaction history remain preserved.
              </div>
            ) : null}

            <label>
              Administrative reason
              <textarea
                value={actionReason}
                maxLength={500}
                rows={4}
                placeholder="Required for immutable audit history"
                onChange={(event) =>
                  setActionReason(event.target.value)
                }
              />
            </label>

            <div className="admin-mars-ads__modal-actions">
              <button
                type="button"
                onClick={() => setActionDialog(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  actionDialog.action === "release"
                    ? "admin-mars-ads__danger"
                    : "admin-mars-ads__approve"
                }
                disabled={busyId !== null}
                onClick={() => void confirmAction()}
              >
                {busyId
                  ? "Processing..."
                  : actionLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editState ? (
        <div
          className="admin-mars-ads__modal-backdrop"
          role="presentation"
        >
          <div
            className="admin-mars-ads__modal admin-mars-ads__modal--wide"
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-mars-ads__modal-heading">
              <div>
                <span>MARS PIXEL CREATIVE</span>
                <h2>Edit Creative</h2>
              </div>

              <button
                type="button"
                onClick={() => setEditState(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-mars-ads__form-grid">
              <label>
                Territory name
                <input
                  value={editState.title}
                  onChange={(event) =>
                    setEditState({
                      ...editState,
                      title: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                CTA label
                <input
                  value={editState.ctaLabel}
                  maxLength={30}
                  onChange={(event) =>
                    setEditState({
                      ...editState,
                      ctaLabel: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            <label>
              Description
              <textarea
                value={editState.description}
                rows={3}
                onChange={(event) =>
                  setEditState({
                    ...editState,
                    description: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Image URL
              <input
                value={editState.imageUrl}
                placeholder="https://..."
                onChange={(event) =>
                  setEditState({
                    ...editState,
                    imageUrl: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Destination URL
              <input
                value={editState.destinationUrl}
                placeholder="https://..."
                onChange={(event) =>
                  setEditState({
                    ...editState,
                    destinationUrl:
                      event.target.value,
                  })
                }
              />
            </label>

            <label>
              Links JSON
              <textarea
                value={editState.linksJson}
                rows={6}
                spellCheck={false}
                onChange={(event) =>
                  setEditState({
                    ...editState,
                    linksJson: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Administrative reason
              <textarea
                value={editState.reason}
                maxLength={500}
                rows={3}
                placeholder="Required for immutable audit history"
                onChange={(event) =>
                  setEditState({
                    ...editState,
                    reason: event.target.value,
                  })
                }
              />
            </label>

            <div className="admin-mars-ads__modal-actions">
              <button
                type="button"
                onClick={() => setEditState(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-mars-ads__approve"
                disabled={busyId !== null}
                onClick={() => void saveEdit()}
              >
                <Check size={16} />
                {busyId
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
