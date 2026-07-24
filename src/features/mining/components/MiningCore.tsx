import { Pickaxe } from "lucide-react";

type MiningCoreProps = {
  isActive: boolean;
  remainingTime: string;
  sessionProgress: number;
  onActivate: () => void;
};

export default function MiningCore({
  isActive,
  remainingTime,
  sessionProgress,
  onActivate,
}: MiningCoreProps) {
  return (
    <div className="mining-core">
      <div className="mining-core-content">
        <div className="mining-orb">
          <Pickaxe size={48} />
        </div>

        <div className="mining-status-label">
          Mining Status
        </div>

        <div
          className={`mining-status-value ${
            isActive ? "active" : ""
          }`}
        >
          {isActive ? "ACTIVE" : "INACTIVE"}
        </div>

        <div className="mining-timer">
          {isActive ? remainingTime : "24:00:00"}
        </div>

        <div className="mining-progress-track">
          <div
            className="mining-progress-bar"
            style={{
              width: `${sessionProgress}%`,
            }}
          />
        </div>

        <button
          type="button"
          className="mining-button"
          onClick={onActivate}
          disabled={isActive}
        >
          <Pickaxe size={19} />

          {isActive
            ? "Mining Active"
            : "Activate Mining"}
        </button>
      </div>
    </div>
  );
}
