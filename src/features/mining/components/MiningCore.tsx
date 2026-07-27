import { CheckCircle2, Pickaxe } from "lucide-react";

type MiningCoreProps = {
  isActive: boolean;
  claimable: boolean;
  busy: boolean;
  remainingTime: string;
  sessionProgress: number;
  onAction: () => void;
};

export default function MiningCore({
  isActive,
  claimable,
  busy,
  remainingTime,
  sessionProgress,
  onAction,
}: MiningCoreProps) {
  const status = claimable
    ? "COMPLETED"
    : isActive
      ? "ACTIVE"
      : "INACTIVE";

  const buttonLabel = busy
    ? "Processing..."
    : claimable
      ? "Claim GP"
      : isActive
        ? "Mining Active"
        : "Activate Mining";

  return (
    <div className="mining-core">
      <div className="mining-core-content">
        <div className="mining-orb">
          {claimable ? (
            <CheckCircle2 size={48} />
          ) : (
            <Pickaxe size={48} />
          )}
        </div>

        <div className="mining-status-label">
          Mining Status
        </div>

        <div
          className={`mining-status-value ${
            isActive || claimable ? "active" : ""
          }`}
        >
          {status}
        </div>

        <div className="mining-timer">
          {isActive
            ? remainingTime
            : claimable
              ? "00:00:00"
              : "24:00:00"}
        </div>

        <div className="mining-progress-track">
          <div
            className="mining-progress-bar"
            style={{
              width: `${claimable ? 100 : sessionProgress}%`,
            }}
          />
        </div>

        <button
          type="button"
          className="mining-button"
          onClick={onAction}
          disabled={busy || isActive}
        >
          {claimable ? (
            <CheckCircle2 size={19} />
          ) : (
            <Pickaxe size={19} />
          )}

          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
