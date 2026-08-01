import { CheckCircle2, Pickaxe } from "lucide-react";

type MiningCoreProps = {
  isActive: boolean;
  claimable: boolean;
  busy: boolean;
  remainingTime: string;
  sessionProgress: number;
  sessionEarnedGp: number;
  onAction: () => void;
};

export default function MiningCore({
  isActive,
  claimable,
  busy,
  remainingTime,
  sessionProgress,
  sessionEarnedGp,
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
        <div
          className={`mining-orbit-system ${
            isActive ? "is-active" : ""
          }`}
          aria-label="BOBU mining orbit"
        >
          <div className="mining-orbit-glow" />

          <div className="mining-orbit-ring mining-orbit-ring-outer">
            <span className="mining-planet mining-planet-green" />
            <span className="mining-planet mining-planet-red" />
            <span className="mining-planet mining-planet-blue" />
            <span className="mining-planet mining-planet-orange" />
          </div>

          <div className="mining-orbit-ring mining-orbit-ring-inner">
            <span className="mining-planet mining-planet-purple" />
            <span className="mining-planet mining-planet-cyan" />
            <span className="mining-planet mining-planet-pink" />
          </div>

          <div className="mining-bobu-shell">
            <img
              className="mining-bobu-character"
              src="/images/galaxy/bobu-builder-space.webp"
              alt="BOBU"
              draggable={false}
            />

            {claimable && (
              <div className="mining-claim-badge">
                <CheckCircle2 size={25} />
              </div>
            )}
          </div>
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

        <div className="mining-core-verification">
          <CheckCircle2 size={13} />
          Server Verified
        </div>

        <div className="mining-timer-block">
          <span className="mining-timer-label">
            Time Remaining
          </span>

          <div className="mining-timer">
            {isActive
              ? remainingTime
              : claimable
                ? "00:00:00"
                : "24:00:00"}
          </div>
        </div>

        <div className="mining-live-earned">
          <span>Current Session</span>

          <strong>
            {sessionEarnedGp.toFixed(5)} GP
          </strong>
        </div>

        <div className="mining-progress-meta">
          <span>Session Progress</span>

          <strong>
            {(claimable
              ? 100
              : sessionProgress
            ).toFixed(2)}%
          </strong>
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
