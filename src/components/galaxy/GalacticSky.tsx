import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Orbit, Sparkles, Star, Users } from "lucide-react";

type GalacticSkyProps = {
  builderCount?: number;
};

type BuilderStar = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  opacity: number;
  name: string;
  rank: string;
  joined: string;
  gp: number;
  stars: number;
  sector: string;
};

function seededValue(seed: number) {
  const value = Math.sin(seed * 999.91) * 43758.5453;
  return value - Math.floor(value);
}

const builderNames = [
  "Nova",
  "Atlas",
  "Luna",
  "Orion",
  "Aurora",
  "Sol",
  "Astra",
  "Vega",
  "Lyra",
  "Zenith",
  "Cosmo",
  "Aria",
];

const builderRanks = [
  "Cadet",
  "Explorer",
  "Commander",
  "Architect",
  "Founder",
];

const sectors = [
  "Genesis",
  "Aurora",
  "Orion",
  "Solana",
  "Nebula",
  "Atlas",
];

function createStars(count: number): BuilderStar[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const nameIndex = Math.floor(seededValue(id * 2.51) * builderNames.length);
    const rankIndex = Math.floor(seededValue(id * 4.71) * builderRanks.length);
    const sectorIndex = Math.floor(seededValue(id * 8.13) * sectors.length);

    return {
      id,
      x: 4 + seededValue(id * 2.17) * 92,
      y: 7 + seededValue(id * 5.83) * 86,
      size: 2 + seededValue(id * 9.41) * 4,
      delay: seededValue(id * 7.19) * 2.5,
      opacity: 0.35 + seededValue(id * 3.73) * 0.65,
      name: builderNames[nameIndex],
      rank: builderRanks[rankIndex],
      joined: `${1 + Math.floor(seededValue(id * 6.39) * 29)} days ago`,
      gp: 450 + Math.floor(seededValue(id * 11.17) * 48000),
      stars: 1 + Math.floor(seededValue(id * 12.71) * 42),
      sector: sectors[sectorIndex],
    };
  });
}

export function GalacticSky({
  builderCount = 127,
}: GalacticSkyProps) {
  const reduceMotion = useReducedMotion();
  const stars = createStars(builderCount);
  const [selectedBuilder, setSelectedBuilder] =
    useState<BuilderStar | null>(null);

  return (
    <section className="galactic-sky-section" id="living-galaxy">
      <style>{`
        .galactic-sky-section{
          position:relative;
          overflow:hidden;
          margin-top:18px;
          padding:30px;
          border:1px solid rgba(196,181,253,.15);
          border-radius:28px;
          background:
            radial-gradient(circle at 50% 50%,rgba(124,58,237,.18),transparent 30%),
            radial-gradient(circle at 15% 20%,rgba(34,211,238,.08),transparent 30%),
            linear-gradient(145deg,rgba(11,13,27,.97),rgba(5,8,18,.98));
          box-shadow:0 30px 80px rgba(0,0,0,.3);
        }

        .galactic-sky-header{
          position:relative;
          z-index:3;
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:24px;
          margin-bottom:24px;
        }

        .galactic-sky-kicker{
          display:flex;
          align-items:center;
          gap:9px;
          margin-bottom:9px;
          color:#67e8f9;
          font-size:10px;
          font-weight:900;
          letter-spacing:.18em;
        }

        .galactic-sky-header h2{
          max-width:720px;
          margin:0;
          color:#fff;
          font-size:clamp(32px,5vw,55px);
          line-height:1;
          letter-spacing:-.05em;
        }

        .galactic-sky-header p{
          max-width:640px;
          margin:15px 0 0;
          color:#9d95aa;
          font-size:12px;
          line-height:1.75;
        }

        .galactic-sky-count{
          flex:none;
          min-width:130px;
          padding:15px 18px;
          border:1px solid rgba(103,232,249,.15);
          border-radius:17px;
          background:rgba(34,211,238,.045);
          text-align:right;
        }

        .galactic-sky-count strong{
          display:block;
          color:#fff;
          font-size:25px;
        }

        .galactic-sky-count span{
          color:#67e8f9;
          font-size:9px;
          font-weight:900;
          letter-spacing:.12em;
        }

        .galactic-map-layout{
          display:grid;
          grid-template-columns:minmax(0,1fr);
          gap:14px;
          transition:grid-template-columns .35s ease;
        }

        .galactic-map-layout.has-selection{
          grid-template-columns:minmax(0,1fr) 280px;
        }

        .galactic-sky{
          position:relative;
        }

        .galactic-canvas{
          position:relative;
          min-height:530px;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.055);
          border-radius:23px;
          background:
            radial-gradient(circle at center,rgba(109,40,217,.14),transparent 32%),
            radial-gradient(circle at center,rgba(34,211,238,.04),transparent 55%),
            rgba(3,5,14,.82);
        }

        .galactic-orbit{
          position:absolute;
          top:50%;
          left:50%;
          border:1px solid rgba(139,92,246,.14);
          border-radius:50%;
          transform:translate(-50%,-50%);
          pointer-events:none;
        }

        .galactic-orbit-one{
          width:230px;
          height:230px;
        }

        .galactic-orbit-two{
          width:390px;
          height:390px;
        }

        .galactic-orbit-three{
          width:570px;
          height:570px;
        }

        .builder-star{
          position:absolute;
          z-index:2;
          padding:0;
          border:0;
          border-radius:50%;
          background:#d8d0ff;
          box-shadow:
            0 0 7px rgba(216,208,255,.9),
            0 0 18px rgba(139,92,246,.65);
          cursor:pointer;
        }

        .builder-star:nth-of-type(5n){
          background:#67e8f9;
          box-shadow:
            0 0 8px rgba(103,232,249,.9),
            0 0 20px rgba(34,211,238,.55);
        }

        .builder-star-tooltip{
          position:absolute;
          bottom:calc(100% + 10px);
          left:50%;
          z-index:20;
          width:154px;
          padding:11px;
          border:1px solid rgba(196,181,253,.16);
          border-radius:12px;
          color:#fff;
          background:rgba(7,9,20,.96);
          box-shadow:0 14px 35px rgba(0,0,0,.4);
          opacity:0;
          pointer-events:none;
          transform:translate(-50%,7px);
          transition:.2s ease;
        }

        .builder-star:hover .builder-star-tooltip{
          opacity:1;
          transform:translate(-50%,0);
        }

        .builder-star-tooltip strong{
          display:block;
          color:#fff;
          font-size:12px;
        }

        .builder-id{
          display:block;
          margin-top:3px;
          color:#67e8f9;
          font-size:8px;
          font-weight:900;
          letter-spacing:.08em;
        }

        .builder-detail{
          display:block;
          margin-top:8px;
          color:#aaa1b8;
          font-size:8px;
          line-height:1.6;
        }

        .galaxy-core{
          position:absolute;
          top:50%;
          left:50%;
          z-index:5;
          display:grid;
          width:112px;
          height:112px;
          place-items:center;
          border:1px solid rgba(196,181,253,.3);
          border-radius:50%;
          color:#fff;
          background:
            radial-gradient(circle at 38% 30%,#a78bfa,#6d28d9 48%,#15102c 72%);
          box-shadow:
            0 0 30px rgba(139,92,246,.48),
            0 0 90px rgba(109,40,217,.35);
          transform:translate(-50%,-50%);
          text-align:center;
        }

        .galaxy-core strong{
          display:block;
          margin-top:5px;
          font-size:12px;
        }

        .galaxy-core span{
          display:block;
          margin-top:3px;
          color:#ddd6fe;
          font-size:7px;
          font-weight:900;
          letter-spacing:.13em;
        }

        .builder-star.is-selected{
          z-index:8;
          background:#fff;
          box-shadow:
            0 0 10px #fff,
            0 0 28px rgba(103,232,249,.95),
            0 0 55px rgba(139,92,246,.8);
          transform:scale(2.2);
        }

        .selected-builder-panel{
          position:relative;
          overflow:hidden;
          padding:22px;
          border:1px solid rgba(196,181,253,.16);
          border-radius:22px;
          background:
            radial-gradient(circle at 100% 0%,rgba(139,92,246,.14),transparent 38%),
            rgba(8,10,22,.95);
          box-shadow:0 24px 55px rgba(0,0,0,.3);
        }

        .selected-builder-close{
          position:absolute;
          top:14px;
          right:14px;
          display:grid;
          width:30px;
          height:30px;
          place-items:center;
          border:1px solid rgba(255,255,255,.08);
          border-radius:9px;
          color:#aaa1b8;
          background:rgba(255,255,255,.035);
          cursor:pointer;
        }

        .selected-builder-star{
          display:grid;
          width:54px;
          height:54px;
          place-items:center;
          margin-bottom:21px;
          border:1px solid rgba(196,181,253,.24);
          border-radius:17px;
          color:#fff;
          background:linear-gradient(145deg,#8b5cf6,#312e81);
          box-shadow:0 0 30px rgba(139,92,246,.28);
        }

        .selected-builder-kicker{
          margin-bottom:7px;
          color:#67e8f9;
          font-size:8px;
          font-weight:900;
          letter-spacing:.16em;
        }

        .selected-builder-panel h3{
          margin:0;
          color:#fff;
          font-size:27px;
          letter-spacing:-.04em;
        }

        .selected-builder-number{
          display:block;
          margin-top:6px;
          color:#8f879b;
          font-size:9px;
          font-weight:800;
        }

        .selected-builder-rank{
          display:inline-flex;
          margin-top:17px;
          padding:8px 10px;
          border:1px solid rgba(250,204,21,.13);
          border-radius:10px;
          color:#facc15;
          background:rgba(250,204,21,.055);
          font-size:9px;
          font-weight:900;
        }

        .selected-builder-stats{
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:9px;
          margin-top:21px;
        }

        .selected-builder-stat{
          padding:12px;
          border:1px solid rgba(255,255,255,.055);
          border-radius:13px;
          background:rgba(255,255,255,.025);
        }

        .selected-builder-stat span{
          display:block;
          margin-bottom:5px;
          color:#777082;
          font-size:7px;
          font-weight:900;
          letter-spacing:.11em;
        }

        .selected-builder-stat strong{
          display:block;
          color:#eeeaf7;
          font-size:11px;
        }

        .selected-builder-action{
          width:100%;
          min-height:43px;
          margin-top:18px;
          border:1px solid rgba(103,232,249,.2);
          border-radius:12px;
          color:#071018;
          background:linear-gradient(135deg,#a78bfa,#67e8f9);
          font-size:9px;
          font-weight:950;
          letter-spacing:.1em;
          cursor:pointer;
        }

        .builder-star{
          cursor:pointer;
        }

        .builder-star.is-selected{
          z-index:12;
          background:#ffffff;
          box-shadow:
            0 0 10px rgba(255,255,255,1),
            0 0 28px rgba(103,232,249,.95),
            0 0 58px rgba(139,92,246,.85);
          transform:scale(2.25);
        }

        .builder-profile-panel{
          position:absolute;
          z-index:30;
          top:126px;
          right:28px;
          width:min(300px,calc(100% - 40px));
          overflow:hidden;
          padding:24px;
          border:1px solid rgba(196,181,253,.18);
          border-radius:22px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(139,92,246,.18),
              transparent 42%
            ),
            rgba(7,9,20,.96);
          box-shadow:
            0 28px 70px rgba(0,0,0,.48),
            inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter:blur(18px);
        }

        .builder-profile-close{
          position:absolute;
          top:14px;
          right:14px;
          display:grid;
          width:31px;
          height:31px;
          place-items:center;
          border:1px solid rgba(255,255,255,.08);
          border-radius:9px;
          color:#aaa4b8;
          background:rgba(255,255,255,.035);
          font-size:18px;
          cursor:pointer;
        }

        .builder-profile-icon{
          display:grid;
          width:56px;
          height:56px;
          place-items:center;
          margin-bottom:20px;
          border:1px solid rgba(196,181,253,.24);
          border-radius:17px;
          color:#ffffff;
          background:linear-gradient(145deg,#8b5cf6,#312e81);
          box-shadow:0 0 32px rgba(139,92,246,.3);
        }

        .builder-profile-label{
          margin-bottom:7px;
          color:#67e8f9;
          font-size:8px;
          font-weight:900;
          letter-spacing:.18em;
        }

        .builder-profile-panel h3{
          margin:0;
          color:#ffffff;
          font-size:27px;
          letter-spacing:-.04em;
        }

        .builder-profile-id{
          display:block;
          margin-top:6px;
          color:#8f879b;
          font-size:9px;
          font-weight:800;
        }

        .builder-profile-rank{
          display:inline-flex;
          margin-top:17px;
          padding:8px 11px;
          border:1px solid rgba(250,204,21,.14);
          border-radius:10px;
          color:#facc15;
          background:rgba(250,204,21,.055);
          font-size:9px;
          font-weight:900;
        }

        .builder-profile-status{
          display:flex;
          align-items:center;
          gap:7px;
          margin-top:13px;
          color:#86efac;
          font-size:8px;
          font-weight:900;
          letter-spacing:.12em;
        }

        .builder-profile-status::before{
          width:6px;
          height:6px;
          border-radius:50%;
          background:#4ade80;
          box-shadow:0 0 12px rgba(74,222,128,.9);
          content:"";
        }

        .builder-profile-stats{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:9px;
          margin-top:21px;
        }

        .builder-profile-stat{
          min-width:0;
          padding:12px;
          border:1px solid rgba(255,255,255,.055);
          border-radius:13px;
          background:rgba(255,255,255,.025);
        }

        .builder-profile-stat span{
          display:block;
          margin-bottom:5px;
          color:#777082;
          font-size:7px;
          font-weight:900;
          letter-spacing:.11em;
        }

        .builder-profile-stat strong{
          display:block;
          overflow:hidden;
          color:#eeeaf7;
          font-size:11px;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .builder-profile-actions{
          display:grid;
          gap:8px;
          margin-top:18px;
        }

        .builder-profile-primary,
        .builder-profile-secondary{
          width:100%;
          min-height:42px;
          border-radius:12px;
          font-size:8px;
          font-weight:950;
          letter-spacing:.1em;
          cursor:pointer;
        }

        .builder-profile-primary{
          border:1px solid rgba(103,232,249,.2);
          color:#071018;
          background:linear-gradient(135deg,#a78bfa,#67e8f9);
        }

        .builder-profile-secondary{
          border:1px solid rgba(196,181,253,.13);
          color:#c4b5fd;
          background:rgba(139,92,246,.065);
        }

        @media(max-width:900px){
          .builder-profile-panel{
            top:auto;
            right:18px;
            bottom:126px;
            left:18px;
            width:auto;
          }
        }

        @media(max-width:560px){
          .builder-profile-panel{
            position:relative;
            top:auto;
            right:auto;
            bottom:auto;
            left:auto;
            width:auto;
            margin:16px 14px 0;
          }
        }

        .galactic-footer{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:12px;
          margin-top:14px;
        }

        .galactic-stat{
          display:flex;
          align-items:center;
          gap:12px;
          padding:15px;
          border:1px solid rgba(255,255,255,.05);
          border-radius:15px;
          color:#9d95aa;
          background:rgba(255,255,255,.022);
          font-size:9px;
          font-weight:800;
          letter-spacing:.07em;
        }

        .galactic-stat svg{
          color:#67e8f9;
        }

        @media(max-width:720px){
          .galactic-sky-section{
            padding:20px;
          }

          .galactic-sky-header{
            flex-direction:column;
          }

          .galactic-sky-count{
            width:100%;
            text-align:left;
          }

          .galactic-map-layout.has-selection{
            grid-template-columns:1fr;
          }

          .galactic-canvas{
            min-height:440px;
          }

          .galactic-orbit-three{
            width:470px;
            height:470px;
          }

          .galactic-footer{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <header className="galactic-sky-header">
        <div>
          <div className="galactic-sky-kicker">
            <Sparkles size={14} />
            LIVING GALAXY
          </div>

          <h2>Every Star is a real Builder.</h2>

          <p>
            Each new Builder receives a permanent position inside the BOBU
            Universe. As the community grows, constellations form, galaxies
            expand and the map becomes alive.
          </p>
        </div>

        <div className="galactic-sky-count">
          <strong>{builderCount}</strong>
          <span>VISIBLE STARS</span>
        </div>
      </header>

      <div
        className={`galactic-map-layout ${
          selectedBuilder ? "has-selection" : ""
        }`}
      >
        <div className="galactic-canvas">
          <div className="galactic-orbit galactic-orbit-one" />
        <div className="galactic-orbit galactic-orbit-two" />
        <div className="galactic-orbit galactic-orbit-three" />

        {stars.map((star) => (
          <motion.button
            type="button"
            className={`builder-star ${
              selectedBuilder?.id === star.id ? "is-selected" : ""
            }`}
            key={star.id}
            aria-label={`Builder ${star.id}`}
            onClick={() => setSelectedBuilder(star)}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{
              opacity: star.opacity,
              scale: [0, 1.7, 1],
            }}
            viewport={{ once: true }}
            animate={
              reduceMotion
                ? undefined
                : {
                    filter: [
                      "brightness(0.8)",
                      "brightness(1.8)",
                      "brightness(0.8)",
                    ],
                  }
            }
            transition={{
              opacity: { delay: star.delay * 0.18, duration: 0.4 },
              scale: { delay: star.delay * 0.18, duration: 0.55 },
              filter: {
                delay: star.delay,
                duration: 2.4 + star.delay,
                repeat: Infinity,
              },
            }}
          >
            <span className="builder-star-tooltip">
              <strong>{star.name}</strong>
              <span className="builder-id">
                Builder #{String(star.id).padStart(4, "0")}
              </span>

              <span className="builder-detail">
                Rank: {star.rank}
                <br />
                Joined: {star.joined}
                <br />
                GP: {star.gp.toLocaleString("en-US")}
                <br />
                Stars: {star.stars}
                <br />
                Sector: {star.sector}
              </span>
            </span>
          </motion.button>
        ))}

        <motion.div
          className="galaxy-core"
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1, 1.06, 1],
                  rotate: [0, 2, 0, -2, 0],
                }
          }
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div>
            <Star size={22} />
            <strong>YOU</strong>
            <span>GALAXY CORE</span>
          </div>
        </motion.div>
        </div>

        {selectedBuilder && (
          <motion.aside
            className="selected-builder-panel"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
          >
            <button
              type="button"
              className="selected-builder-close"
              onClick={() => setSelectedBuilder(null)}
              aria-label="Close Builder profile"
            >
              ×
            </button>

            <div className="selected-builder-star">
              <Star size={24} />
            </div>

            <div className="selected-builder-kicker">
              SELECTED BUILDER
            </div>

            <h3>{selectedBuilder.name}</h3>

            <span className="selected-builder-number">
              Builder #{String(selectedBuilder.id).padStart(4, "0")}
            </span>

            <div className="selected-builder-rank">
              {selectedBuilder.rank}
            </div>

            <div className="selected-builder-stats">
              <div className="selected-builder-stat">
                <span>GP</span>
                <strong>
                  {selectedBuilder.gp.toLocaleString("en-US")}
                </strong>
              </div>

              <div className="selected-builder-stat">
                <span>STARS</span>
                <strong>{selectedBuilder.stars}</strong>
              </div>

              <div className="selected-builder-stat">
                <span>SECTOR</span>
                <strong>{selectedBuilder.sector}</strong>
              </div>

              <div className="selected-builder-stat">
                <span>JOINED</span>
                <strong>{selectedBuilder.joined}</strong>
              </div>
            </div>

            <button
              type="button"
              className="selected-builder-action"
            >
              OPEN BUILDER GALAXY
            </button>
          </motion.aside>
        )}
      </div>

      {selectedBuilder && (
        <motion.aside
          className="builder-profile-panel"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          aria-label="Builder profile"
        >
          <button
            type="button"
            className="builder-profile-close"
            onClick={() => setSelectedBuilder(null)}
            aria-label="Close Builder profile"
          >
            ×
          </button>

          <div className="builder-profile-icon">
            <Star size={25} />
          </div>

          <div className="builder-profile-label">
            BUILDER PROFILE
          </div>

          <h3>{selectedBuilder.name}</h3>

          <span className="builder-profile-id">
            Builder #{String(selectedBuilder.id).padStart(4, "0")}
          </span>

          <div className="builder-profile-rank">
            {selectedBuilder.rank}
          </div>

          <div className="builder-profile-status">
            ONLINE
          </div>

          <div className="builder-profile-stats">
            <div className="builder-profile-stat">
              <span>GP</span>
              <strong>
                {selectedBuilder.gp.toLocaleString("en-US")}
              </strong>
            </div>

            <div className="builder-profile-stat">
              <span>STARS</span>
              <strong>{selectedBuilder.stars}</strong>
            </div>

            <div className="builder-profile-stat">
              <span>SECTOR</span>
              <strong>{selectedBuilder.sector}</strong>
            </div>

            <div className="builder-profile-stat">
              <span>JOINED</span>
              <strong>{selectedBuilder.joined}</strong>
            </div>
          </div>

          <div className="builder-profile-actions">
            <button
              type="button"
              className="builder-profile-primary"
            >
              VIEW GALAXY
            </button>

            <button
              type="button"
              className="builder-profile-secondary"
            >
              SEND ALLIANCE REQUEST
            </button>
          </div>
        </motion.aside>
      )}

      <footer className="galactic-footer">
        <div className="galactic-stat">
          <Users size={15} />
          {builderCount} BUILDERS CONNECTED
        </div>

        <div className="galactic-stat">
          <Orbit size={15} />
          24 GALAXIES CREATED
        </div>

        <div className="galactic-stat">
          <Star size={15} />
          18 NEW STARS THIS WEEK
        </div>
      </footer>
    </section>
  );
}
