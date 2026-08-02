import type { IdentityProvider } from "../../../core/models/Builder";

export type IdentityCardStatusTone =
  | "neutral"
  | "pending"
  | "success"
  | "error";

interface IdentityCardProps {
  provider: IdentityProvider;
  label: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  communityUrl?: string;
  disabled?: boolean;
  statusMessage?: string | null;
  statusTone?: IdentityCardStatusTone;
  onComplete: (
    provider: IdentityProvider,
  ) => void | Promise<void>;
}

export function IdentityCard({
  provider,
  label,
  description,
  completed,
  actionLabel,
  communityUrl: _communityUrl,
  disabled = false,
  statusMessage = null,
  statusTone = "neutral",
  onComplete,
}: IdentityCardProps) {
  const handleAction = async (): Promise<void> => {
    if (disabled || completed) {
      return;
    }

    await onComplete(provider);
  };

  const statusLabel = disabled
    ? "Coming Soon"
    : completed
      ? "Completed"
      : statusTone === "error"
        ? "Action Required"
        : statusTone === "pending"
          ? "In Progress"
          : "Required";

  return (
    <article
      className={[
        "identity-task",
        completed ? "is-complete" : "",
        disabled ? "is-disabled" : "",
        statusTone === "pending" ? "is-pending" : "",
        statusTone === "error" ? "has-error" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="identity-task__content">
        <span className="identity-task__status">
          {statusLabel}
        </span>

        <h3>{label}</h3>
        <p>{description}</p>

        {statusMessage && (
          <div
            className={[
              "identity-task__message",
              `is-${statusTone}`,
            ].join(" ")}
            role={
              statusTone === "error"
                ? "alert"
                : "status"
            }
            aria-live="polite"
          >
            <span className="identity-task__message-dot" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        className="identity-task__button"
        disabled={disabled || completed}
        onClick={handleAction}
      >
        {disabled
          ? "Coming Soon"
          : completed
            ? "Completed ✓"
            : actionLabel}
      </button>
    </article>
  );
}
