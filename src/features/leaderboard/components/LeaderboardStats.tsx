import {
  Activity,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import type { LeaderboardEntry } from "../../../core/builder/services/LeaderboardService";
import { useLanguage } from "../../../core/language";
import { AnimatedNumber } from "./AnimatedNumber";

interface LeaderboardStatsProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardStats({
  entries,
}: LeaderboardStatsProps) {
  const { t } = useLanguage();
  const totalVisibleGp = entries.reduce(
    (total, entry) => total + entry.gp,
    0,
  );

  const leaderGp = entries[0]?.gp ?? 0;

  return (
    <section className="leaderboard-stats-grid">
      <style>{`
        .leaderboard-stats-grid {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 0 auto 22px;
        }

        .leaderboard-stat-card {
          display: flex;
          align-items: center;
          min-height: 92px;
          gap: 14px;
          padding: 16px 18px;
          border: 1px solid rgba(139, 159, 255, 0.14);
          border-radius: 21px;
          background:
            linear-gradient(
              145deg,
              rgba(29, 21, 68, 0.74),
              rgba(6, 20, 39, 0.76)
            );
          box-shadow:
            inset 0 1px rgba(255, 255, 255, 0.05),
            0 18px 40px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(18px);
        }

        .leaderboard-stat-icon {
          display: grid;
          flex: 0 0 46px;
          width: 46px;
          height: 46px;
          place-items: center;
          border: 1px solid rgba(119, 212, 255, 0.19);
          border-radius: 15px;
          color: #77e8ff;
          background:
            rgba(73, 171, 255, 0.075);
          box-shadow:
            0 0 20px rgba(60, 184, 255, 0.08);
        }

        .leaderboard-stat-copy span {
          display: block;
          margin-bottom: 6px;
          color: rgba(207, 214, 249, 0.52);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .leaderboard-stat-copy strong {
          color: white;
          font-size: clamp(18px, 2.4vw, 25px);
          letter-spacing: -0.04em;
        }

        @media (max-width: 720px) {
          .leaderboard-stats-grid {
            grid-template-columns: 1fr;
          }

          .leaderboard-stat-card {
            min-height: 76px;
          }
        }
      `}</style>

      <article className="leaderboard-stat-card">
        <div className="leaderboard-stat-icon">
          <Users size={21} />
        </div>

        <div className="leaderboard-stat-copy">
          <span>
            {t("leaderboard.stats.visibleBuilders")}
          </span>
          <strong>
            <AnimatedNumber value={entries.length} />
          </strong>
        </div>
      </article>

      <article className="leaderboard-stat-card">
        <div className="leaderboard-stat-icon">
          <Sparkles size={21} />
        </div>

        <div className="leaderboard-stat-copy">
          <span>
            {t("leaderboard.stats.top20Gp")}
          </span>
          <strong>
            <AnimatedNumber value={totalVisibleGp} /> GP
          </strong>
        </div>
      </article>

      <article className="leaderboard-stat-card">
        <div className="leaderboard-stat-icon">
          <Trophy size={21} />
        </div>

        <div className="leaderboard-stat-copy">
          <span>
            {t("leaderboard.stats.leadingBuilder")}
          </span>
          <strong>
            <AnimatedNumber value={leaderGp} /> GP
          </strong>
        </div>
      </article>
    </section>
  );
}
