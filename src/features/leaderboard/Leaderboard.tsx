import {
  type CSSProperties,
  useEffect,
  useState,
} from "react";
import {
  Crown,
  Medal,
  Orbit,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import {
  leaderboardService,
  type LeaderboardEntry,
} from "../../core/builder/services/LeaderboardService";
import { useLanguage } from "../../core/language";
import { AnimatedNumber } from "./components/AnimatedNumber";
import { LeaderboardCinematicEffects } from "./components/LeaderboardCinematicEffects";
import { LeaderboardStats } from "./components/LeaderboardStats";

const shootingStars = Array.from(
  { length: 34 },
  (_, index) => ({
    id: index,
    top: `${4 + ((index * 17) % 88)}%`,
    left: `${-22 + ((index * 29) % 118)}%`,
    delay: `${(index * 0.37) % 8}s`,
    duration: `${2.4 + ((index * 13) % 24) / 10}s`,
    length: `${70 + ((index * 19) % 125)}px`,
    opacity: 0.42 + ((index * 7) % 50) / 100,
  }),
);

const cosmicBursts = Array.from(
  { length: 14 },
  (_, index) => ({
    id: index,
    top: `${8 + ((index * 31) % 80)}%`,
    left: `${5 + ((index * 43) % 90)}%`,
    delay: `${(index * 1.13) % 9}s`,
    size: `${50 + ((index * 23) % 110)}px`,
  }),
);

function getBuilderName(entry: LeaderboardEntry) {
  return (
    entry.displayName ??
    entry.username ??
    `Builder ${entry.builderId.slice(0, 6)}`
  );
}

function getInitials(entry: LeaderboardEntry) {
  const name = getBuilderName(entry);

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown size={22} />;
  if (rank === 2) return <Medal size={21} />;
  if (rank === 3) return <Medal size={21} />;

  return <span>#{rank}</span>;
}

export default function Leaderboard() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLeaderboard() {
      try {
        const [globalEntries, currentBuilderRank] =
          await Promise.all([
            leaderboardService.loadGlobalLeaderboard(20, 0),
            leaderboardService.loadMyRank(),
          ]);

        if (!mounted) return;

        setEntries(globalEntries);
        setMyRank(currentBuilderRank);
      } catch (loadError) {
        console.error(
          "Failed to load BOBU leaderboard:",
          loadError,
        );

        if (mounted) {
          setError(
              t("leaderboard.error.load"),
            );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadLeaderboard();

    return () => {
      mounted = false;
    };
  }, [t]);

  const podium = entries.slice(0, 3);
  const remainingEntries = entries.slice(3, 20);

  return (
    <section className="bobu-leaderboard-page">
      <LeaderboardCinematicEffects />

      <style>{`
        .bobu-leaderboard-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding:
            clamp(132px, 15vw, 164px)
            clamp(18px, 4vw, 54px)
            90px;
          color: #f8f7ff;
          isolation: isolate;
          background:
            radial-gradient(
              circle at 14% 18%,
              rgba(115, 59, 255, 0.2),
              transparent 28%
            ),
            radial-gradient(
              circle at 88% 22%,
              rgba(255, 111, 38, 0.16),
              transparent 25%
            ),
            radial-gradient(
              circle at 50% 78%,
              rgba(31, 210, 255, 0.12),
              transparent 35%
            ),
            linear-gradient(
              180deg,
              #070514 0%,
              #08091b 48%,
              #040712 100%
            );
        }

        .leaderboard-space-layer {
          position: absolute;
          inset: 0;
          z-index: -5;
          overflow: hidden;
          pointer-events: none;
        }

        .leaderboard-space-layer::before,
        .leaderboard-space-layer::after {
          content: "";
          position: absolute;
          inset: 0;
        }

        .leaderboard-space-layer::before {
          opacity: 0.72;
          background-image:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.95) 0 1px,
              transparent 1.6px
            ),
            radial-gradient(
              circle,
              rgba(107, 219, 255, 0.8) 0 1px,
              transparent 1.8px
            ),
            radial-gradient(
              circle,
              rgba(197, 147, 255, 0.75) 0 1px,
              transparent 1.6px
            );
          background-size:
            47px 47px,
            79px 79px,
            113px 113px;
          background-position:
            0 0,
            18px 27px,
            43px 12px;
          animation: leaderboard-stars-drift 75s linear infinite;
        }

        .leaderboard-space-layer::after {
          opacity: 0.3;
          filter: blur(30px);
          background:
            radial-gradient(
              ellipse at 30% 40%,
              rgba(115, 68, 255, 0.38),
              transparent 32%
            ),
            radial-gradient(
              ellipse at 75% 65%,
              rgba(20, 199, 255, 0.26),
              transparent 30%
            );
          animation: leaderboard-nebula 12s ease-in-out infinite;
        }

        .leaderboard-planet {
          position: absolute;
          z-index: -3;
          border-radius: 50%;
          pointer-events: none;
          animation:
            leaderboard-float 8s ease-in-out infinite,
            leaderboard-planet-spin 28s linear infinite;
        }

        .leaderboard-planet-purple {
          top: 150px;
          left: -78px;
          width: clamp(180px, 22vw, 320px);
          aspect-ratio: 1;
          background:
            radial-gradient(
              circle at 32% 28%,
              rgba(236, 218, 255, 0.94),
              rgba(141, 78, 255, 0.78) 18%,
              rgba(66, 24, 142, 0.96) 55%,
              rgba(16, 8, 42, 1) 79%
            );
          box-shadow:
            0 0 70px rgba(123, 74, 255, 0.35),
            inset -28px -34px 48px rgba(5, 3, 18, 0.75),
            inset 20px 16px 36px rgba(255, 255, 255, 0.12);
        }

        .leaderboard-planet-purple::before,
        .leaderboard-planet-purple::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 52%;
          width: 162%;
          height: 35%;
          border-radius: 50%;
          pointer-events: none;
          transform:
            translate(-50%, -50%)
            rotate(-13deg);
          transform-origin: center;
          animation:
            leaderboard-ring-drift
            150s
            linear
            infinite;
        }

        .leaderboard-planet-purple::before {
          z-index: -1;
          opacity: 0.82;
          background:
            repeating-radial-gradient(
              ellipse at center,
              transparent 0 47%,
              rgba(74, 43, 130, 0.08) 47.6% 49%,
              rgba(130, 85, 209, 0.18) 49.4% 51%,
              rgba(218, 189, 255, 0.28) 51.4% 53.5%,
              rgba(95, 58, 167, 0.21) 54% 56.5%,
              rgba(184, 136, 255, 0.16) 57% 59%,
              rgba(53, 29, 101, 0.11) 59.5% 62%,
              transparent 63% 72%
            );
          filter:
            blur(1.35px)
            drop-shadow(
              0 0 12px rgba(145, 100, 255, 0.16)
            );
        }

        .leaderboard-planet-purple::after {
          z-index: 3;
          clip-path: inset(49% 0 0 0);
          opacity: 0.9;
          background:
            repeating-radial-gradient(
              ellipse at center,
              transparent 0 46.5%,
              rgba(255, 246, 255, 0.14) 47% 48.2%,
              rgba(209, 174, 255, 0.38) 49% 51%,
              rgba(134, 86, 219, 0.43) 51.7% 54.5%,
              rgba(233, 210, 255, 0.22) 55.2% 56.4%,
              rgba(83, 49, 148, 0.3) 57% 59.8%,
              rgba(184, 132, 255, 0.18) 60.5% 62.2%,
              transparent 63.5% 72%
            );
          filter:
            blur(0.55px)
            drop-shadow(
              0 4px 5px rgba(12, 5, 31, 0.56)
            )
            drop-shadow(
              0 0 7px rgba(196, 150, 255, 0.19)
            );
        }

        .leaderboard-planet-orange {
          top: 105px;
          right: -58px;
          width: clamp(150px, 18vw, 255px);
          aspect-ratio: 1;
          overflow: hidden;
          animation-delay: -3s;
          background:
            repeating-linear-gradient(
              -8deg,
              transparent 0 9px,
              rgba(255, 239, 190, 0.06) 10px 14px,
              rgba(185, 63, 26, 0.08) 15px 20px
            ),
            radial-gradient(
              ellipse at 48% 18%,
              rgba(255, 244, 202, 0.46),
              transparent 26%
            ),
            radial-gradient(
              circle at 34% 28%,
              #ffe6ad,
              #ffad42 24%,
              #e5642c 52%,
              #8b2b27 72%,
              #351020 91%
            );
          box-shadow:
            0 0 0 1px rgba(255, 185, 91, 0.13),
            0 0 44px rgba(255, 121, 40, 0.25),
            0 0 82px rgba(255, 72, 35, 0.12),
            inset -30px -34px 48px rgba(47, 7, 19, 0.74),
            inset 17px 10px 28px rgba(255, 238, 192, 0.11);
        }

        .leaderboard-planet-orange::before {
          content: "";
          position: absolute;
          inset: -7%;
          border-radius: 50%;
          pointer-events: none;
          background:
            repeating-linear-gradient(
              -10deg,
              transparent 0 18px,
              rgba(255, 241, 204, 0.11) 19px 22px,
              transparent 23px 37px,
              rgba(118, 36, 31, 0.1) 38px 43px
            );
          mix-blend-mode: screen;
          opacity: 0.54;
          animation:
            leaderboard-orange-clouds
            42s
            linear
            infinite;
        }

        .leaderboard-planet-orange::after {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 30% 24%,
              rgba(255, 255, 230, 0.22),
              transparent 22%
            ),
            linear-gradient(
              92deg,
              rgba(101, 218, 255, 0.13),
              transparent 14% 76%,
              rgba(255, 121, 59, 0.08)
            );
          box-shadow:
            inset 4px 0 9px rgba(102, 226, 255, 0.11),
            inset -6px 0 12px rgba(255, 131, 58, 0.09);
        }

        .leaderboard-planet-ice {
          right: 7%;
          bottom: 5%;
          width: clamp(100px, 12vw, 170px);
          aspect-ratio: 1;
          opacity: 0.75;
          animation-delay: -5s;
          background:
            radial-gradient(
              circle at 32% 28%,
              #e6ffff,
              #71dcff 27%,
              #1d65aa 61%,
              #071c45 85%
            );
          box-shadow:
            0 0 52px rgba(61, 199, 255, 0.27),
            inset -20px -24px 35px rgba(3, 17, 48, 0.75);
        }

        .leaderboard-orbit-ring {
          position: absolute;
          z-index: -4;
          width: min(880px, 86vw);
          aspect-ratio: 1;
          top: 49%;
          left: 50%;
          border: 1px solid rgba(126, 179, 255, 0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%) rotate(-12deg);
          box-shadow:
            0 0 60px rgba(72, 90, 255, 0.04),
            inset 0 0 60px rgba(84, 205, 255, 0.03);
          animation: leaderboard-orbit 40s linear infinite;
        }

        .leaderboard-orbit-ring::before,
        .leaderboard-orbit-ring::after {
          content: "";
          position: absolute;
          border: 1px solid rgba(143, 98, 255, 0.09);
          border-radius: inherit;
        }

        .leaderboard-orbit-ring::before {
          inset: 10%;
        }

        .leaderboard-orbit-ring::after {
          inset: 24%;
        }

        .shooting-star {
          position: absolute;
          top: var(--star-top);
          left: var(--star-left);
          z-index: -1;
          width: var(--star-length);
          height: 2px;
          opacity: var(--star-opacity);
          border-radius: 999px;
          transform: rotate(-26deg);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(122, 216, 255, 0.15),
              rgba(255, 255, 255, 0.98)
            );
          filter: drop-shadow(
            0 0 7px rgba(110, 218, 255, 0.85)
          );
          animation:
            leaderboard-shooting-star
            var(--star-duration)
            linear
            var(--star-delay)
            infinite;
        }

        .shooting-star::after {
          content: "";
          position: absolute;
          right: -2px;
          top: 50%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          transform: translateY(-50%);
          background: #ffffff;
          box-shadow:
            0 0 8px #ffffff,
            0 0 15px #69dfff,
            0 0 25px rgba(127, 94, 255, 0.9);
        }

        .cosmic-burst {
          position: absolute;
          top: var(--burst-top);
          left: var(--burst-left);
          z-index: -2;
          width: var(--burst-size);
          height: var(--burst-size);
          border-radius: 50%;
          opacity: 0;
          background:
            repeating-conic-gradient(
              from 0deg,
              rgba(255, 255, 255, 0.95) 0deg 2deg,
              transparent 2deg 20deg
            );
          filter:
            blur(0.3px)
            drop-shadow(0 0 8px rgba(116, 207, 255, 0.9));
          animation:
            leaderboard-cosmic-burst
            9s
            ease-out
            var(--burst-delay)
            infinite;
        }

        .cosmic-burst::before {
          content: "";
          position: absolute;
          inset: 42%;
          border-radius: 50%;
          background: #fff;
          box-shadow:
            0 0 14px #fff,
            0 0 32px #66d9ff,
            0 0 55px #934fff;
        }

        .leaderboard-container {
          position: relative;
          z-index: 2;
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .leaderboard-hero {
          max-width: 820px;
          margin: 0 auto 42px;
          text-align: center;
        }

        .leaderboard-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 18px;
          padding: 8px 15px;
          border: 1px solid rgba(126, 210, 255, 0.22);
          border-radius: 999px;
          color: #85e9ff;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background: rgba(11, 18, 41, 0.64);
          box-shadow:
            inset 0 1px rgba(255, 255, 255, 0.06),
            0 0 28px rgba(59, 190, 255, 0.08);
          backdrop-filter: blur(16px);
        }

        .leaderboard-title {
          margin: 0;
          font-size: clamp(38px, 6vw, 76px);
          line-height: 0.98;
          font-weight: 950;
          letter-spacing: -0.055em;
          text-transform: uppercase;
          background:
            linear-gradient(
              110deg,
              #ffffff,
              #b7dfff 34%,
              #ba8cff 66%,
              #ffb15c
            );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(
            0 0 25px rgba(124, 104, 255, 0.2)
          );
        }

        .leaderboard-subtitle {
          max-width: 620px;
          margin: 20px auto 0;
          color: rgba(223, 227, 255, 0.68);
          font-size: clamp(15px, 2vw, 18px);
          line-height: 1.7;
        }

        .leaderboard-main-card {
          position: relative;
          overflow: hidden;
          padding: clamp(20px, 4vw, 38px);
          border: 1px solid rgba(143, 132, 255, 0.18);
          border-radius: 34px;
          background:
            linear-gradient(
              145deg,
              rgba(22, 17, 55, 0.84),
              rgba(7, 16, 37, 0.9)
            );
          box-shadow:
            0 34px 100px rgba(0, 0, 0, 0.42),
            0 0 60px rgba(79, 73, 255, 0.08),
            inset 0 1px rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px) saturate(135%);
        }

        .leaderboard-main-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 12% 15%,
              rgba(123, 82, 255, 0.14),
              transparent 28%
            ),
            radial-gradient(
              circle at 86% 8%,
              rgba(255, 156, 67, 0.09),
              transparent 25%
            );
        }

        .leaderboard-section-heading {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 28px;
        }

        .leaderboard-section-heading h2 {
          display: flex;
          align-items: center;
          gap: 11px;
          margin: 0;
          font-size: clamp(21px, 3vw, 30px);
          letter-spacing: -0.035em;
        }

        .leaderboard-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(44, 246, 167, 0.18);
          border-radius: 999px;
          color: #66ffc0;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.12em;
          background: rgba(17, 78, 61, 0.18);
        }

        .leaderboard-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #42ffae;
          box-shadow: 0 0 12px #42ffae;
          animation: leaderboard-live-pulse 1.5s ease-in-out infinite;
        }

        .leaderboard-podium {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: end;
          gap: 16px;
          margin-bottom: 24px;
        }

        .leaderboard-podium-card {
          position: relative;
          min-height: 220px;
          overflow: hidden;
          padding: 26px 20px 22px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 25px;
          text-align: center;
          background:
            linear-gradient(
              155deg,
              rgba(255, 255, 255, 0.075),
              rgba(255, 255, 255, 0.018)
            );
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .leaderboard-podium-card:hover {
          transform: translateY(-5px);
        }

        .leaderboard-podium-card.rank-1 {
          order: 2;
          min-height: 260px;
          border-color: rgba(255, 201, 87, 0.36);
          background:
            radial-gradient(
              circle at 50% 10%,
              rgba(255, 210, 100, 0.24),
              transparent 36%
            ),
            linear-gradient(
              155deg,
              rgba(97, 65, 16, 0.48),
              rgba(20, 17, 35, 0.8)
            );
          box-shadow:
            0 0 42px rgba(255, 186, 53, 0.12),
            inset 0 1px rgba(255, 246, 197, 0.12);
        }

        .leaderboard-podium-card.rank-2 {
          order: 1;
          border-color: rgba(193, 222, 255, 0.24);
        }

        .leaderboard-podium-card.rank-3 {
          order: 3;
          border-color: rgba(255, 143, 91, 0.24);
        }

        .leaderboard-podium-rank {
          position: absolute;
          top: 14px;
          right: 15px;
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border-radius: 50%;
          font-weight: 950;
          color: white;
          background: rgba(255, 255, 255, 0.08);
        }

        .rank-1 .leaderboard-podium-rank {
          color: #ffe081;
          background: rgba(255, 193, 65, 0.14);
          box-shadow: 0 0 18px rgba(255, 193, 65, 0.2);
        }

        .rank-2 .leaderboard-podium-rank {
          color: #dcecff;
        }

        .rank-3 .leaderboard-podium-rank {
          color: #ffad83;
        }

        .leaderboard-avatar {
          display: grid;
          width: 72px;
          height: 72px;
          margin: 18px auto 16px;
          place-items: center;
          border: 2px solid rgba(139, 214, 255, 0.38);
          border-radius: 50%;
          color: white;
          font-size: 20px;
          font-weight: 950;
          background:
            radial-gradient(
              circle at 35% 25%,
              rgba(192, 155, 255, 0.92),
              rgba(81, 52, 190, 0.9) 42%,
              rgba(12, 21, 55, 1) 76%
            );
          box-shadow:
            0 0 0 5px rgba(113, 77, 255, 0.08),
            0 0 28px rgba(96, 148, 255, 0.25);
        }

        .rank-1 .leaderboard-avatar {
          width: 86px;
          height: 86px;
          border-color: rgba(255, 218, 114, 0.64);
          background:
            radial-gradient(
              circle at 35% 25%,
              #fff5c7,
              #ffbd48 34%,
              #984416 70%,
              #301120 92%
            );
          box-shadow:
            0 0 0 6px rgba(255, 197, 79, 0.1),
            0 0 38px rgba(255, 184, 55, 0.32);
        }

        .leaderboard-builder-name {
          margin: 0;
          overflow: hidden;
          font-size: 17px;
          font-weight: 850;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-builder-level {
          margin-top: 7px;
          color: rgba(220, 224, 255, 0.58);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .leaderboard-builder-gp {
          margin-top: 17px;
          color: #75eaff;
          font-size: 17px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .rank-1 .leaderboard-builder-gp {
          color: #ffd773;
          font-size: 20px;
        }

        .leaderboard-list {
          position: relative;
          display: grid;
          gap: 9px;
        }

        .leaderboard-row {
          display: grid;
          grid-template-columns:
            62px
            minmax(150px, 1fr)
            100px
            140px;
          align-items: center;
          gap: 14px;
          min-height: 68px;
          padding: 10px 18px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 18px;
          background:
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.038),
              rgba(255, 255, 255, 0.016)
            );
          transition:
            transform 200ms ease,
            border-color 200ms ease,
            background 200ms ease,
            box-shadow 200ms ease;
        }

        .leaderboard-row:hover {
          transform: translateX(5px);
          border-color: rgba(112, 211, 255, 0.2);
          background:
            linear-gradient(
              90deg,
              rgba(107, 76, 255, 0.11),
              rgba(49, 207, 255, 0.05)
            );
          box-shadow: 0 0 28px rgba(78, 151, 255, 0.06);
        }

        .leaderboard-row-rank {
          color: #aea7ff;
          font-weight: 950;
        }

        .leaderboard-row-builder {
          display: flex;
          align-items: center;
          min-width: 0;
          gap: 12px;
        }

        .leaderboard-row-avatar {
          display: grid;
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid rgba(147, 187, 255, 0.2);
          border-radius: 50%;
          color: #f6f3ff;
          font-size: 12px;
          font-weight: 900;
          background:
            linear-gradient(
              145deg,
              rgba(132, 83, 255, 0.5),
              rgba(32, 92, 143, 0.45)
            );
        }

        .leaderboard-row-name {
          overflow: hidden;
          color: #f5f4ff;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-row-level {
          color: rgba(217, 221, 255, 0.65);
          font-size: 13px;
        }

        .leaderboard-row-gp {
          color: #69e8ff;
          font-weight: 900;
          text-align: right;
        }

        .leaderboard-my-rank {
          position: relative;
          display: grid;
          grid-template-columns:
            minmax(180px, 1.4fr)
            repeat(3, minmax(100px, 0.65fr));
          align-items: center;
          gap: 16px;
          margin-top: 22px;
          padding: 22px 24px;
          overflow: hidden;
          border: 1px solid rgba(110, 222, 255, 0.3);
          border-radius: 24px;
          background:
            radial-gradient(
              circle at 0% 50%,
              rgba(95, 71, 255, 0.24),
              transparent 35%
            ),
            linear-gradient(
              100deg,
              rgba(29, 24, 80, 0.9),
              rgba(7, 35, 58, 0.86)
            );
          box-shadow:
            0 0 36px rgba(73, 176, 255, 0.1),
            inset 0 1px rgba(255, 255, 255, 0.08);
        }

        .leaderboard-my-rank::after {
          content: "";
          position: absolute;
          top: -80%;
          left: -40%;
          width: 55%;
          height: 250%;
          transform: rotate(24deg);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.07),
              transparent
            );
          animation: leaderboard-card-shine 6s ease-in-out infinite;
        }

        .leaderboard-my-rank-title {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .leaderboard-my-rank-icon {
          display: grid;
          flex: 0 0 50px;
          width: 50px;
          height: 50px;
          place-items: center;
          border: 1px solid rgba(111, 225, 255, 0.3);
          border-radius: 16px;
          color: #7deaff;
          background: rgba(56, 184, 255, 0.08);
          box-shadow: 0 0 22px rgba(60, 204, 255, 0.1);
        }

        .leaderboard-my-rank-copy strong {
          display: block;
          color: white;
          font-size: 16px;
        }

        .leaderboard-my-rank-copy span {
          display: block;
          margin-top: 5px;
          overflow: hidden;
          color: rgba(217, 224, 255, 0.58);
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-rank-stat {
          position: relative;
          z-index: 2;
        }

        .leaderboard-rank-stat span {
          display: block;
          margin-bottom: 6px;
          color: rgba(199, 208, 243, 0.52);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .leaderboard-rank-stat strong {
          color: white;
          font-size: clamp(18px, 3vw, 25px);
          letter-spacing: -0.04em;
        }

        .leaderboard-rank-stat:last-child strong {
          color: #76eaff;
        }

        .leaderboard-state {
          position: relative;
          display: grid;
          min-height: 420px;
          place-items: center;
          text-align: center;
        }

        .leaderboard-state-content {
          max-width: 420px;
        }

        .leaderboard-loader {
          width: 64px;
          height: 64px;
          margin: 0 auto 22px;
          border: 2px solid rgba(112, 200, 255, 0.12);
          border-top-color: #73e8ff;
          border-radius: 50%;
          box-shadow: 0 0 25px rgba(79, 212, 255, 0.12);
          animation: leaderboard-spin 0.9s linear infinite;
        }

        .leaderboard-empty-copy {
          color: rgba(217, 222, 255, 0.66);
          line-height: 1.7;
        }

        @keyframes leaderboard-shooting-star {
          0% {
            opacity: 0;
            transform:
              translate3d(-180px, -90px, 0)
              rotate(-26deg)
              scaleX(0.3);
          }
          9% {
            opacity: var(--star-opacity);
          }
          65% {
            opacity: var(--star-opacity);
          }
          100% {
            opacity: 0;
            transform:
              translate3d(520px, 260px, 0)
              rotate(-26deg)
              scaleX(1);
          }
        }

        @keyframes leaderboard-cosmic-burst {
          0%, 72% {
            opacity: 0;
            transform: scale(0.08) rotate(0deg);
          }
          74% {
            opacity: 1;
          }
          82% {
            opacity: 0.82;
            transform: scale(1) rotate(12deg);
          }
          91%, 100% {
            opacity: 0;
            transform: scale(1.55) rotate(20deg);
          }
        }

        @keyframes leaderboard-ring-drift {
          from {
            transform:
              translate(-50%, -50%)
              rotate(-13deg);
          }

          to {
            transform:
              translate(-50%, -50%)
              rotate(347deg);
          }
        }

        @keyframes leaderboard-orange-clouds {
          from {
            transform:
              translate3d(-2%, 0, 0)
              rotate(0deg);
          }

          to {
            transform:
              translate3d(4%, 0, 0)
              rotate(360deg);
          }
        }

        @keyframes leaderboard-nebula {
          0%, 100% {
            transform: scale(1) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(1.08) translate3d(2%, -1%, 0);
          }
        }

        @keyframes leaderboard-stars-drift {
          to {
            background-position:
              180px 320px,
              -120px 220px,
              250px -160px;
          }
        }

        @keyframes leaderboard-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-16px);
          }
        }

        @keyframes leaderboard-planet-spin {
          to {
            filter: hue-rotate(12deg);
          }
        }

        @keyframes leaderboard-orbit {
          to {
            transform:
              translate(-50%, -50%)
              rotate(348deg);
          }
        }

        @keyframes leaderboard-live-pulse {
          0%, 100% {
            opacity: 0.55;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1.18);
          }
        }

        @keyframes leaderboard-card-shine {
          0%, 35% {
            transform:
              translateX(-120%)
              rotate(24deg);
          }
          70%, 100% {
            transform:
              translateX(350%)
              rotate(24deg);
          }
        }

        @keyframes leaderboard-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 820px) {
          .leaderboard-podium {
            grid-template-columns: 1fr;
          }

          .leaderboard-podium-card.rank-1,
          .leaderboard-podium-card.rank-2,
          .leaderboard-podium-card.rank-3 {
            order: initial;
            min-height: 210px;
          }

          .leaderboard-row {
            grid-template-columns:
              48px
              minmax(120px, 1fr)
              105px;
          }

          .leaderboard-row-level {
            display: none;
          }

          .leaderboard-my-rank {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .leaderboard-my-rank-title {
            grid-column: 1 / -1;
          }

          .leaderboard-planet-purple {
            left: -135px;
          }

          .leaderboard-planet-orange {
            right: -115px;
          }
        }

        @media (max-width: 520px) {
          .bobu-leaderboard-page {
            padding-inline: 12px;
          }

          .leaderboard-main-card {
            padding: 16px 12px;
            border-radius: 24px;
          }

          .leaderboard-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .leaderboard-row {
            grid-template-columns:
              38px
              minmax(100px, 1fr)
              92px;
            gap: 8px;
            padding: 9px 10px;
          }

          .leaderboard-row-avatar {
            display: none;
          }

          .leaderboard-row-gp {
            font-size: 13px;
          }

          .leaderboard-my-rank {
            padding: 18px 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .shooting-star,
          .cosmic-burst,
          .leaderboard-planet,
          .leaderboard-orbit-ring,
          .leaderboard-space-layer::before,
          .leaderboard-space-layer::after,
          .leaderboard-my-rank::after,
          .leaderboard-live-dot {
            animation: none !important;
          }

          .shooting-star {
            display: none;
          }
        }
      `}</style>

      <div
        className="leaderboard-space-layer"
        aria-hidden="true"
      >
        {shootingStars.map((star) => (
          <span
            key={star.id}
            className="shooting-star"
            style={
              {
                "--star-top": star.top,
                "--star-left": star.left,
                "--star-delay": star.delay,
                "--star-duration": star.duration,
                "--star-length": star.length,
                "--star-opacity": star.opacity,
              } as CSSProperties
            }
          />
        ))}

        {cosmicBursts.map((burst) => (
          <span
            key={burst.id}
            className="cosmic-burst"
            style={
              {
                "--burst-top": burst.top,
                "--burst-left": burst.left,
                "--burst-delay": burst.delay,
                "--burst-size": burst.size,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="leaderboard-planet leaderboard-planet-purple"
        aria-hidden="true"
      />
      <div
        className="leaderboard-planet leaderboard-planet-orange"
        aria-hidden="true"
      />
      <div
        className="leaderboard-planet leaderboard-planet-ice"
        aria-hidden="true"
      />
      <div
        className="leaderboard-orbit-ring"
        aria-hidden="true"
      />

      <div className="leaderboard-container">
        <header className="leaderboard-hero">
          <div className="leaderboard-eyebrow">
            <Orbit size={15} />
            {t("leaderboard.hero.eyebrow")}
          </div>

          <h1 className="leaderboard-title">
            {t(
              "leaderboard.hero.titleLine1",
            )}
            <br />
            {t("leaderboard.hero.titleLine2")}
          </h1>

          <p className="leaderboard-subtitle">
            {t("leaderboard.hero.subtitle")}
          </p>
        </header>

        {!loading && !error && (
          <LeaderboardStats entries={entries} />
        )}

        <div className="leaderboard-main-card">
          {loading ? (
            <div className="leaderboard-state">
              <div className="leaderboard-state-content">
                <div className="leaderboard-loader" />
                <h2>
                  {t("leaderboard.loading.title")}
                </h2>
                <p className="leaderboard-empty-copy">
                  {t(
                    "leaderboard.loading.description",
                  )}
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="leaderboard-state">
              <div className="leaderboard-state-content">
                <Zap size={46} />
                <h2>
                  {t("leaderboard.error.title")}
                </h2>
                <p className="leaderboard-empty-copy">
                  {error}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="leaderboard-section-heading">
                <h2>
                  <Trophy size={27} />
                  {t("leaderboard.section.topBuilders")}
                </h2>

                <div className="leaderboard-live-badge">
                  <span className="leaderboard-live-dot" />
                  {t("leaderboard.section.liveRanking")}
                </div>
              </div>

              {podium.length > 0 ? (
                <>
                  <div className="leaderboard-podium">
                    {podium.map((entry) => (
                      <article
                        key={entry.builderId}
                        className={`leaderboard-podium-card rank-${entry.rank}`}
                      >
                        <div className="leaderboard-podium-rank">
                          {rankIcon(entry.rank)}
                        </div>

                        <div className="leaderboard-avatar">
                          {getInitials(entry)}
                        </div>

                        <h3 className="leaderboard-builder-name">
                          {getBuilderName(entry)}
                        </h3>

                        <div className="leaderboard-builder-level">
                          {t("leaderboard.entry.level", {
                            level: entry.level,
                          })}
                        </div>

                        <div className="leaderboard-builder-gp">
                          <AnimatedNumber value={entry.gp} /> GP
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="leaderboard-list">
                    {remainingEntries.map((entry) => (
                      <article
                        key={entry.builderId}
                        className="leaderboard-row"
                      >
                        <div className="leaderboard-row-rank">
                          #{entry.rank}
                        </div>

                        <div className="leaderboard-row-builder">
                          <div className="leaderboard-row-avatar">
                            {getInitials(entry)}
                          </div>

                          <div className="leaderboard-row-name">
                            {getBuilderName(entry)}
                          </div>
                        </div>

                        <div className="leaderboard-row-level">
                          {t("leaderboard.entry.level", {
                            level: entry.level,
                          })}
                        </div>

                        <div className="leaderboard-row-gp">
                          <AnimatedNumber value={entry.gp} /> GP
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="leaderboard-state">
                  <div className="leaderboard-state-content">
                    <Sparkles size={48} />
                    <h2>
                      {t("leaderboard.empty.title")}
                    </h2>
                    <p className="leaderboard-empty-copy">
                      {t(
                        "leaderboard.empty.description",
                      )}
                    </p>
                  </div>
                </div>
              )}

              {myRank && (
                <aside className="leaderboard-my-rank">
                  <div className="leaderboard-my-rank-title">
                    <div className="leaderboard-my-rank-icon">
                      <Star size={24} />
                    </div>

                    <div className="leaderboard-my-rank-copy">
                      <strong>
                        {t("leaderboard.myRank.title")}
                      </strong>
                      <span>{getBuilderName(myRank)}</span>
                    </div>
                  </div>

                  <div className="leaderboard-rank-stat">
                    <span>
                      {t("leaderboard.myRank.rank")}
                    </span>
                    <strong>#{myRank.rank}</strong>
                  </div>

                  <div className="leaderboard-rank-stat">
                    <span>
                      {t("leaderboard.myRank.level")}
                    </span>
                    <strong>{myRank.level}</strong>
                  </div>

                  <div className="leaderboard-rank-stat">
                    <span>
                      {t("leaderboard.myRank.builderGp")}
                    </span>
                    <strong>
                      <AnimatedNumber value={myRank.gp} />
                    </strong>
                  </div>
                </aside>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
