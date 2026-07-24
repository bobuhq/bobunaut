import { useEffect, useState } from "react";
import {
  Clock3,
  Flame,
  Gem,
  Orbit,
  Pickaxe,
  Sparkles,
  Zap,
} from "lucide-react";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const MINING_RATE = 0.25;
const MINING_RATE_PER_SECOND = MINING_RATE / 3600;

const SESSION_STORAGE_KEY = "bobu-mining-session-end";
const POINTS_STORAGE_KEY = "bobu-builder-points";

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
  const [now, setNow] = useState(Date.now());

  const [sessionEnd, setSessionEnd] = useState<number | null>(
    () => {
      const storedValue = localStorage.getItem(
        SESSION_STORAGE_KEY,
      );

      if (!storedValue) {
        return null;
      }

      const parsedValue = Number(storedValue);

      return parsedValue > Date.now()
        ? parsedValue
        : null;
    },
  );

  const [totalPoints, setTotalPoints] = useState(() => {
    const storedPoints = localStorage.getItem(
      POINTS_STORAGE_KEY,
    );

    return storedPoints ? Number(storedPoints) : 4250;
  });

  const [showActivation, setShowActivation] =
    useState(false);

  const remainingTime = sessionEnd
    ? Math.max(0, sessionEnd - now)
    : 0;

  const isActive = remainingTime > 0;

  const sessionProgress = isActive
    ? Math.min(
        100,
        ((SESSION_DURATION_MS - remainingTime) /
          SESSION_DURATION_MS) *
          100,
      )
    : 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (sessionEnd && sessionEnd <= now) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setSessionEnd(null);
    }
  }, [now, sessionEnd]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    setTotalPoints((currentPoints) => {
      const nextPoints =
        currentPoints + MINING_RATE_PER_SECOND;

      localStorage.setItem(
        POINTS_STORAGE_KEY,
        String(nextPoints),
      );

      return nextPoints;
    });
  }, [now, isActive]);

  const activateMining = () => {
    if (isActive) {
      return;
    }

    const nextSessionEnd =
      Date.now() + SESSION_DURATION_MS;

    const nextPoints = totalPoints + 1;

    localStorage.setItem(
      SESSION_STORAGE_KEY,
      String(nextSessionEnd),
    );

    localStorage.setItem(
      POINTS_STORAGE_KEY,
      String(nextPoints),
    );

    setSessionEnd(nextSessionEnd);
    setTotalPoints(nextPoints);
    setNow(Date.now());
    setShowActivation(true);

    window.setTimeout(() => {
      setShowActivation(false);
    }, 2200);
  };

  const statCards = [
    {
      label: "Mining Rate",
      value: `${MINING_RATE.toFixed(2)} BP / hour`,
      icon: Zap,
    },
    {
      label: "Total Builder Points",
      value: totalPoints.toLocaleString("en-US", {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6,
      }),
      icon: Gem,
    },
    {
      label: "Daily Streak",
      value: "16 Days",
      icon: Flame,
    },
    {
      label: "Galaxy Bonus",
      value: "+12%",
      icon: Orbit,
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

      <div className="mining-hero">
        <div className="mining-eyebrow">
          <Sparkles size={16} />
          BOBU Universe Protocol
        </div>

        <h1 className="mining-title">
          Builder Mining
        </h1>

        <p className="mining-description">
          Activate your daily mining session, collect
          Builder Points and strengthen your reputation
          across the BOBU Universe.
        </p>
      </div>

      <div className="mining-dashboard">
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
              {isActive
                ? formatRemaining(remainingTime)
                : "24:00:00"}
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
              onClick={activateMining}
              disabled={isActive}
            >
              <Pickaxe size={19} />

              {isActive
                ? "Mining Active"
                : "Activate Mining"}
            </button>
          </div>
        </div>

        <div className="mining-side">
          <div className="mining-session-panel">
            <div className="mining-panel-heading">
              <h2>Current Session</h2>
              <span className="mining-live-dot" />
            </div>

            <p className="mining-session-copy">
              {isActive
                ? "Your Builder Mining session is active. Keep exploring, completing missions and growing your galaxy."
                : "Activate your 24-hour session to begin earning Builder Points."}
            </p>

            <div className="mining-session-meta">
              <Clock3 size={18} />

              {isActive
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

            <h2>Mining Session Activated</h2>

            <p>
              Your 24-hour Builder Mining journey has
              begun.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}