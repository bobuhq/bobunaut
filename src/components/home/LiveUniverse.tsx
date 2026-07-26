import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "../ui/AnimatedCounter";
import {
  Activity,
  Gem,
  Globe2,
  Orbit,
  RadioTower,
  Rocket,
  Users,
} from "lucide-react";

const universeMetrics = [
  {
    label: "Universe Status",
    value: "ONLINE",
    detail: "All core systems operational",
    icon: RadioTower,
  },
  {
    label: "Builders Online",
    value: 127,
    detail: "+18 during Genesis",
    icon: Users,
  },
  {
    label: "GP Generated",
    value: 18420,
    detail: "Mission energy accumulated",
    icon: Gem,
  },
  {
    label: "Genesis Progress",
    value: 18,
    detail: "Building the first civilization",
    icon: Rocket,
  },
] as const;

const activityPool = [
  {
    title: "Builder #0127 joined",
    detail: "Genesis Sector",
    time: "NOW",
    icon: Users,
  },
  {
    title: "Galaxy Aurora created",
    detail: "Sector coordinates confirmed",
    time: "2M",
    icon: Orbit,
  },
  {
    title: "250 GP generated",
    detail: "Mission M-001 completed",
    time: "4M",
    icon: Gem,
  },
  {
    title: "Builder #0128 joined",
    detail: "Aurora Sector",
    time: "NOW",
    icon: Users,
  },
  {
    title: "Galaxy Orion expanded",
    detail: "Three new Stars detected",
    time: "NOW",
    icon: Orbit,
  },
  {
    title: "420 GP generated",
    detail: "Community mission completed",
    time: "NOW",
    icon: Gem,
  },
  {
    title: "Builder #0129 joined",
    detail: "Genesis Sector",
    time: "NOW",
    icon: Users,
  },
  {
    title: "Galaxy Nova created",
    detail: "New constellation registered",
    time: "NOW",
    icon: Orbit,
  },
];

export function LiveUniverse() {
  const reduceMotion = useReducedMotion();
  const feedCursor = useRef(4);

  const [liveActivity, setLiveActivity] = useState(() =>
    activityPool.slice(0, 4)
  );

  useEffect(() => {
    if (reduceMotion) return;

    const intervalId = window.setInterval(() => {
      const nextActivity =
        activityPool[feedCursor.current % activityPool.length];

      feedCursor.current += 1;

      setLiveActivity((current) => [
        {
          ...nextActivity,
          time: "NOW",
        },
        ...current.slice(0, 3).map((item, index) => ({
          ...item,
          time: `${index + 1}M`,
        })),
      ]);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [reduceMotion]);

  return (
    <motion.section
      className="live-universe"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65 }}
    >
      <style>{`
        .live-universe{
          position:relative;
          display:grid;
          grid-template-columns:1.15fr .85fr;
          gap:16px;
          margin-top:16px;
        }

        .universe-panel,
        .activity-panel{
          position:relative;
          overflow:hidden;
          border:1px solid rgba(196,181,253,.16);
          border-radius:26px;
          background:
            radial-gradient(circle at 12% 0%,rgba(139,92,246,.13),transparent 38%),
            linear-gradient(145deg,rgba(18,20,34,.9),rgba(9,11,21,.82));
          box-shadow:
            0 24px 65px rgba(0,0,0,.25),
            inset 0 1px rgba(255,255,255,.04);
          backdrop-filter:blur(18px);
        }

        .universe-panel{padding:30px;}
        .activity-panel{padding:28px;}

        .live-heading{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:22px;
          margin-bottom:25px;
        }

        .live-kicker{
          display:flex;
          align-items:center;
          gap:9px;
          margin-bottom:9px;
          color:#67e8f9;
          font-size:10px;
          font-weight:900;
          letter-spacing:.18em;
        }

        .live-kicker-dot{
          width:7px;
          height:7px;
          border-radius:50%;
          background:#4ade80;
          box-shadow:0 0 16px #4ade80;
          animation:universeBlink 1.8s ease-in-out infinite;
        }

        .live-heading h2,
        .activity-header h3{
          margin:0;
          color:#f8f5ff;
        }

        .live-heading h2{
          font-size:clamp(30px,4vw,47px);
          line-height:1;
          letter-spacing:-.045em;
        }

        .era-badge{
          flex:none;
          padding:9px 12px;
          border:1px solid rgba(103,232,249,.16);
          border-radius:999px;
          color:#67e8f9;
          background:rgba(34,211,238,.055);
          font-size:9px;
          font-weight:900;
          letter-spacing:.14em;
        }

        .universe-metrics{
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:12px;
        }

        .universe-metric{
          min-height:147px;
          padding:19px;
          border:1px solid rgba(255,255,255,.055);
          border-radius:19px;
          background:rgba(255,255,255,.025);
        }

        .metric-icon{
          display:grid;
          width:37px;
          height:37px;
          place-items:center;
          margin-bottom:17px;
          border-radius:12px;
          color:#c4b5fd;
          background:rgba(139,92,246,.1);
        }

        .universe-metric strong{
          display:block;
          margin-bottom:5px;
          color:#fff;
          font-size:25px;
        }

        .universe-metric span{
          display:block;
          color:#c6bdd5;
          font-size:12px;
          font-weight:800;
        }

        .universe-metric small{
          display:block;
          margin-top:7px;
          color:#7f778d;
          font-size:10px;
          line-height:1.45;
        }

        .genesis-progress{margin-top:18px;}

        .progress-copy{
          display:flex;
          justify-content:space-between;
          margin-bottom:9px;
          color:#aaa0bb;
          font-size:10px;
          font-weight:800;
          letter-spacing:.1em;
        }

        .progress-track{
          height:7px;
          overflow:hidden;
          border-radius:999px;
          background:rgba(255,255,255,.06);
        }

        .progress-fill{
          width:18%;
          height:100%;
          border-radius:inherit;
          background:linear-gradient(90deg,#8b5cf6,#67e8f9);
          box-shadow:0 0 20px rgba(103,232,249,.22);
        }

        .activity-header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:17px;
        }

        .activity-header h3{font-size:21px;}
        .activity-icon{color:#67e8f9;}
        .activity-list{display:grid;gap:9px;}

        .activity-item{
          display:grid;
          grid-template-columns:38px 1fr auto;
          gap:12px;
          align-items:center;
          padding:13px;
          border:1px solid rgba(255,255,255,.05);
          border-radius:16px;
          background:rgba(255,255,255,.022);
        }

        .activity-item-icon{
          display:grid;
          width:38px;
          height:38px;
          place-items:center;
          border-radius:12px;
          color:#67e8f9;
          background:rgba(34,211,238,.07);
        }

        .activity-item strong{
          display:block;
          color:#eeeaf7;
          font-size:11px;
        }

        .activity-item p{
          margin:4px 0 0;
          color:#837b91;
          font-size:9px;
        }

        .activity-time{
          color:#4ade80;
          font-size:8px;
          font-weight:900;
          letter-spacing:.1em;
        }

        .system-message{
          display:flex;
          align-items:center;
          gap:8px;
          margin-top:15px;
          color:#777082;
          font-size:9px;
          font-weight:800;
          letter-spacing:.08em;
        }

        @keyframes universeBlink{
          0%,100%{opacity:.55;transform:scale(.9)}
          50%{opacity:1;transform:scale(1.15)}
        }

        @media(max-width:900px){
          .live-universe{grid-template-columns:1fr;}
        }

        @media(max-width:600px){
          .universe-panel,
          .activity-panel{padding:21px;}
          .live-heading{flex-direction:column;}
          .universe-metrics{grid-template-columns:1fr;}
        }
      `}</style>

      <article className="universe-panel">
        <header className="live-heading">
          <div>
            <div className="live-kicker">
              <span className="live-kicker-dot" />
              LIVE UNIVERSE
            </div>
            <h2>The Genesis network is alive.</h2>
          </div>
          <span className="era-badge">GENESIS ERA</span>
        </header>

        <div className="universe-metrics">
          {universeMetrics.map(({ label, value, detail, icon: Icon }) => (
            <div className="universe-metric" key={label}>
              <div className="metric-icon"><Icon size={18} /></div>
              <strong>
                {typeof value === "number" ? (
                  <AnimatedCounter
                    value={value}
                    suffix={label === "Genesis Progress" ? "%" : ""}
                    live={label === "Builders Online" || label === "GP Generated"}
                    liveStep={label === "GP Generated" ? 3 : 1}
                    liveInterval={label === "GP Generated" ? 2200 : 7000}
                  />
                ) : (
                  value
                )}
              </strong>
              <span>{label}</span>
              <small>{detail}</small>
            </div>
          ))}
        </div>

        <div className="genesis-progress">
          <div className="progress-copy">
            <span>UNIVERSE EXPANSION</span>
            <span>18%</span>
          </div>
          <div className="progress-track">
            <motion.div
              className="progress-fill"
              initial={{ width: reduceMotion ? "18%" : 0 }}
              whileInView={{ width: "18%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </article>

      <aside className="activity-panel">
        <header className="activity-header">
          <div>
            <div className="live-kicker">
              <span className="live-kicker-dot" />
              NETWORK ACTIVITY
            </div>
            <h3>Live signals</h3>
          </div>
          <Activity className="activity-icon" size={20} />
        </header>

        <div className="activity-list">
          {liveActivity.map(({ title, detail, time, icon: Icon }, index) => (
            <motion.div
              className="activity-item"
              key={`${title}-${time}-${index}`}
              initial={{ opacity: 0, x: reduceMotion ? 0 : 18, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
            >
              <div className="activity-item-icon"><Icon size={17} /></div>
              <div>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
              <span className="activity-time">{time}</span>
            </motion.div>
          ))}
        </div>

        <div className="system-message">
          <RadioTower size={13} />
          SYSTEM LISTENING FOR NEW TRANSMISSIONS
        </div>
      </aside>
    </motion.section>
  );
}
