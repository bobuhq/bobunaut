import {
  Clock3,
  Gem,
  Orbit,
  Sparkles,
  Zap,
} from "lucide-react";

import MiningCore from "./components/MiningCore";
import MiningHero from "./components/MiningHero";
import { useBuilderMiningSession } from "./hooks/useBuilderMiningSession";

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000),
  );

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function BuilderMining() {
  const {
    miningState,
    busy,
    loading,
    errorMessage,
    showActivation,
    remainingTime,
    sessionProgress,
    sessionEarnedGp,
    gpPerHour,
    gpPerSecond,
    isActive,
    claimable,
    handleMiningAction,
  } = useBuilderMiningSession();

  const activeReferralCount = Math.min(
    Math.max(
      miningState?.activeReferralCount ?? 0,
      0,
    ),
    25,
  );

  const referralBoostGp =
    activeReferralCount * 2;

  const statCards = [
    {
      label: "Mining Rate",
      value: `${gpPerHour.toFixed(2)} GP / hour`,
      detail: `${gpPerSecond.toFixed(
        6,
      )} GP / second`,
      icon: Zap,
    },
    {
      label: "Wallet GP",
      value: (
        miningState?.walletGp ?? 0
      ).toLocaleString("en-US"),
      detail: "Available Builder balance",
      icon: Gem,
    },
    {
      label: "Referral Boost",
      value: `+${referralBoostGp} GP / 24h`,
      detail:
        `${activeReferralCount} / 25 active Builders`,
      icon: Orbit,
    },
    {
      label: "Total Reward",
      value: `${
        miningState?.rewardGp ?? 25
      } GP / 24h`,
      detail: "Base reward + referral boost",
      icon: Clock3,
    },
  ];

  return (
    <section className="mining-page">
      <style>{`
        .mining-page {
          width: min(1120px, calc(100% - 40px));
          margin: 0 auto;
          padding: 145px 0 72px;
          color: #ffffff;
        }

        .mining-hero {
          padding: 32px;
          border: 1px solid rgba(139, 112, 255, 0.24);
          border-radius: 28px;
          background:
            radial-gradient(
              circle at 85% 15%,
              rgba(91, 209, 255, 0.15),
              transparent 32%
            ),
            radial-gradient(
              circle at 10% 90%,
              rgba(132, 76, 255, 0.2),
              transparent 35%
            ),
            linear-gradient(
              135deg,
              rgba(20, 14, 52, 0.95),
              rgba(6, 15, 31, 0.95)
            );
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .mining-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          color: #8de7ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .mining-title {
          margin: 0;
          font-size: clamp(38px, 6vw, 68px);
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .mining-description {
          max-width: 660px;
          margin: 18px 0 0;
          color: rgba(229, 234, 255, 0.7);
          font-size: 16px;
          line-height: 1.7;
        }

        .mining-dashboard {
          display: grid;
          grid-template-columns:
            minmax(0, 1.35fr)
            minmax(280px, 0.65fr);
          gap: 20px;
          margin-top: 24px;
        }

        .mining-core,
        .mining-session-panel,
        .mining-stat {
          border: 1px solid rgba(148, 127, 255, 0.18);
          background: rgba(8, 14, 32, 0.74);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .mining-core {
          position: relative;
          display: grid;
          min-height: 430px;
          place-items: center;
          overflow: hidden;
          padding: 36px;
          border-radius: 28px;
        }

        .mining-core::before {
          content: "";
          position: absolute;
          width: 350px;
          height: 350px;
          border: 1px solid rgba(102, 222, 255, 0.14);
          border-radius: 50%;
          box-shadow:
            0 0 70px rgba(102, 97, 255, 0.2),
            inset 0 0 70px rgba(56, 211, 255, 0.08);
        }

        .mining-core-content {
          position: relative;
          z-index: 1;
          display: grid;
          justify-items: center;
          text-align: center;
        }

        .mining-orb {
          display: grid;
          width: 118px;
          height: 118px;
          place-items: center;
          border: 1px solid rgba(130, 230, 255, 0.56);
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 35% 30%,
              rgba(212, 174, 255, 0.95),
              rgba(116, 70, 255, 0.56) 36%,
              rgba(22, 25, 73, 0.96) 74%
            );
          box-shadow:
            0 0 42px rgba(118, 83, 255, 0.5),
            0 0 85px rgba(77, 211, 255, 0.14);
        }

        .mining-status-label {
          margin-top: 24px;
          color: rgba(225, 231, 255, 0.6);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .mining-status-value {
          margin-top: 7px;
          font-size: 30px;
          font-weight: 900;
          letter-spacing: 0.04em;
        }

        .mining-status-value.active {
          color: #72f7c5;
          text-shadow:
            0 0 24px rgba(114, 247, 197, 0.36);
        }

        .mining-timer {
          margin-top: 14px;
          font-size: clamp(38px, 6vw, 62px);
          font-weight: 900;
          letter-spacing: 0.05em;
        }

        .mining-live-earned {
          display: grid;
          gap: 6px;
          margin-top: 18px;
          text-align: center;
        }

        .mining-live-earned span {
          color: rgba(225, 231, 255, 0.56);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .mining-live-earned strong {
          color: #72f7c5;
          font-size: 22px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          text-shadow:
            0 0 18px rgba(114, 247, 197, 0.28);
        }

        .mining-progress-meta {
          display: flex;
          width: min(380px, 100%);
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 20px;
          color: rgba(225, 231, 255, 0.54);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .mining-progress-meta strong {
          color: #8de7ff;
          font-variant-numeric: tabular-nums;
        }

        .mining-progress-track {
          width: min(380px, 100%);
          height: 8px;
          margin-top: 22px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .mining-progress-bar {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(90deg, #835cff, #5de0ff);
          transition: width 0.5s ease;
        }

        .mining-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-width: 230px;
          margin-top: 25px;
          padding: 15px 24px;
          border: 1px solid rgba(133, 230, 255, 0.52);
          border-radius: 16px;
          color: #ffffff;
          font: inherit;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          background:
            linear-gradient(
              120deg,
              rgba(117, 72, 255, 0.96),
              rgba(58, 183, 255, 0.9)
            );
          box-shadow:
            0 14px 34px rgba(82, 101, 255, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transition:
            transform 0.2s ease,
            opacity 0.2s ease;
        }

        .mining-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .mining-button:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .mining-side {
          display: grid;
          gap: 16px;
        }

        .mining-session-panel {
          padding: 24px;
          border-radius: 24px;
        }

        .mining-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .mining-panel-heading h2 {
          margin: 0;
          font-size: 18px;
        }

        .mining-live-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${
            isActive ? "#65f6bf" : "#77809b"
          };
          box-shadow: ${
            isActive
              ? "0 0 18px rgba(101, 246, 191, 0.8)"
              : "none"
          };
        }

        .mining-session-copy {
          margin: 18px 0 0;
          color: rgba(221, 228, 255, 0.65);
          line-height: 1.65;
        }

        .mining-session-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 20px;
          color: #9edfff;
          font-weight: 800;
        }

        .mining-stats {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 20px;
        }

        .mining-stat {
          padding: 22px;
          border-radius: 22px;
        }

        .mining-stat-icon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 1px solid rgba(111, 215, 255, 0.25);
          border-radius: 14px;
          background: rgba(99, 82, 255, 0.12);
          color: #9eeaff;
        }

        .mining-stat-label {
          margin-top: 16px;
          color: rgba(220, 226, 255, 0.58);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .mining-stat-detail {
          display: block;
          margin-top: 7px;
          color: rgba(216, 223, 255, 0.48);
          font-size: 11px;
          line-height: 1.4;
        }

        .mining-stat-value {
          margin-top: 7px;
          font-size: 21px;
          font-weight: 900;
        }

        .mining-activation {
          position: fixed;
          inset: 0;
          z-index: 2000;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(1, 5, 16, 0.84);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .mining-activation-card {
          display: grid;
          justify-items: center;
          width: min(460px, 100%);
          padding: 42px;
          border: 1px solid rgba(119, 227, 255, 0.36);
          border-radius: 30px;
          text-align: center;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(125, 82, 255, 0.36),
              transparent 45%
            ),
            rgba(7, 13, 31, 0.98);
          box-shadow:
            0 0 80px rgba(99, 83, 255, 0.25);
        }

        .mining-activation-card h2 {
          margin: 24px 0 0;
          font-size: 28px;
        }

        .mining-activation-card p {
          margin: 12px 0 0;
          color: rgba(221, 229, 255, 0.68);
        }

        @media (max-width: 860px) {
          .mining-dashboard {
            grid-template-columns: 1fr;
          }

          .mining-core {
            min-height: 390px;
            padding: 28px 18px;
          }
        }

        @media (max-width: 620px) {
          .mining-page {
            width: min(100% - 24px, 1120px);
            padding-top: 126px;
          }

          .mining-hero {
            padding: 24px 20px;
            border-radius: 24px;
          }

          .mining-stats {
            grid-template-columns: 1fr;
          }

          .mining-timer {
            font-size: 38px;
          }
        }
      `}</style>

      <MiningHero />

      <div className="mining-dashboard">
        <MiningCore
          isActive={isActive}
          claimable={claimable}
          busy={busy || loading}
          remainingTime={formatRemaining(remainingTime)}
          sessionProgress={sessionProgress}
          sessionEarnedGp={sessionEarnedGp}
          onAction={handleMiningAction}
        />

        <div className="mining-side">
          <div className="mining-session-panel">
            <div className="mining-panel-heading">
              <h2>Current Session</h2>

              <span className="mining-live-dot" />
            </div>

            <p className="mining-session-copy">
              {errorMessage
                ? errorMessage
                : claimable
                  ? "Your 24-hour mining session is complete. Claim the earned GP to your Builder wallet."
                  : isActive
                    ? `Mining is active with ${
                        miningState?.activeReferralCount ?? 0
                      } active Builders boosting your rate.`
                    : "Activate a server-verified 24-hour session. Active direct Builders increase your GP mining rate."}
            </p>

            <div className="mining-session-meta">
              <Clock3 size={18} />

              {loading
                ? "Synchronizing with the Universe..."
                : claimable
                  ? `${
                      miningState?.rewardGp ?? 0
                    } GP ready to claim`
                  : isActive
                    ? `${formatRemaining(
                        remainingTime,
                      )} remaining`
                    : "Ready for activation"}
            </div>
          </div>
        </div>
      </div>

      <div className="mining-stats">
        {statCards.map(
          ({ label, value, icon: Icon }) => (
            <article
              className="mining-stat"
              key={label}
            >
              <div className="mining-stat-icon">
                <Icon size={21} />
              </div>

              <div className="mining-stat-label">
                {label}
              </div>

              <div className="mining-stat-value">
                {value}
              </div>
            </article>
          ),
        )}
      </div>

      {showActivation && (
        <div className="mining-activation">
          <div className="mining-activation-card">
            <div className="mining-orb">
              <Sparkles size={48} />
            </div>

            <h2>
              {claimable
                ? "Mining GP Claimed"
                : "Mining Session Activated"}
            </h2>

            <p>
              {claimable
                ? "Your verified mining reward has been added to your GP wallet."
                : "Your server-verified 24-hour Builder Mining session has begun."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
