import {
  type CSSProperties,
  useMemo,
} from "react";

type MeteorTone = "blue" | "purple" | "gold";

interface Meteor {
  id: number;
  top: string;
  left: string;
  delay: string;
  duration: string;
  length: string;
  tone: MeteorTone;
}

interface OrbitParticle {
  id: number;
  angle: number;
  delay: string;
  size: number;
}

const constellationPoints = [
  [8, 49],
  [17, 41],
  [25, 50],
  [17, 59],
  [8, 51],
  [34, 41],
  [34, 59],
  [42, 49],
  [50, 41],
  [50, 59],
  [59, 41],
  [59, 59],
  [68, 49],
  [77, 41],
  [87, 50],
  [77, 59],
] as const;

export function LeaderboardCinematicEffects() {
  const meteors = useMemo<Meteor[]>(
    () =>
      Array.from({ length: 58 }, (_, index) => {
        const tones: MeteorTone[] = [
          "blue",
          "purple",
          "gold",
        ];

        return {
          id: index,
          top: `${3 + ((index * 19) % 91)}%`,
          left: `${-28 + ((index * 37) % 126)}%`,
          delay: `${(index * 0.31) % 12}s`,
          duration: `${
            2.1 + ((index * 11) % 29) / 10
          }s`,
          length: `${
            55 + ((index * 23) % 160)
          }px`,
          tone: tones[index % tones.length],
        };
      }),
    [],
  );

  const orbitParticles = useMemo<OrbitParticle[]>(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        angle: (360 / 22) * index,
        delay: `${-index * 0.26}s`,
        size: 3 + (index % 4),
      })),
    [],
  );

  return (
    <div
      className="leaderboard-cinematic-effects"
      aria-hidden="true"
    >
      <style>{`
        .leaderboard-cinematic-effects {
          position: absolute;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .cinematic-meteor {
          position: absolute;
          top: var(--meteor-top);
          left: var(--meteor-left);
          width: var(--meteor-length);
          height: 2px;
          opacity: 0;
          border-radius: 999px;
          transform: rotate(-25deg);
          will-change: transform, opacity;
          animation:
            cinematic-meteor-flight
            var(--meteor-duration)
            linear
            var(--meteor-delay)
            infinite;
        }

        .cinematic-meteor::after {
          content: "";
          position: absolute;
          top: 50%;
          right: -3px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          transform: translateY(-50%);
          background: white;
        }

        .cinematic-meteor.blue {
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(78, 181, 255, 0.18),
              rgba(159, 235, 255, 0.98)
            );
          filter:
            drop-shadow(
              0 0 7px rgba(74, 207, 255, 0.95)
            );
        }

        .cinematic-meteor.blue::after {
          box-shadow:
            0 0 8px white,
            0 0 17px #61dfff,
            0 0 30px rgba(62, 145, 255, 0.88);
        }

        .cinematic-meteor.purple {
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(135, 73, 255, 0.18),
              rgba(210, 166, 255, 0.98)
            );
          filter:
            drop-shadow(
              0 0 8px rgba(166, 92, 255, 0.9)
            );
        }

        .cinematic-meteor.purple::after {
          box-shadow:
            0 0 8px white,
            0 0 17px #bd7cff,
            0 0 30px rgba(132, 67, 255, 0.88);
        }

        .cinematic-meteor.gold {
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 166, 62, 0.18),
              rgba(255, 231, 157, 0.98)
            );
          filter:
            drop-shadow(
              0 0 8px rgba(255, 183, 75, 0.92)
            );
        }

        .cinematic-meteor.gold::after {
          box-shadow:
            0 0 8px white,
            0 0 17px #ffd072,
            0 0 30px rgba(255, 142, 44, 0.9);
        }

        .cinematic-supernova {
          position: absolute;
          width: 210px;
          height: 210px;
          border-radius: 50%;
          opacity: 0;
          transform: scale(0.05);
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 1) 0 2%,
              rgba(147, 227, 255, 0.92) 3%,
              rgba(126, 83, 255, 0.5) 14%,
              rgba(126, 83, 255, 0.08) 35%,
              transparent 68%
            );
          filter:
            drop-shadow(
              0 0 20px rgba(122, 217, 255, 0.95)
            );
          animation:
            cinematic-supernova
            17s
            ease-out
            infinite;
        }

        .cinematic-supernova::before,
        .cinematic-supernova::after {
          content: "";
          position: absolute;
          inset: 50%;
          width: 165%;
          height: 2px;
          transform: translate(-50%, -50%);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.9),
              transparent
            );
        }

        .cinematic-supernova::after {
          transform:
            translate(-50%, -50%)
            rotate(90deg);
        }

        .cinematic-supernova-one {
          top: 22%;
          right: 13%;
          animation-delay: -3s;
        }

        .cinematic-supernova-two {
          bottom: 16%;
          left: 8%;
          width: 150px;
          height: 150px;
          animation-delay: -11s;
        }

        .cinematic-orbit-system {
          position: absolute;
          right: 4%;
          top: 34%;
          width: 280px;
          height: 280px;
          opacity: 0.58;
          border: 1px solid rgba(120, 210, 255, 0.1);
          border-radius: 50%;
          transform: rotate(-16deg);
          animation:
            cinematic-orbit-spin
            30s
            linear
            infinite;
        }

        .cinematic-orbit-system::before {
          content: "";
          position: absolute;
          inset: 17%;
          border: 1px solid rgba(178, 117, 255, 0.09);
          border-radius: 50%;
        }

        .cinematic-orbit-particle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: var(--particle-size);
          height: var(--particle-size);
          border-radius: 50%;
          transform:
            rotate(var(--particle-angle))
            translateX(138px);
          background: rgba(165, 229, 255, 0.94);
          box-shadow:
            0 0 8px rgba(94, 214, 255, 0.9),
            0 0 16px rgba(121, 86, 255, 0.42);
          animation:
            cinematic-particle-pulse
            2.6s
            ease-in-out
            var(--particle-delay)
            infinite;
        }

        .bobu-constellation {
          position: absolute;
          left: 50%;
          top: 55%;
          width: min(700px, 72vw);
          height: 260px;
          opacity: 0.085;
          transform: translate(-50%, -50%);
          filter:
            drop-shadow(
              0 0 12px rgba(119, 207, 255, 0.7)
            );
          animation:
            bobu-constellation-breathe
            10s
            ease-in-out
            infinite;
        }

        .bobu-constellation-point {
          position: absolute;
          left: var(--point-x);
          top: var(--point-y);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: white;
          box-shadow:
            0 0 9px white,
            0 0 19px rgba(95, 211, 255, 0.95);
        }

        .bobu-constellation-word {
          position: absolute;
          inset: 50% auto auto 50%;
          transform: translate(-50%, -50%);
          color: rgba(177, 225, 255, 0.45);
          font-size: clamp(72px, 13vw, 190px);
          font-weight: 950;
          letter-spacing: 0.16em;
          text-indent: 0.16em;
          text-shadow:
            0 0 35px rgba(94, 185, 255, 0.38);
        }

        .cinematic-universe-pulse {
          position: absolute;
          inset: 0;
          opacity: 0;
          background:
            radial-gradient(
              circle at 50% 40%,
              rgba(114, 99, 255, 0.13),
              transparent 50%
            );
          animation:
            cinematic-universe-pulse
            18s
            ease-in-out
            infinite;
        }

        @keyframes cinematic-meteor-flight {
          0% {
            opacity: 0;
            transform:
              translate3d(-220px, -120px, 0)
              rotate(-25deg)
              scaleX(0.2);
          }

          8% {
            opacity: 0.84;
          }

          62% {
            opacity: 0.72;
          }

          100% {
            opacity: 0;
            transform:
              translate3d(760px, 390px, 0)
              rotate(-25deg)
              scaleX(1);
          }
        }

        @keyframes cinematic-supernova {
          0%, 77% {
            opacity: 0;
            transform: scale(0.04) rotate(0);
          }

          79% {
            opacity: 1;
          }

          82% {
            opacity: 0.92;
            transform: scale(0.75) rotate(8deg);
          }

          87% {
            opacity: 0.36;
            transform: scale(1.28) rotate(15deg);
          }

          93%, 100% {
            opacity: 0;
            transform: scale(1.85) rotate(21deg);
          }
        }

        @keyframes cinematic-orbit-spin {
          to {
            transform: rotate(344deg);
          }
        }

        @keyframes cinematic-particle-pulse {
          0%, 100% {
            opacity: 0.35;
            filter: brightness(0.8);
          }

          50% {
            opacity: 1;
            filter: brightness(1.45);
          }
        }

        @keyframes bobu-constellation-breathe {
          0%, 100% {
            opacity: 0.055;
            transform:
              translate(-50%, -50%)
              scale(0.98);
          }

          50% {
            opacity: 0.11;
            transform:
              translate(-50%, -50%)
              scale(1.025);
          }
        }

        @keyframes cinematic-universe-pulse {
          0%, 75%, 100% {
            opacity: 0;
          }

          84% {
            opacity: 1;
          }

          92% {
            opacity: 0.18;
          }
        }

        @media (max-width: 820px) {
          .cinematic-meteor:nth-of-type(n + 29) {
            display: none;
          }

          .cinematic-orbit-system {
            width: 190px;
            height: 190px;
            right: -70px;
            opacity: 0.38;
          }

          .cinematic-orbit-particle {
            transform:
              rotate(var(--particle-angle))
              translateX(93px);
          }

          .bobu-constellation {
            width: 92vw;
            opacity: 0.055;
          }

          .cinematic-supernova {
            width: 135px;
            height: 135px;
          }
        }

        @media (max-width: 520px) {
          .cinematic-meteor:nth-of-type(n + 19) {
            display: none;
          }

          .cinematic-supernova-two,
          .cinematic-orbit-system {
            display: none;
          }

          .cinematic-supernova {
            opacity: 0;
            width: 105px;
            height: 105px;
          }

          .bobu-constellation-word {
            font-size: 68px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cinematic-meteor,
          .cinematic-supernova,
          .cinematic-orbit-system,
          .cinematic-orbit-particle,
          .bobu-constellation,
          .cinematic-universe-pulse {
            animation: none !important;
          }

          .cinematic-meteor,
          .cinematic-supernova {
            display: none;
          }
        }
      `}</style>

      <div className="cinematic-universe-pulse" />

      {meteors.map((meteor) => (
        <span
          key={meteor.id}
          className={`cinematic-meteor ${meteor.tone}`}
          style={
            {
              "--meteor-top": meteor.top,
              "--meteor-left": meteor.left,
              "--meteor-delay": meteor.delay,
              "--meteor-duration": meteor.duration,
              "--meteor-length": meteor.length,
            } as CSSProperties
          }
        />
      ))}

      <span className="cinematic-supernova cinematic-supernova-one" />
      <span className="cinematic-supernova cinematic-supernova-two" />

      <div className="cinematic-orbit-system">
        {orbitParticles.map((particle) => (
          <span
            key={particle.id}
            className="cinematic-orbit-particle"
            style={
              {
                "--particle-angle": `${particle.angle}deg`,
                "--particle-delay": particle.delay,
                "--particle-size": `${particle.size}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="bobu-constellation">
        <div className="bobu-constellation-word">
          BOBU
        </div>

        {constellationPoints.map(([x, y], index) => (
          <span
            key={`${x}-${y}-${index}`}
            className="bobu-constellation-point"
            style={
              {
                "--point-x": `${x}%`,
                "--point-y": `${y}%`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
