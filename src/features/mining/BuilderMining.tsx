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
      label: "Total GP",
      value: (
        miningState?.walletGp ?? 0
      ).toLocaleString("en-US"),
      detail: "Locked until Wallet Activation",
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
          min-height: 560px;
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

        .mining-orbit-system {
          position: relative;
          display: grid;
          width: 250px;
          height: 210px;
          place-items: center;
          isolation: isolate;
        }

        .mining-orbit-glow {
          position: absolute;
          inset: 16px 30px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle,
              rgba(118, 75, 255, 0.3),
              rgba(54, 219, 255, 0.09) 42%,
              transparent 72%
            );
          filter: blur(14px);
          pointer-events: none;
        }

        .mining-orbit-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          border: 1px solid rgba(150, 122, 255, 0.46);
          border-radius: 50%;
          transform-origin: center;
          pointer-events: none;
        }

        .mining-orbit-ring::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          background:
            conic-gradient(
              from 0deg,
              #5de0ff,
              #795cff,
              #ff4f8f,
              #ffb43c,
              #5df59b,
              #5de0ff
            );
          opacity: 0.62;
          filter: blur(2px);
          mask:
            linear-gradient(#000 0 0)
              content-box,
            linear-gradient(#000 0 0);
          -webkit-mask:
            linear-gradient(#000 0 0)
              content-box,
            linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          padding: 1px;
        }

        .mining-orbit-ring-outer {
          width: 232px;
          height: 166px;
          margin-left: -116px;
          margin-top: -83px;
          transform: rotate(-8deg);
          animation:
            bobu-orbit-clockwise 26s
            linear infinite;
        }

        .mining-orbit-ring-inner {
          width: 184px;
          height: 128px;
          margin-left: -92px;
          margin-top: -64px;
          border-color:
            rgba(77, 218, 255, 0.34);
          transform: rotate(13deg);
          animation:
            bobu-orbit-counterclockwise 19s
            linear infinite;
        }

        .mining-planet {
          position: absolute;
          display: block;
          width: 18px;
          height: 18px;
          border: 1px solid
            rgba(255, 255, 255, 0.55);
          border-radius: 50%;
          box-shadow:
            inset -4px -4px 8px
              rgba(0, 0, 0, 0.32),
            0 0 16px currentColor;
        }

        .mining-planet::after {
          content: "";
          position: absolute;
          left: 3px;
          top: 3px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background:
            rgba(255, 255, 255, 0.72);
          filter: blur(0.5px);
        }

        .mining-planet-green {
          left: 12px;
          top: 18px;
          width: 25px;
          height: 25px;
          color: #4cf29c;
          background:
            radial-gradient(
              circle at 35% 30%,
              #b8ffd8,
              #2ee77e 42%,
              #075837
            );
        }

        .mining-planet-red {
          right: 8px;
          top: 25px;
          width: 23px;
          height: 23px;
          color: #ff594f;
          background:
            radial-gradient(
              circle at 35% 30%,
              #ffd0c9,
              #ff4b40 42%,
              #731812
            );
        }

        .mining-planet-blue {
          left: 0;
          bottom: 29px;
          width: 22px;
          height: 22px;
          color: #3c9dff;
          background:
            radial-gradient(
              circle at 35% 30%,
              #d6f1ff,
              #278dff 42%,
              #123375
            );
        }

        .mining-planet-orange {
          right: 41px;
          bottom: -4px;
          width: 26px;
          height: 26px;
          color: #ffae32;
          background:
            radial-gradient(
              circle at 35% 30%,
              #fff0b8,
              #ff9e1f 42%,
              #74400a
            );
        }

        .mining-planet-purple {
          right: -7px;
          top: 46px;
          width: 24px;
          height: 24px;
          color: #bf67ff;
          background:
            radial-gradient(
              circle at 35% 30%,
              #f0d2ff,
              #a947f3 42%,
              #43206d
            );
        }

        .mining-planet-cyan {
          left: 13px;
          bottom: 22px;
          width: 14px;
          height: 14px;
          color: #41e8ff;
          background:
            radial-gradient(
              circle at 35% 30%,
              #ddfbff,
              #28d9f5 45%,
              #0d5260
            );
        }

        .mining-planet-pink {
          left: 78px;
          top: -8px;
          width: 12px;
          height: 12px;
          color: #ff62c7;
          background:
            radial-gradient(
              circle at 35% 30%,
              #ffe0f6,
              #ff4ab9 45%,
              #6e174f
            );
        }

        .mining-bobu-shell {
          position: relative;
          z-index: 3;
          display: grid;
          width: 154px;
          height: 154px;
          place-items: center;
          overflow: hidden;
          border: 2px solid
            rgba(205, 139, 255, 0.78);
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 50% 45%,
              rgba(130, 71, 255, 0.32),
              rgba(20, 10, 52, 0.94) 72%
            );
          box-shadow:
            0 0 18px rgba(173, 83, 255, 0.58),
            0 0 48px rgba(102, 58, 255, 0.4),
            inset 0 0 25px
              rgba(181, 107, 255, 0.22);
          animation:
            bobu-float 3.4s
            ease-in-out infinite;
        }

        .mining-bobu-shell::before {
          content: "";
          position: absolute;
          inset: -7px;
          z-index: -1;
          border: 1px solid
            rgba(189, 104, 255, 0.52);
          border-radius: 50%;
          box-shadow:
            0 0 26px
              rgba(158, 72, 255, 0.52);
          animation:
            bobu-avatar-pulse 3s
            ease-in-out infinite;
        }

        .mining-bobu-character {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          object-position: center;
          user-select: none;
          pointer-events: none;
          transform: scale(1.03);
          filter:
            saturate(1.08)
            contrast(1.04)
            drop-shadow(
              0 0 12px
              rgba(160, 83, 255, 0.38)
            );
        }

        .mining-claim-badge {
          position: absolute;
          right: 7px;
          bottom: 21px;
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 1px solid
            rgba(255, 255, 255, 0.62);
          border-radius: 50%;
          color: #ffffff;
          background:
            linear-gradient(
              135deg,
              #48e3a2,
              #368dff
            );
          box-shadow:
            0 0 25px
              rgba(72, 227, 162, 0.62);
        }

        .mining-orbit-system.is-active
        .mining-orbit-glow {
          animation:
            bobu-glow-pulse 2.8s
            ease-in-out infinite;
        }

        @keyframes bobu-orbit-clockwise {
          from {
            transform: rotate(-8deg);
          }

          to {
            transform: rotate(352deg);
          }
        }

        @keyframes bobu-orbit-counterclockwise {
          from {
            transform: rotate(13deg);
          }

          to {
            transform: rotate(-347deg);
          }
        }

        @keyframes bobu-float {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes bobu-avatar-pulse {
          0%,
          100% {
            opacity: 0.62;
            transform: scale(0.97);
          }

          50% {
            opacity: 1;
            transform: scale(1.04);
          }
        }

        @keyframes bobu-glow-pulse {
          0%,
          100% {
            opacity: 0.72;
            transform: scale(0.96);
          }

          50% {
            opacity: 1;
            transform: scale(1.04);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mining-orbit-ring,
          .mining-bobu-shell,
          .mining-orbit-glow {
            animation: none !important;
          }
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

        .mining-timer-block {
          display: grid;
          justify-items: center;
          gap: 7px;
          margin-top: 14px;
        }

        .mining-timer-label {
          color: rgba(225, 231, 255, 0.5);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .mining-timer {
          font-size: clamp(38px, 6vw, 62px);
          font-weight: 900;
          letter-spacing: 0.05em;
          font-variant-numeric: tabular-nums;
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
                  ? "Your 24-hour mining session is complete. Claim the earned GP to your Personal GP balance."
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
