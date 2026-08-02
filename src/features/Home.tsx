import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Circle,
  Gamepad2,
  Gem,
  Globe2,
  Map,
  Orbit,
  RadioTower,
  Rocket,
  Satellite,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../core/language";
import { LiveUniverse } from "../components/home/LiveUniverse";
import { Journey } from "../components/journey/Journey";
import { GalacticSky } from "../components/galaxy/GalacticSky";
import { CinematicBackground } from "../components/cinematic/CinematicBackground";
import { ShootingStars } from "../components/cinematic/ShootingStars";
import {
  universeStatsService,
  type UniverseStats,
} from "../core/builder/services/UniverseStatsService";

type CounterProps = {
  value: number;
  suffix?: string;
  decimals?: number;
};

const createHomeStats = (stats: UniverseStats) => [
  {
    label: "Builders Joined",
    value: stats.buildersJoined,
    suffix: "",
    icon: Users,
  },
  {
    label: "Galaxies Created",
    value: stats.galaxiesCreated,
    suffix: "",
    icon: Orbit,
  },
  {
    label: "Alliances Formed",
    value: stats.alliancesFormed,
    suffix: "",
    icon: Globe2,
  },
  {
    label: "GP Generated",
    value: stats.gpGenerated,
    suffix: "",
    icon: Gem,
  },
] as const;

const missions = [
  {
    code: "M-001",
    title: "Restore the BOBU Signal",
    text: "Reconnect with Mission Control and receive the latest transmission.",
    reward: "250 GP",
    icon: RadioTower,
    soon: false,
  },
  {
    code: "M-002",
    title: "Join Official Channels",
    text: "Connect with the official BOBU community across the network.",
    reward: "600 GP",
    icon: Users,
    soon: false,
  },
  {
    code: "M-004",
    title: "Enter Arcade Orbit",
    text: "Playable missions and competitive challenges are approaching.",
    reward: "Coming Soon",
    icon: Gamepad2,
    soon: true,
  },
] as const;

const roadmap = [
  ["PHASE 01", "Genesis Signal", "Identity, narrative and the first sectors come online.", true],
  ["PHASE 02", "Mission Control", "Bobonauts complete missions and build visible progress.", true],
  ["PHASE 03", "Arcade Expansion", "Playable experiences and seasonal challenges arrive.", false],
  ["PHASE 04", "Open Galaxy", "New sectors and community-built experiences expand.", false],
] as const;

const benefits = [
  ["Missions", "Complete objectives and grow your Bobonaut profile.", Target],
  ["Recognition", "Earn badges, rank progress and campaign eligibility.", Award],
  ["Discovery", "Explore sectors, signals and the evolving BOBU story.", Globe2],
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function AnimatedCounter({ value, suffix = "", decimals = 0 }: CounterProps) {
  const [current, setCurrent] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      setCurrent(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / 1400, 1);
      setCurrent(value * (1 - Math.pow(1 - progress, 3)));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion, value]);

  const output = useMemo(
    () =>
      decimals
        ? current.toFixed(decimals)
        : Math.round(current).toLocaleString("en-US"),
    [current, decimals],
  );

  return <>{output}{suffix}</>;
}

export function Home() {
  const { t } = useLanguage();

  const [universeStats, setUniverseStats] = useState<UniverseStats>({
    buildersJoined: 0,
    galaxiesCreated: 0,
    alliancesFormed: 0,
    gpGenerated: 0,
    newBuildersThisWeek: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadUniverseStats = async () => {
      try {
        const nextStats = await universeStatsService.load();

        if (isMounted) {
          setUniverseStats(nextStats);
        }
      } catch (error) {
        console.error("Universe stats could not be loaded", error);
      }
    };

    void loadUniverseStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = createHomeStats(universeStats);
  const reduceMotion = useReducedMotion();
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    if (reduceMotion) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: (event.clientX - bounds.left) / bounds.width - 0.5,
      y: (event.clientY - bounds.top) / bounds.height - 0.5,
    });
  }

  return (
    <>
      <CinematicBackground />
      <ShootingStars />

      <motion.main
      className="home-v2"
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.1 }}
    >
      <style>{`
        .home-v2{
          --text:#f8f5ff;--muted:#aaa0bb;--purple:#8b5cf6;
          --purple-light:#c4b5fd;--cyan:#67e8f9;--green:#4ade80;
          --gold:#f6d365;--border:rgba(196,181,253,.16);
          width:min(1180px,calc(100% - 32px));margin:auto;padding:30px 0 94px;color:var(--text)
        }
        .home-v2 *{box-sizing:border-box}
        .glass{border:1px solid var(--border);background:linear-gradient(145deg,rgba(18,20,34,.88),rgba(10,12,22,.76));box-shadow:0 22px 60px rgba(0,0,0,.25),inset 0 1px rgba(255,255,255,.04);backdrop-filter:blur(18px)}
        .eyebrow{display:inline-flex;align-items:center;gap:9px;margin-bottom:18px;color:var(--cyan);font-size:11px;font-weight:900;letter-spacing:.18em}
        .dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 16px var(--green)}
        .hero{position:relative;display:grid;grid-template-columns:1.08fr .92fr;gap:58px;align-items:center;min-height:600px;overflow:hidden;border-radius:34px;isolation:isolate}
        .hero:before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at 16% 28%,rgba(124,58,237,.22),transparent 34%),radial-gradient(circle at 84% 34%,rgba(14,165,233,.14),transparent 31%)}
        .pointer{position:absolute;z-index:-1;width:360px;height:360px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(129,92,246,.16),transparent 68%);filter:blur(12px);transition:left .14s,top .14s}
        .hero-copy{padding:60px 0 60px 38px}
        .hero h1{max-width:690px;margin:0;font-size:clamp(64px,8vw,112px);line-height:.86;letter-spacing:-.065em;font-weight:500}
        .hero h1 strong{display:block;margin-top:12px;font-weight:800;background:linear-gradient(100deg,#c4b5fd,#7c5cff,#4f46e5);background-clip:text;color:transparent}
        .hero-copy>p{max-width:650px;margin:28px 0 0;color:var(--muted);font-size:18px;line-height:1.72}
        .actions{display:flex;flex-wrap:wrap;gap:13px;margin-top:30px}
        .primary,.secondary,.text-link{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:50px;border-radius:15px;font-size:14px;font-weight:800;text-decoration:none;transition:.18s}
        .primary{padding:0 21px;color:#090711;background:linear-gradient(115deg,#a78bfa,#818cf8,#38bdf8);box-shadow:0 15px 38px rgba(99,102,241,.3)}
        .secondary{padding:0 20px;border:1px solid var(--border);color:var(--text);background:rgba(255,255,255,.035)}
        .primary:hover,.secondary:hover,.text-link:hover{transform:translateY(-2px)}
        .signal{display:flex;align-items:center;gap:9px;margin-top:22px;color:#aca0c1;font:700 10px Georgia;letter-spacing:.18em}
        .planet-zone{display:grid;min-height:500px;place-items:center;perspective:1200px}
        .planet-system{position:relative;display:grid;width:min(410px,84vw);aspect-ratio:1;place-items:center;transform-style:preserve-3d;transition:transform .18s}
        .halo{position:absolute;width:88%;height:88%;border-radius:50%;background:radial-gradient(circle,rgba(111,76,255,.22),transparent 66%);filter:blur(22px)}
        .orbit{position:absolute;border:1px solid rgba(155,139,255,.2);border-radius:50%}
        .orbit-a{width:94%;height:42%;animation:orbitA 20s linear infinite}
        .orbit-b{width:80%;height:80%;border-style:dashed;opacity:.5;animation:orbitB 28s linear infinite}
        .orbit-c{width:109%;height:62%;opacity:.42;animation:orbitC 34s linear infinite}
        .particle{position:absolute;width:8px;height:8px;top:50%;right:2%;border-radius:50%;background:#b8f4ff;box-shadow:0 0 20px #67e8f9}
        .genesis-world{position:relative;z-index:3;display:grid;width:82%;min-height:470px;place-items:center;transform-style:preserve-3d}
        .planet-atmosphere{position:absolute;width:82%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.34) 0%,rgba(56,189,248,.14) 36%,transparent 70%);filter:blur(30px);animation:planetPulse 5s ease-in-out infinite}
        .planet-core{position:relative;z-index:2;display:grid;width:58%;aspect-ratio:1;place-items:center;overflow:hidden;border:1px solid rgba(196,181,253,.2);border-radius:50%;background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.34),transparent 7%),radial-gradient(circle at 66% 72%,rgba(17,24,73,.8),transparent 44%),linear-gradient(145deg,#4936a4,#1d2058 48%,#070b1c);box-shadow:-30px 14px 80px rgba(83,54,210,.34),32px 22px 90px rgba(0,0,0,.68),inset -30px -22px 58px rgba(0,0,0,.58);animation:planetFloat 7s ease-in-out infinite}
        .planet-core:before{content:"";position:absolute;width:132%;height:38%;border:1px solid rgba(103,232,249,.26);border-radius:50%;transform:rotate(-17deg);box-shadow:0 0 34px rgba(103,232,249,.12),inset 0 0 20px rgba(139,92,246,.12)}
        .planet-core:after{content:"";position:absolute;inset:10%;border:1px dashed rgba(196,181,253,.13);border-radius:50%;animation:innerOrbit 18s linear infinite}
        .planet-light{position:absolute;top:17%;left:22%;width:22%;height:22%;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.26),transparent 70%);filter:blur(7px)}
        .planet-shadow{position:absolute;right:-12%;bottom:-8%;width:82%;height:82%;border-radius:50%;background:radial-gradient(circle,rgba(0,0,0,.12),rgba(0,0,0,.72));filter:blur(5px)}
        .planet-label{position:relative;z-index:3;color:rgba(232,226,255,.66);font:700 11px Georgia;letter-spacing:.34em}
        .bubo-transmission{position:absolute;z-index:7;right:-30px;bottom:-10px;display:grid;grid-template-columns:72px 1fr;gap:13px;align-items:center;width:min(330px,86%);padding:12px;border-radius:19px;transform:translateZ(50px)}
        .transmission-image{width:72px;height:82px;overflow:hidden;border:1px solid rgba(103,232,249,.2);border-radius:13px;background:rgba(7,9,20,.8)}
        .transmission-image img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 28%;opacity:.88;filter:saturate(.9) contrast(1.05)}
        .transmission-copy span{display:block;margin-bottom:5px;color:var(--cyan);font-size:8px;font-weight:900;letter-spacing:.15em}
        .transmission-copy strong{display:block;color:#fff;font-size:10px;line-height:1.4;letter-spacing:.04em}
        .transmission-copy p{margin:6px 0 0;color:#c9c1d9;font-size:10px;line-height:1.5}
        .chip{position:absolute;display:flex;align-items:center;gap:9px;padding:11px 14px;border:1px solid var(--border);border-radius:14px;color:#c8c1dc;background:rgba(12,13,25,.7);font-size:11px;font-weight:800}
        .chip-a{top:14%;left:0}.chip-b{right:-1%;bottom:24%}
        .sector{position:absolute;bottom:7%;display:flex;align-items:center;gap:9px;color:rgba(187,180,219,.53);font:700 10px Georgia;letter-spacing:.16em}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:-10px;position:relative;z-index:3}
        .stat{min-height:145px;padding:23px;border-radius:23px}
        .stat-icon{display:grid;width:39px;height:39px;place-items:center;margin-bottom:15px;border-radius:13px;color:var(--purple-light);background:rgba(139,92,246,.1)}
        .stat strong{display:block;margin-bottom:7px;font-size:32px}.stat span{color:var(--muted)}
        .transmission{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;margin-top:15px;padding:34px;border-radius:24px}
        .transmission h2{margin:0;font-size:clamp(28px,4vw,44px)}.transmission p{color:var(--muted)}
        .section{margin-top:78px}.section-header{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;margin-bottom:22px}
        .section-header h2{margin:0;font-size:clamp(35px,5vw,58px);line-height:.98;letter-spacing:-.05em}
        .section-header p{max-width:570px;color:var(--muted);line-height:1.7}.text-link{color:var(--purple-light)}
        .mission-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .mission-card{position:relative;min-height:310px;padding:24px;border-radius:24px}.mission-card.soon{opacity:.68}
        .mission-top{display:flex;justify-content:space-between}.mission-icon{display:grid;width:46px;height:46px;place-items:center;border-radius:15px;color:var(--cyan);background:rgba(34,211,238,.08)}
        .status{padding:7px 10px;border-radius:999px;color:var(--green);background:rgba(74,222,128,.08);font-size:9px;font-weight:900;letter-spacing:.1em}
        .mission-card small{display:block;margin-top:28px;color:var(--purple-light);font-weight:900;letter-spacing:.16em}
        .mission-card h3{margin:10px 0;font-size:21px}.mission-card p{color:var(--muted);line-height:1.65}
        .mission-footer{position:absolute;right:24px;bottom:23px;left:24px;display:flex;justify-content:space-between;color:var(--gold);font-weight:800}
        .roadmap{display:grid;grid-template-columns:.74fr 1.26fr;gap:16px}
        .roadmap-intro{position:relative;min-height:500px;padding:40px;border-radius:26px}.roadmap-intro h3{font-size:48px;line-height:1;margin:28px 0 14px}.roadmap-intro p{color:var(--muted);line-height:1.75}
        .progress{position:absolute;right:35px;bottom:35px;left:35px}.track{height:8px;border-radius:99px;background:rgba(255,255,255,.06)}.fill{width:50%;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--purple),var(--cyan))}
        .timeline{display:grid;gap:12px}.timeline-card{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;min-height:113px;padding:20px;border-radius:21px}
        .marker{display:grid;width:40px;height:40px;place-items:center;border-radius:13px;background:rgba(255,255,255,.04)}.marker.done{color:var(--green);background:rgba(74,222,128,.08)}
        .timeline-card small{color:var(--purple-light);font-weight:900;letter-spacing:.15em}.timeline-card h4{margin:5px 0}.timeline-card p{margin:0;color:var(--muted);font-size:12px}
        .community{padding:50px;border-radius:30px}.community-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:36px;align-items:center}
        .community h2{font-size:clamp(38px,6vw,67px);line-height:.98;margin:0}.community p{color:var(--muted);line-height:1.75}
        .benefits{display:grid;gap:12px}.benefit{display:flex;gap:15px;padding:18px;border:1px solid rgba(255,255,255,.06);border-radius:18px;background:rgba(255,255,255,.026)}
        .benefit-icon{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;color:var(--purple-light);background:rgba(139,92,246,.09)}
        .benefit h4{margin:0 0 5px}.benefit p{margin:0;font-size:12px}
        .final{margin-top:78px;padding:70px 24px;border:1px solid rgba(137,114,255,.2);border-radius:32px;text-align:center;background:radial-gradient(circle at 50% 120%,rgba(98,77,230,.24),transparent 54%),rgba(12,12,24,.85)}
        .final h2{max-width:790px;margin:16px auto 13px;font-size:clamp(39px,7vw,76px);line-height:.94}.final p{max-width:650px;margin:auto;color:var(--muted)}
        .final-actions{display:flex;justify-content:center;gap:12px;margin-top:28px}
        @keyframes orbitA{to{transform:rotate(360deg)}}@keyframes orbitB{to{transform:rotate(-360deg)}}@keyframes orbitC{to{transform:rotate(360deg)}}@keyframes planetFloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-14px) rotate(1deg)}}@keyframes planetPulse{0%,100%{opacity:.62;transform:scale(.95)}50%{opacity:1;transform:scale(1.08)}}@keyframes innerOrbit{to{transform:rotate(360deg)}}
        @media(max-width:980px){.hero,.roadmap,.community-grid{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}mission-grid{grid-template-columns:1fr 1fr}.mission-card:last-child{grid-column:1/-1}}
        @media(max-width:720px){.home-v2{width:calc(100% - 20px)}.stats,.mission-grid{grid-template-columns:1fr}.mission-card:last-child{grid-column:auto}.section-header,.transmission{align-items:flex-start;flex-direction:column}.chip{display:none}}
        @media(max-width:520px){.hero-copy{padding:30px 14px}.actions,.final-actions{flex-direction:column}.primary,.secondary{width:100%}.planet-zone{min-height:390px}.genesis-world{width:94%;min-height:390px}.planet-core{width:62%}.bubo-transmission{right:0;bottom:0;width:94%;grid-template-columns:64px 1fr}.transmission-image{width:64px;height:74px}.community{padding:30px 20px}}
      `}</style>

      <motion.section
        className="hero"
        variants={fadeUp}
        transition={{ duration: 0.7 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setPointer({ x: 0, y: 0 })}
      >
        <div
          className="pointer"
          style={{
            left: `calc(${50 + pointer.x * 75}% - 180px)`,
            top: `calc(${50 + pointer.y * 75}% - 180px)`,
          }}
        />

        <div className="hero-copy">
          <div className="eyebrow"><span className="dot" />{t("home.hero.eyebrow")}</div>
          <h1>{t("home.hero.titlePrefix")}<strong>{t("home.hero.titleHighlight")}</strong></h1>
          <p>{t("home.hero.description")}</p>

          <div className="actions">
            <Link className="primary" to="/missions">{t("home.hero.primaryAction")} <ArrowUpRight size={18} /></Link>
            <Link className="secondary" to="/galaxy">{t("home.hero.secondaryAction")} <Orbit size={17} /></Link>
          </div>

          <div className="signal"><span className="dot" />{t("home.hero.liveSignal")}</div>
        </div>

        <div className="planet-zone">
          <div
            className="planet-system"
            style={{
              transform: reduceMotion
                ? undefined
                : `rotateX(${pointer.y * -8}deg) rotateY(${pointer.x * 10}deg) translate3d(${pointer.x * 12}px,${pointer.y * 9}px,0)`,
            }}
          >
            <div className="halo" />
            <div className="orbit orbit-a"><span className="particle" /></div>
            <div className="orbit orbit-b" />
            <div className="orbit orbit-c" />
            <div className="genesis-world">
              <div className="planet-atmosphere" />
              <div className="planet-core">
                <span className="planet-light" />
                <span className="planet-shadow" />
                <span className="planet-label">{t("home.hero.planetLabel")}</span>
              </div>

              <div className="glass bubo-transmission">
                <div className="transmission-image">
                  <img
                    src={`${import.meta.env.BASE_URL}images/bubo/bubo-default.png`}
                    alt={t("home.hero.transmissionAlt")}
                  />
                </div>
                <div className="transmission-copy">
                  <span>{t("home.hero.transmissionLabel")}</span>
                  <strong>{t("home.hero.transmissionTitle")}</strong>
                  <p>“{t("home.hero.transmissionText")}”</p>
                </div>
              </div>
            </div>
            <div className="chip chip-a"><Satellite size={15} />{t("home.hero.signalStable")}</div>
            <div className="chip chip-b"><ShieldCheck size={15} />{t("home.hero.sectorOnline")}</div>
            <div className="sector"><Orbit size={14} />{t("home.hero.sectorStatus")}</div>
          </div>
        </div>
      </motion.section>

      <LiveUniverse
        buildersJoined={universeStats.buildersJoined}
        gpGenerated={universeStats.gpGenerated}
        newBuildersThisWeek={universeStats.newBuildersThisWeek}
      />

      <Journey />

      <GalacticSky
        builderCount={universeStats.buildersJoined}
        galaxiesCreated={universeStats.galaxiesCreated}
        newBuildersThisWeek={universeStats.newBuildersThisWeek}
      />

      <motion.section className="stats" variants={fadeUp}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          const decimals =
            "decimals" in stat && typeof stat.decimals === "number"
              ? stat.decimals
              : 0;

          return (
            <article className="glass stat" key={stat.label}>
              <div className="stat-icon">
                <Icon size={20} />
              </div>

              <strong>
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  decimals={decimals}
                />
              </strong>

              <span>{stat.label}</span>
            </article>
          );
        })}
      </motion.section>

      <motion.section className="glass transmission" variants={fadeUp}>
        <div>
          <div className="eyebrow">LATEST TRANSMISSION</div>
          <h2>“The universe is not waiting for heroes.”</h2>
          <p>“It is waiting for Builders.”</p>
        </div>
        <em>— Wizard BOBU</em>
      </motion.section>

      <motion.section className="section" variants={fadeUp}>
        <header className="section-header">
          <div>
            <div className="eyebrow"><Target size={15} />MISSION NETWORK</div>
            <h2>Your next move matters.</h2>
            <p>Begin with simple missions, earn visible progress and prepare for future community challenges.</p>
          </div>
          <Link className="text-link" to="/missions">View all missions <ArrowRight size={17} /></Link>
        </header>

        <div className="mission-grid">
          {missions.map(({ code, title, text, reward, icon: Icon, soon }) => (
            <article className={`glass mission-card ${soon ? "soon" : ""}`} key={code}>
              <div className="mission-top">
                <div className="mission-icon"><Icon size={22} /></div>
                <span className="status">{soon ? "COMING SOON" : "ACTIVE"}</span>
              </div>
              <small>{code}</small>
              <h3>{title}</h3>
              <p>{text}</p>
              <footer className="mission-footer"><span><Star size={15} /> {reward}</span><ArrowRight size={17} /></footer>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section className="section" variants={fadeUp}>
        <header className="section-header">
          <div>
            <div className="eyebrow"><Map size={15} />GALAXY ROADMAP</div>
            <h2>The universe expands in phases.</h2>
            <p>Each phase introduces a new layer of identity, participation and community-driven experiences.</p>
          </div>
          <Link className="text-link" to="/galaxy">Open Galactic Map <ArrowRight size={17} /></Link>
        </header>

        <div className="roadmap">
          <article className="glass roadmap-intro">
            <Rocket size={30} />
            <h3>Genesis is only the beginning.</h3>
            <p>The current phase establishes the foundation of BOBU Universe. Missions, arcade experiences and collaborative sectors will continue expanding the network.</p>
            <div className="progress"><div className="eyebrow">UNIVERSE PROGRESS · 50%</div><div className="track"><div className="fill" /></div></div>
          </article>

          <div className="timeline">
            {roadmap.map(([phase, title, text, done]) => (
              <article className="glass timeline-card" key={phase}>
                <div className={`marker ${done ? "done" : ""}`}>{done ? <CheckCircle2 size={19} /> : <Circle size={15} />}</div>
                <div><small>{phase}</small><h4>{title}</h4><p>{text}</p></div>
                <strong>{done ? "ONLINE" : "PLANNED"}</strong>
              </article>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="section glass community" variants={fadeUp}>
        <div className="community-grid">
          <div>
            <div className="eyebrow"><Users size={15} />BUILDER CIVILIZATION</div>
            <h2>Not an audience. A civilization.</h2>
            <p>BOBU Universe grows through participation. Explore the story, complete missions, create culture and help shape what comes next.</p>
            <div className="actions">
              <Link className="primary" to="/missions">Begin Your Journey <Zap size={17} /></Link>
              <Link className="secondary" to="/command-deck">Open Command Deck <Satellite size={17} /></Link>
            </div>
          </div>

          <div className="benefits">
            {benefits.map(([title, text, Icon]) => (
              <article className="benefit" key={title}>
                <div className="benefit-icon"><Icon size={20} /></div>
                <div><h4>{title}</h4><p>{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="final" variants={fadeUp}>
        <div className="eyebrow">THE SIGNAL IS WAITING</div>
        <h2>Your sector begins with one mission.</h2>
        <p>Enter Mission Control, build your Bobonaut profile and become part of the expanding BOBU Universe.</p>
        <div className="final-actions">
          <Link className="primary" to="/missions">Enter Mission Control <Target size={17} /></Link>
          <Link className="secondary" to="/genesis">Read the Genesis <Gem size={17} /></Link>
        </div>
      </motion.section>
      </motion.main>
    </>
  );
}

