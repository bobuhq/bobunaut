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
  Smartphone,
  Pickaxe,
  WalletCards,
  BadgeCheck,
  ListChecks,
  Network,
  Bot,
  CirclePlay,
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
    labelKey: "home.stats.buildersJoined",
    value: stats.buildersJoined,
    suffix: "",
    icon: Users,
  },
  {
    labelKey: "home.stats.galaxiesCreated",
    value: stats.galaxiesCreated,
    suffix: "",
    icon: Orbit,
  },
  {
    labelKey: "home.stats.alliancesFormed",
    value: stats.alliancesFormed,
    suffix: "",
    icon: Globe2,
  },
  {
    labelKey: "home.stats.gpGenerated",
    value: stats.gpGenerated,
    suffix: "",
    icon: Gem,
  },
] as const;

const missions = [
  {
    code: "M-001",
    titleKey: "home.missions.restoreSignal.title",
    descriptionKey: "home.missions.restoreSignal.description",
    rewardKey: "home.missions.restoreSignal.reward",
    icon: RadioTower,
    soon: false,
  },
  {
    code: "M-002",
    titleKey: "home.missions.joinChannels.title",
    descriptionKey: "home.missions.joinChannels.description",
    rewardKey: "home.missions.joinChannels.reward",
    icon: Users,
    soon: false,
  },
  {
    code: "M-004",
    titleKey: "home.missions.arcade.title",
    descriptionKey: "home.missions.arcade.description",
    rewardKey: "home.missions.arcade.reward",
    icon: Gamepad2,
    soon: true,
  },
] as const;

const roadmap = [
  [
    "home.roadmap.phase1.code",
    "home.roadmap.phase1.title",
    "home.roadmap.phase1.description",
    true,
  ],
  [
    "home.roadmap.phase2.code",
    "home.roadmap.phase2.title",
    "home.roadmap.phase2.description",
    true,
  ],
  [
    "home.roadmap.phase3.code",
    "home.roadmap.phase3.title",
    "home.roadmap.phase3.description",
    false,
  ],
  [
    "home.roadmap.phase4.code",
    "home.roadmap.phase4.title",
    "home.roadmap.phase4.description",
    false,
  ],
] as const;

const benefits = [
  [
    "home.community.missions.title",
    "home.community.missions.description",
    Target,
  ],
  [
    "home.community.recognition.title",
    "home.community.recognition.description",
    Award,
  ],
  [
    "home.community.discovery.title",
    "home.community.discovery.description",
    Globe2,
  ],
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function AnimatedCounter({ value, suffix = "", decimals = 0 }: CounterProps) {
  const { language } = useLanguage();
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
        : Math.round(current).toLocaleString(language),
    [current, decimals, language],
  );

  return <>{output}{suffix}</>;
}

const bobuNetworkFeatures = [
  ["home.network.features.mining", Pickaxe],
  ["home.network.features.passport", BadgeCheck],
  ["home.network.features.wallet", WalletCards],
  ["home.network.features.missions", ListChecks],
  ["home.network.features.galaxy", Network],
  ["home.network.features.ai", Bot],
] as const;

export function Home() {
  const { t } = useLanguage();

  const appStoreUrl =
    import.meta.env.VITE_BOBU_NETWORK_APP_STORE_URL?.trim();

  const googlePlayUrl =
    import.meta.env.VITE_BOBU_NETWORK_GOOGLE_PLAY_URL?.trim();

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
        .bubo-transmission{position:absolute;z-index:7;right:-30px;bottom:-10px;display:grid;grid-template-columns:86px 1fr;gap:15px;align-items:center;width:min(352px,88%);padding:13px;border-radius:20px;transform:translateZ(50px);box-shadow:0 20px 55px rgba(0,0,0,.34),0 0 32px rgba(103,92,255,.11)}
        .transmission-image{position:relative;width:86px;height:86px;overflow:hidden;border:1px solid rgba(103,232,249,.35);border-radius:18px;background:radial-gradient(circle at 50% 35%,rgba(115,79,255,.24),rgba(7,9,20,.92) 72%);box-shadow:0 0 0 3px rgba(122,92,255,.07),0 0 24px rgba(74,178,255,.2)}
        .transmission-image img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;opacity:1;transform:scale(1.03);filter:saturate(1.12) contrast(1.08) brightness(1.05);animation:transmissionBobuPulse 4.6s ease-in-out infinite}
        .transmission-copy span{display:block;margin-bottom:5px;color:var(--cyan);font-size:8px;font-weight:900;letter-spacing:.15em}
        .transmission-copy strong{display:block;color:#fff;font-size:10px;line-height:1.4;letter-spacing:.04em}
        .transmission-copy p{margin:6px 0 0;color:#c9c1d9;font-size:10px;line-height:1.5}
        .chip{position:absolute;display:flex;align-items:center;gap:9px;padding:11px 14px;border:1px solid var(--border);border-radius:14px;color:#c8c1dc;background:rgba(12,13,25,.7);font-size:11px;font-weight:800}
        .chip-a{top:14%;left:0}.chip-b{right:-1%;bottom:24%}
        .sector{position:absolute;bottom:7%;display:flex;align-items:center;gap:9px;color:rgba(187,180,219,.53);font:700 10px Georgia;letter-spacing:.16em}
        .network-showcase{position:relative;display:grid;grid-template-columns:.92fr 1.08fr;gap:44px;align-items:center;margin-top:78px;padding:42px;border-radius:32px;overflow:hidden}
        .network-showcase:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 78% 35%,rgba(58,189,248,.14),transparent 35%),radial-gradient(circle at 18% 75%,rgba(139,92,246,.17),transparent 38%)}
        .network-copy,.network-visual{position:relative;z-index:1}
        .network-copy h2{max-width:610px;margin:8px 0 16px;font-size:clamp(42px,6vw,74px);line-height:.94;letter-spacing:-.055em}
        .network-copy>p{max-width:620px;margin:0;color:var(--muted);font-size:16px;line-height:1.75}
        .network-features{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:26px}
        .network-feature{display:flex;align-items:center;gap:11px;min-height:49px;padding:11px 13px;border:1px solid rgba(196,181,253,.13);border-radius:14px;color:#ddd7ec;background:rgba(255,255,255,.025);font-size:12px;font-weight:800}
        .network-feature svg{flex:0 0 auto;color:var(--cyan)}
        .store-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:25px}
        .store-card{display:flex;min-height:68px;align-items:center;gap:12px;padding:12px 15px;border:1px solid rgba(196,181,253,.18);border-radius:16px;color:#fff;text-decoration:none;background:rgba(7,9,20,.66)}
        .store-card.is-active{transition:transform .18s,border-color .18s}
        .store-card.is-active:hover{transform:translateY(-2px);border-color:rgba(103,232,249,.5)}
        .store-card.is-disabled{cursor:not-allowed;opacity:.72}
        .store-card span{display:grid;gap:3px}
        .store-card small{color:#9d94ad;font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
        .store-card strong{font-size:14px}
        .network-release{margin-top:17px;color:#a99fba;font-size:11px;line-height:1.6}
        .network-visual{display:grid;place-items:center}
        .network-image-shell{position:relative;width:100%;overflow:hidden;border:1px solid rgba(103,232,249,.18);border-radius:26px;background:#070914;box-shadow:0 28px 75px rgba(0,0,0,.42),0 0 70px rgba(90,67,220,.13)}
        .network-image-shell:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 60px rgba(0,0,0,.32)}
        .network-image-shell img{display:block;width:100%;height:auto;object-fit:cover}
        .network-badge{position:absolute;right:18px;bottom:18px;display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid rgba(103,232,249,.24);border-radius:13px;color:#dffaff;background:rgba(4,8,22,.82);font-size:10px;font-weight:900;letter-spacing:.1em;backdrop-filter:blur(14px)}
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
        @keyframes transmissionBobuPulse{
          0%,100%{
            transform:scale(1.03);
            filter:saturate(1.12) contrast(1.08) brightness(1.05)
              drop-shadow(0 0 7px rgba(71,190,255,.22))
          }
          50%{
            transform:scale(1.075);
            filter:saturate(1.18) contrast(1.1) brightness(1.1)
              drop-shadow(0 0 13px rgba(133,83,255,.4))
          }
        }
        @keyframes orbitA{to{transform:rotate(360deg)}}@keyframes orbitB{to{transform:rotate(-360deg)}}@keyframes orbitC{to{transform:rotate(360deg)}}@keyframes planetFloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-14px) rotate(1deg)}}@keyframes planetPulse{0%,100%{opacity:.62;transform:scale(.95)}50%{opacity:1;transform:scale(1.08)}}@keyframes innerOrbit{to{transform:rotate(360deg)}}
        @media(max-width:980px){.hero,.roadmap,.community-grid,.network-showcase{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}.mission-grid{grid-template-columns:1fr 1fr}.mission-card:last-child{grid-column:1/-1}.network-visual{order:-1}.network-image-shell{max-width:760px}}
        @media(max-width:720px){.home-v2{width:calc(100% - 20px)}.stats,.mission-grid,.network-features,.store-actions{grid-template-columns:1fr}.mission-card:last-child{grid-column:auto}.section-header,.transmission{align-items:flex-start;flex-direction:column}.chip{display:none}.network-showcase{padding:24px 18px;border-radius:24px}}
        @media(prefers-reduced-motion:reduce){
          .transmission-image img{animation:none}
        }
        @media(max-width:520px){.hero-copy{padding:30px 14px}.actions,.final-actions{flex-direction:column}.primary,.secondary{width:100%}.planet-zone{min-height:390px}.genesis-world{width:94%;min-height:390px}.planet-core{width:62%}.bubo-transmission{right:0;bottom:0;width:96%;grid-template-columns:74px 1fr}.transmission-image{width:74px;height:74px}.community{padding:30px 20px}}
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
                    src={`${import.meta.env.BASE_URL}images/bobu/avatar.png`}
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

      <motion.section
        className="glass network-showcase"
        variants={fadeUp}
      >
        <div className="network-copy">
          <div className="eyebrow">
            <Smartphone size={15} />
            {t("home.network.eyebrow")}
          </div>

          <h2>{t("home.network.title")}</h2>
          <p>{t("home.network.description")}</p>

          <div className="network-features">
            {bobuNetworkFeatures.map(([labelKey, Icon]) => (
              <div className="network-feature" key={labelKey}>
                <Icon size={17} />
                <span>{t(labelKey)}</span>
              </div>
            ))}
          </div>

          <div className="store-actions">
            {appStoreUrl ? (
              <a
                className="store-card is-active"
                href={appStoreUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Smartphone size={24} />
                <span>
                  <small>{t("home.network.availableOn")}</small>
                  <strong>{t("home.network.appStore")}</strong>
                </span>
              </a>
            ) : (
              <div
                className="store-card is-disabled"
                aria-disabled="true"
              >
                <Smartphone size={24} />
                <span>
                  <small>{t("home.network.comingSoon")}</small>
                  <strong>{t("home.network.appStore")}</strong>
                </span>
              </div>
            )}

            {googlePlayUrl ? (
              <a
                className="store-card is-active"
                href={googlePlayUrl}
                target="_blank"
                rel="noreferrer"
              >
                <CirclePlay size={24} />
                <span>
                  <small>{t("home.network.availableOn")}</small>
                  <strong>{t("home.network.googlePlay")}</strong>
                </span>
              </a>
            ) : (
              <div
                className="store-card is-disabled"
                aria-disabled="true"
              >
                <CirclePlay size={24} />
                <span>
                  <small>{t("home.network.comingSoon")}</small>
                  <strong>{t("home.network.googlePlay")}</strong>
                </span>
              </div>
            )}
          </div>

          <p className="network-release">
            {t("home.network.release")}
          </p>
        </div>

        <div className="network-visual">
          <div className="network-image-shell">
            <img
              src={`${import.meta.env.BASE_URL}images/bobu-network/bobu-network-official-brand-board.png`}
              alt={t("home.network.imageAlt")}
            />

            <div className="network-badge">
              <span className="dot" />
              {t("home.network.officialApp")}
            </div>
          </div>
        </div>
      </motion.section>

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
            <article className="glass stat" key={stat.labelKey}>
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

              <span>{t(stat.labelKey)}</span>
            </article>
          );
        })}
      </motion.section>

      <motion.section className="glass transmission" variants={fadeUp}>
        <div>
          <div className="eyebrow">{t("home.transmission.eyebrow")}</div>
          <h2>“{t("home.transmission.quote")}”</h2>
          <p>“{t("home.transmission.reply")}”</p>
        </div>
        <em>{t("home.transmission.author")}</em>
      </motion.section>

      <motion.section className="section" variants={fadeUp}>
        <header className="section-header">
          <div>
            <div className="eyebrow"><Target size={15} />{t("home.missions.eyebrow")}</div>
            <h2>{t("home.missions.title")}</h2>
            <p>{t("home.missions.description")}</p>
          </div>
          <Link className="text-link" to="/missions">{t("home.missions.viewAll")} <ArrowRight size={17} /></Link>
        </header>

        <div className="mission-grid">
          {missions.map(({ code, titleKey, descriptionKey, rewardKey, icon: Icon, soon }) => (
            <article className={`glass mission-card ${soon ? "soon" : ""}`} key={code}>
              <div className="mission-top">
                <div className="mission-icon"><Icon size={22} /></div>
                <span className="status">{soon ? t("home.missions.status.comingSoon") : t("home.missions.status.active")}</span>
              </div>
              <small>{code}</small>
              <h3>{t(titleKey)}</h3>
              <p>{t(descriptionKey)}</p>
              <footer className="mission-footer"><span><Star size={15} /> {t(rewardKey)}</span><ArrowRight size={17} /></footer>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section className="section" variants={fadeUp}>
        <header className="section-header">
          <div>
            <div className="eyebrow"><Map size={15} />{t("home.roadmap.eyebrow")}</div>
            <h2>{t("home.roadmap.title")}</h2>
            <p>{t("home.roadmap.description")}</p>
          </div>
          <Link className="text-link" to="/galaxy">{t("home.roadmap.openMap")} <ArrowRight size={17} /></Link>
        </header>

        <div className="roadmap">
          <article className="glass roadmap-intro">
            <Rocket size={30} />
            <h3>{t("home.roadmap.introTitle")}</h3>
            <p>{t("home.roadmap.introDescription")}</p>
            <div className="progress"><div className="eyebrow">{t("home.roadmap.progress")}</div><div className="track"><div className="fill" /></div></div>
          </article>

          <div className="timeline">
            {roadmap.map(([phaseKey, titleKey, descriptionKey, done]) => (
              <article className="glass timeline-card" key={phaseKey}>
                <div className={`marker ${done ? "done" : ""}`}>{done ? <CheckCircle2 size={19} /> : <Circle size={15} />}</div>
                <div><small>{t(phaseKey)}</small><h4>{t(titleKey)}</h4><p>{t(descriptionKey)}</p></div>
                <strong>{done ? t("home.roadmap.status.online") : t("home.roadmap.status.planned")}</strong>
              </article>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="section glass community" variants={fadeUp}>
        <div className="community-grid">
          <div>
            <div className="eyebrow"><Users size={15} />{t("home.community.eyebrow")}</div>
            <h2>{t("home.community.title")}</h2>
            <p>{t("home.community.description")}</p>
            <div className="actions">
              <Link className="primary" to="/missions">{t("home.community.beginJourney")} <Zap size={17} /></Link>
            </div>
          </div>

          <div className="benefits">
            {benefits.map(([titleKey, descriptionKey, Icon]) => (
              <article className="benefit" key={titleKey}>
                <div className="benefit-icon"><Icon size={20} /></div>
                <div><h4>{t(titleKey)}</h4><p>{t(descriptionKey)}</p></div>
              </article>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="final" variants={fadeUp}>
        <div className="eyebrow">{t("home.final.eyebrow")}</div>
        <h2>{t("home.final.title")}</h2>
        <p>{t("home.final.description")}</p>
        <div className="final-actions">
          <Link className="primary" to="/missions">{t("home.final.primaryAction")} <Target size={17} /></Link>
          <Link className="secondary" to="/genesis">{t("home.final.secondaryAction")} <Gem size={17} /></Link>
        </div>
      </motion.section>
      </motion.main>
    </>
  );
}

