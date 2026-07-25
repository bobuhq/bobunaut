import type { IdentityProvider } from "../../../core/models/Builder";

interface IdentityCardProps {
  provider: IdentityProvider;
  label: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  communityUrl?: string;
  disabled?: boolean;
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
  communityUrl,
  disabled = false,
  onComplete,
}: IdentityCardProps) {
  const handleAction = async (): Promise<void> => {
    if (disabled) {
      return;
    }

    await onComplete(provider);
  };

  const statusLabel = disabled
    ? "Coming Soon"
    : completed
      ? "Completed"
      : "Required";

  return (
    <article
      className={[
        "identity-task",
        completed ? "is-complete" : "",
        disabled ? "is-disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div>
        <span className="identity-task__status">
          {statusLabel}
        </span>

        <h3>{label}</h3>
        <p>{description}</p>
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
