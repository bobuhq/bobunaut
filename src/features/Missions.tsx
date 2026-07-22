import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  ExternalLink,
  Gamepad2,
  Gem,
  Gift,
  Globe2,
  Instagram,
  LockKeyhole,
  Medal,
  RadioTower,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Twitter,
  Users,
  Zap,
} from "lucide-react";

type MissionStatus = "available" | "completed" | "locked";

type Mission = {
  id: string;
  category: string;
  title: string;
  description: string;
  reward: string;
  gems: number;
  difficulty: string;
  duration: string;
  status: MissionStatus;
  icon: typeof RadioTower;
  action?: string;
};

const missions: Mission[] = [
  {
    id: "M-001",
    category: "DAILY SIGNAL",
    title: "Restore the BOBU Signal",
    description:
      "Check Mission Control and reconnect with the latest signal from BOBU Universe.",
    reward: "250 XP",
    gems: 20,
    difficulty: "Easy",
    duration: "1 min",
    status: "available",
    icon: RadioTower,
    action: "Complete Mission",
  },
  {
    id: "M-002",
    category: "COMMUNITY",
    title: "Join Official Channels",
    description:
      "Connect with the official BOBU community across X, Telegram and Instagram.",
    reward: "600 XP",
    gems: 50,
    difficulty: "Easy",
    duration: "3 min",
    status: "available",
    icon: Users,
    action: "Open Channels",
  },
  {
    id: "M-003",
    category: "CREATOR MISSION",
    title: "Create Your First BOBU Meme",
    description:
      "Create an original BOBU meme and prepare it for an upcoming community challenge.",
    reward: "900 XP",
    gems: 75,
    difficulty: "Medium",
    duration: "10 min",
    status: "available",
    icon: Sparkles,
    action: "Start Creating",
  },
  {
    id: "M-004",
    category: "ARCADE",
    title: "Enter Arcade Orbit",
    description:
      "The first playable BOBU mission will unlock during the next development cycle.",
    reward: "Classified",
    gems: 0,
    difficulty: "Unknown",
    duration: "Coming Soon",
    status: "locked",
    icon: Gamepad2,
  },
];

const rewards = [
  {
    title: "Gift Card Campaigns",
    description: "Limited promotional missions with clear campaign rules.",
    icon: Gift,
  },
  {
    title: "Selected Airdrops",
    description: "Eligibility opportunities tied to verified mission activity.",
    icon: Rocket,
  },
  {
    title: "Exclusive Badges",
    description: "Permanent recognition for active Bobonauts and creators.",
    icon: Award,
  },
  {
    title: "Leaderboard Access",
    description: "Future seasonal rankings for missions and arcade scores.",
    icon: Trophy,
  },
];

const socialChannels = [
  {
    name: "X",
    handle: "@bobu_hq",
    href: "https://x.com/bobu_hq",
    icon: Twitter,
  },
  {
    name: "Instagram",
    handle: "@bobu_solana_coin",
    href: "https://instagram.com/bobu_solana_coin",
    icon: Instagram,
  },
  {
    name: "Telegram",
    handle: "Official Community",
    href: "https://t.me/+I0Q01kVMYw41YjA0",
    icon: Globe2,
  },
];

const activity = [
  {
    title: "Mission Control Access",
    description: "Your Bobonaut profile entered the mission network.",
    completed: true,
  },
  {
    title: "Official Signal Detected",
    description: "BOBU Universe communication channels are online.",
    completed: true,
  },
  {
    title: "Complete First Mission",
    description: "Finish one active mission to begin your progress.",
    completed: false,
  },
  {
    title: "Unlock First Badge",
    description: "Earn recognition through verified participation.",
    completed: false,
  },
];

export function Missions() {
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [showChannels, setShowChannels] = useState(false);

  const completedCount = completedMissionIds.length;
  const totalAvailable = missions.filter(
    (mission) => mission.status !== "locked",
  ).length;

  const totalXp = useMemo(() => {
    return completedMissionIds.reduce((total, id) => {
      const mission = missions.find((item) => item.id === id);
      if (!mission) return total;

      const value = Number.parseInt(mission.reward.replace(/\D/g, ""), 10);
      return total + (Number.isNaN(value) ? 0 : value);
    }, 0);
  }, [completedMissionIds]);

  const totalGems = useMemo(() => {
    return completedMissionIds.reduce((total, id) => {
      const mission = missions.find((item) => item.id === id);
      return total + (mission?.gems ?? 0);
    }, 0);
  }, [completedMissionIds]);

  const progress =
    totalAvailable === 0
      ? 0
      : Math.round((completedCount / totalAvailable) * 100);

  function handleMission(mission: Mission) {
    if (mission.status === "locked") return;

    if (mission.id === "M-002") {
      setShowChannels((current) => !current);
      return;
    }

    setCompletedMissionIds((current) => {
      if (current.includes(mission.id)) {
        return current.filter((id) => id !== mission.id);
      }

      return [...current, mission.id];
    });
  }

  function markCommunityMissionCompleted() {
    setCompletedMissionIds((current) => {
      if (current.includes("M-002")) return current;
      return [...current, "M-002"];
    });
  }

  return (
    <motion.main
      className="mission-control"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <style>{`
        .mission-control {
          --mc-bg: #08030f;
          --mc-panel: rgba(24, 12, 38, 0.78);
          --mc-panel-strong: rgba(31, 14, 49, 0.94);
          --mc-border: rgba(187, 113, 255, 0.22);
          --mc-purple: #a855f7;
          --mc-purple-light: #d8b4fe;
          --mc-cyan: #22d3ee;
          --mc-gold: #f5cf65;
          --mc-green: #4ade80;
          --mc-red: #fb7185;
          --mc-text: #faf7ff;
          --mc-muted: #b9abc9;

          position: relative;
          overflow: hidden;
          min-height: 100vh;
          padding: 46px 0 96px;
          color: var(--mc-text);
        }

        .mission-control::before,
        .mission-control::after {
          content: "";
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(90px);
          opacity: 0.28;
        }

        .mission-control::before {
          width: 380px;
          height: 380px;
          top: 80px;
          right: -140px;
          background: #7c3aed;
        }

        .mission-control::after {
          width: 320px;
          height: 320px;
          bottom: 80px;
          left: -160px;
          background: #0891b2;
        }

        .mc-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }

        .mc-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 13px;
          margin-bottom: 20px;
          border: 1px solid rgba(168, 85, 247, 0.36);
          border-radius: 999px;
          background: rgba(168, 85, 247, 0.08);
          color: var(--mc-purple-light);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .mc-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
          gap: 28px;
          align-items: stretch;
          margin-bottom: 28px;
        }

        .mc-hero-copy,
        .mc-commander-card,
        .mc-panel,
        .mc-mission-card,
        .mc-stat-card,
        .mc-reward-card {
          border: 1px solid var(--mc-border);
          background:
            linear-gradient(
              145deg,
              rgba(32, 15, 49, 0.9),
              rgba(12, 7, 22, 0.78)
            );
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(18px);
        }

        .mc-hero-copy {
          position: relative;
          overflow: hidden;
          min-height: 330px;
          padding: clamp(30px, 5vw, 62px);
          border-radius: 30px;
        }

        .mc-hero-copy::after {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          top: -120px;
          right: -90px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(34, 211, 238, 0.24),
            transparent 68%
          );
        }

        .mc-hero-copy h1 {
          max-width: 760px;
          margin: 0 0 20px;
          font-size: clamp(44px, 8vw, 86px);
          line-height: 0.92;
          letter-spacing: -0.055em;
        }

        .mc-gradient-text {
          background: linear-gradient(
            100deg,
            #ffffff 0%,
            #d8b4fe 46%,
            #67e8f9 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .mc-hero-copy p {
          max-width: 680px;
          margin: 0;
          color: var(--mc-muted);
          font-size: clamp(16px, 2vw, 19px);
          line-height: 1.75;
        }

        .mc-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .mc-primary-button,
        .mc-secondary-button,
        .mc-mission-button,
        .mc-channel-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 46px;
          border-radius: 14px;
          border: 0;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .mc-primary-button {
          padding: 0 20px;
          color: #0c0612;
          background: linear-gradient(120deg, #c084fc, #67e8f9);
          box-shadow: 0 14px 34px rgba(168, 85, 247, 0.2);
        }

        .mc-secondary-button {
          padding: 0 20px;
          border: 1px solid var(--mc-border);
          color: var(--mc-text);
          background: rgba(255, 255, 255, 0.035);
        }

        .mc-primary-button:hover,
        .mc-secondary-button:hover,
        .mc-mission-button:hover,
        .mc-channel-link:hover {
          transform: translateY(-2px);
        }

        .mc-commander-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 330px;
          padding: 28px;
          border-radius: 30px;
        }

        .mc-status-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .mc-online {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--mc-green);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .mc-online-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: currentColor;
          box-shadow: 0 0 16px currentColor;
        }

        .mc-rank-icon {
          display: grid;
          width: 62px;
          height: 62px;
          place-items: center;
          margin: 26px 0 18px;
          border: 1px solid rgba(245, 207, 101, 0.28);
          border-radius: 20px;
          color: var(--mc-gold);
          background: rgba(245, 207, 101, 0.08);
        }

        .mc-commander-card h2 {
          margin: 0;
          font-size: 28px;
        }

        .mc-commander-card p {
          margin: 10px 0 0;
          color: var(--mc-muted);
          line-height: 1.65;
        }

        .mc-progress-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 24px 0 9px;
          color: var(--mc-muted);
          font-size: 12px;
          font-weight: 700;
        }

        .mc-progress-track {
          overflow: hidden;
          height: 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
        }

        .mc-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #a855f7, #22d3ee);
          box-shadow: 0 0 22px rgba(34, 211, 238, 0.35);
          transition: width 300ms ease;
        }

        .mc-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 28px;
        }

        .mc-stat-card {
          display: flex;
          align-items: center;
          gap: 15px;
          min-height: 112px;
          padding: 20px;
          border-radius: 22px;
        }

        .mc-stat-icon {
          display: grid;
          flex: 0 0 auto;
          width: 46px;
          height: 46px;
          place-items: center;
          border-radius: 15px;
          color: var(--mc-purple-light);
          background: rgba(168, 85, 247, 0.1);
        }

        .mc-stat-card:nth-child(2) .mc-stat-icon {
          color: var(--mc-cyan);
          background: rgba(34, 211, 238, 0.09);
        }

        .mc-stat-card:nth-child(3) .mc-stat-icon {
          color: var(--mc-gold);
          background: rgba(245, 207, 101, 0.09);
        }

        .mc-stat-card:nth-child(4) .mc-stat-icon {
          color: var(--mc-green);
          background: rgba(74, 222, 128, 0.09);
        }

        .mc-stat-card span {
          display: block;
          margin-bottom: 3px;
          color: var(--mc-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .mc-stat-card strong {
          font-size: 24px;
        }

        .mc-section {
          margin-top: 34px;
        }

        .mc-section-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 17px;
        }

        .mc-section-heading h2 {
          margin: 0;
          font-size: clamp(26px, 4vw, 38px);
          letter-spacing: -0.035em;
        }

        .mc-section-heading p {
          max-width: 560px;
          margin: 8px 0 0;
          color: var(--mc-muted);
          line-height: 1.6;
        }

        .mc-section-count {
          flex: 0 0 auto;
          color: var(--mc-purple-light);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .mc-mission-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .mc-mission-card {
          position: relative;
          overflow: hidden;
          padding: 24px;
          border-radius: 24px;
          transition:
            transform 180ms ease,
            border-color 180ms ease;
        }

        .mc-mission-card:hover {
          transform: translateY(-3px);
          border-color: rgba(196, 135, 255, 0.42);
        }

        .mc-mission-card.is-completed {
          border-color: rgba(74, 222, 128, 0.3);
        }

        .mc-mission-card.is-locked {
          opacity: 0.66;
        }

        .mc-mission-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .mc-mission-icon {
          display: grid;
          width: 48px;
          height: 48px;
          place-items: center;
          border-radius: 16px;
          color: var(--mc-cyan);
          background: rgba(34, 211, 238, 0.09);
        }

        .mc-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .mc-status-badge.available {
          color: var(--mc-cyan);
          background: rgba(34, 211, 238, 0.09);
        }

        .mc-status-badge.completed {
          color: var(--mc-green);
          background: rgba(74, 222, 128, 0.09);
        }

        .mc-status-badge.locked {
          color: var(--mc-muted);
          background: rgba(255, 255, 255, 0.05);
        }

        .mc-mission-code {
          display: block;
          margin-top: 22px;
          color: var(--mc-purple-light);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .mc-mission-card h3 {
          margin: 9px 0 9px;
          font-size: 23px;
          line-height: 1.18;
        }

        .mc-mission-card > p {
          min-height: 52px;
          margin: 0;
          color: var(--mc-muted);
          line-height: 1.65;
        }

        .mc-mission-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin: 22px 0;
        }

        .mc-meta-item {
          padding: 11px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.025);
        }

        .mc-meta-item span {
          display: block;
          margin-bottom: 4px;
          color: var(--mc-muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.09em;
        }

        .mc-meta-item strong {
          font-size: 12px;
        }

        .mc-mission-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .mc-reward {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--mc-gold);
          font-size: 13px;
          font-weight: 800;
        }

        .mc-mission-button {
          min-width: 148px;
          padding: 0 15px;
          color: #0d0615;
          background: linear-gradient(120deg, #c084fc, #67e8f9);
        }

        .mc-mission-button.completed {
          color: var(--mc-green);
          border: 1px solid rgba(74, 222, 128, 0.26);
          background: rgba(74, 222, 128, 0.08);
        }

        .mc-mission-button.locked {
          cursor: not-allowed;
          color: var(--mc-muted);
          background: rgba(255, 255, 255, 0.05);
        }

        .mc-channels {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
          padding: 18px;
          border: 1px solid rgba(34, 211, 238, 0.17);
          border-radius: 20px;
          background: rgba(34, 211, 238, 0.035);
        }

        .mc-channel-link {
          min-height: 66px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: var(--mc-text);
          text-decoration: none;
          background: rgba(255, 255, 255, 0.03);
        }

        .mc-channel-copy {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .mc-channel-copy strong {
          font-size: 13px;
        }

        .mc-channel-copy span {
          color: var(--mc-muted);
          font-size: 11px;
        }

        .mc-channel-complete {
          grid-column: 1 / -1;
          justify-self: center;
          margin-top: 4px;
        }

        .mc-two-column {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
          gap: 16px;
        }

        .mc-panel {
          padding: 24px;
          border-radius: 24px;
        }

        .mc-panel-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 20px;
        }

        .mc-panel-title h3 {
          margin: 0;
          font-size: 21px;
        }

        .mc-panel-title svg {
          color: var(--mc-purple-light);
        }

        .mc-activity-list {
          display: grid;
          gap: 12px;
        }

        .mc-activity-item {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.025);
        }

        .mc-activity-marker {
          display: grid;
          flex: 0 0 auto;
          width: 29px;
          height: 29px;
          place-items: center;
          border-radius: 10px;
          color: var(--mc-muted);
          background: rgba(255, 255, 255, 0.04);
        }

        .mc-activity-marker.done {
          color: var(--mc-green);
          background: rgba(74, 222, 128, 0.08);
        }

        .mc-activity-item strong {
          display: block;
          margin-bottom: 3px;
          font-size: 14px;
        }

        .mc-activity-item p {
          margin: 0;
          color: var(--mc-muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .mc-reward-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .mc-reward-card {
          min-height: 152px;
          padding: 18px;
          border-radius: 19px;
        }

        .mc-reward-card svg {
          color: var(--mc-gold);
        }

        .mc-reward-card h4 {
          margin: 15px 0 7px;
          font-size: 16px;
        }

        .mc-reward-card p {
          margin: 0;
          color: var(--mc-muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .mc-disclaimer {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 18px;
          padding: 15px;
          border: 1px solid rgba(245, 207, 101, 0.17);
          border-radius: 16px;
          color: #d8cba4;
          background: rgba(245, 207, 101, 0.035);
          font-size: 12px;
          line-height: 1.6;
        }

        .mc-disclaimer svg {
          flex: 0 0 auto;
          color: var(--mc-gold);
        }

        .mc-final-message {
          margin-top: 34px;
          padding: 38px 24px;
          border: 1px solid rgba(168, 85, 247, 0.24);
          border-radius: 28px;
          text-align: center;
          background:
            radial-gradient(
              circle at 50% 120%,
              rgba(168, 85, 247, 0.19),
              transparent 56%
            ),
            rgba(19, 9, 30, 0.76);
        }

        .mc-final-message span {
          color: var(--mc-cyan);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.2em;
        }

        .mc-final-message h2 {
          margin: 13px 0 8px;
          font-size: clamp(30px, 5vw, 52px);
        }

        .mc-final-message p {
          margin: 0;
          color: var(--mc-muted);
        }

        @media (max-width: 960px) {
          .mc-hero,
          .mc-two-column {
            grid-template-columns: 1fr;
          }

          .mc-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .mission-control {
            padding-top: 24px;
          }

          .mc-shell {
            width: min(100% - 20px, 1180px);
          }

          .mc-hero-copy,
          .mc-commander-card {
            min-height: auto;
            border-radius: 23px;
          }

          .mc-hero-copy {
            padding: 30px 22px;
          }

          .mc-mission-grid,
          .mc-channels,
          .mc-reward-grid {
            grid-template-columns: 1fr;
          }

          .mc-mission-meta {
            grid-template-columns: 1fr;
          }

          .mc-mission-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .mc-mission-button {
            width: 100%;
          }

          .mc-channel-complete {
            grid-column: auto;
          }

          .mc-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 500px) {
          .mc-stats {
            grid-template-columns: 1fr;
          }

          .mc-hero-actions {
            flex-direction: column;
          }

          .mc-primary-button,
          .mc-secondary-button {
            width: 100%;
          }

          .mc-mission-card,
          .mc-panel {
            padding: 19px;
          }
        }
      `}</style>

      <div className="mc-shell">
        <section className="mc-hero">
          <div className="mc-hero-copy">
            <div className="mc-kicker">
              <RadioTower size={15} />
              PHASE 02 · SIGNAL ACTIVE
            </div>

            <h1>
              <span className="mc-gradient-text">MISSION CONTROL</span>
            </h1>

            <p>
              Every mission shapes the future of BOBU Universe. Complete
              missions, earn progress, unlock future opportunities and become
              an active Bobonaut.
            </p>

            <div className="mc-hero-actions">
              <button
                className="mc-primary-button"
                type="button"
                onClick={() =>
                  document
                    .getElementById("active-missions")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <Target size={17} />
                View Active Missions
              </button>

              <button
                className="mc-secondary-button"
                type="button"
                onClick={() =>
                  document
                    .getElementById("reward-center")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <Gift size={17} />
                Explore Rewards
              </button>
            </div>
          </div>

          <aside className="mc-commander-card">
            <div>
              <div className="mc-status-line">
                <span className="mc-online">
                  <span className="mc-online-dot" />
                  NETWORK ONLINE
                </span>

                <ShieldCheck size={22} />
              </div>

              <div className="mc-rank-icon">
                <Medal size={30} />
              </div>

              <h2>Cadet Bobonaut</h2>
              <p>
                Complete missions to build your profile and unlock the next
                Bobonaut rank.
              </p>
            </div>

            <div>
              <div className="mc-progress-label">
                <span>RANK PROGRESS</span>
                <strong>{progress}%</strong>
              </div>

              <div className="mc-progress-track">
                <div
                  className="mc-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </aside>
        </section>

        <section className="mc-stats" aria-label="Mission statistics">
          <article className="mc-stat-card">
            <div className="mc-stat-icon">
              <Zap size={22} />
            </div>
            <div>
              <span>TOTAL XP</span>
              <strong>{totalXp.toLocaleString()}</strong>
            </div>
          </article>

          <article className="mc-stat-card">
            <div className="mc-stat-icon">
              <Gem size={22} />
            </div>
            <div>
              <span>BOBU GEMS</span>
              <strong>{totalGems}</strong>
            </div>
          </article>

          <article className="mc-stat-card">
            <div className="mc-stat-icon">
              <Award size={22} />
            </div>
            <div>
              <span>BADGES</span>
              <strong>{completedCount > 0 ? 1 : 0}</strong>
            </div>
          </article>

          <article className="mc-stat-card">
            <div className="mc-stat-icon">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span>MISSIONS</span>
              <strong>
                {completedCount}/{totalAvailable}
              </strong>
            </div>
          </article>
        </section>

        <section className="mc-section" id="active-missions">
          <header className="mc-section-heading">
            <div>
              <h2>Active Missions</h2>
              <p>
                Start with simple actions. Future chapters will introduce
                games, seasonal challenges and verified reward campaigns.
              </p>
            </div>

            <span className="mc-section-count">
              {totalAvailable} MISSIONS AVAILABLE
            </span>
          </header>

          <div className="mc-mission-grid">
            {missions.map((mission, index) => {
              const Icon = mission.icon;
              const completed = completedMissionIds.includes(mission.id);
              const locked = mission.status === "locked";

              const displayStatus = locked
                ? "locked"
                : completed
                  ? "completed"
                  : "available";

              return (
                <motion.article
                  key={mission.id}
                  className={`mc-mission-card is-${displayStatus}`}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                >
                  <div className="mc-mission-top">
                    <div className="mc-mission-icon">
                      <Icon size={23} />
                    </div>

                    <span className={`mc-status-badge ${displayStatus}`}>
                      {locked ? (
                        <LockKeyhole size={12} />
                      ) : completed ? (
                        <Check size={12} />
                      ) : (
                        <Circle size={10} />
                      )}

                      {displayStatus.toUpperCase()}
                    </span>
                  </div>

                  <span className="mc-mission-code">
                    {mission.id} · {mission.category}
                  </span>

                  <h3>{mission.title}</h3>
                  <p>{mission.description}</p>

                  <div className="mc-mission-meta">
                    <div className="mc-meta-item">
                      <span>DIFFICULTY</span>
                      <strong>{mission.difficulty}</strong>
                    </div>

                    <div className="mc-meta-item">
                      <span>DURATION</span>
                      <strong>{mission.duration}</strong>
                    </div>

                    <div className="mc-meta-item">
                      <span>GEMS</span>
                      <strong>
                        {mission.gems > 0 ? `+${mission.gems}` : "—"}
                      </strong>
                    </div>
                  </div>

                  <footer className="mc-mission-footer">
                    <div className="mc-reward">
                      <Star size={17} />
                      {mission.reward}
                    </div>

                    <button
                      className={`mc-mission-button ${displayStatus}`}
                      type="button"
                      disabled={locked}
                      onClick={() => handleMission(mission)}
                    >
                      {locked ? (
                        <>
                          <LockKeyhole size={16} />
                          Locked
                        </>
                      ) : completed ? (
                        <>
                          <CheckCircle2 size={16} />
                          Completed
                        </>
                      ) : (
                        <>
                          {mission.action}
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </footer>

                  {mission.id === "M-002" && showChannels && (
                    <motion.div
                      className="mc-channels"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      {socialChannels.map((channel) => {
                        const ChannelIcon = channel.icon;

                        return (
                          <a
                            key={channel.name}
                            className="mc-channel-link"
                            href={channel.href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ChannelIcon size={20} />

                            <span className="mc-channel-copy">
                              <strong>{channel.name}</strong>
                              <span>{channel.handle}</span>
                            </span>

                            <ExternalLink size={14} />
                          </a>
                        );
                      })}

                      <button
                        className="mc-primary-button mc-channel-complete"
                        type="button"
                        onClick={markCommunityMissionCompleted}
                      >
                        <CheckCircle2 size={17} />
                        Mark Mission Complete
                      </button>
                    </motion.div>
                  )}
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="mc-section mc-two-column">
          <article className="mc-panel">
            <div className="mc-panel-title">
              <h3>Mission Activity</h3>
              <Clock3 size={21} />
            </div>

            <div className="mc-activity-list">
              {activity.map((item, index) => {
                const dynamicallyCompleted =
                  index < 2 || completedCount >= index - 1;

                return (
                  <div className="mc-activity-item" key={item.title}>
                    <div
                      className={`mc-activity-marker ${
                        dynamicallyCompleted ? "done" : ""
                      }`}
                    >
                      {dynamicallyCompleted ? (
                        <Check size={16} />
                      ) : (
                        <Circle size={13} />
                      )}
                    </div>

                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="mc-panel" id="reward-center">
            <div className="mc-panel-title">
              <h3>Reward Center</h3>
              <Gift size={21} />
            </div>

            <div className="mc-reward-grid">
              {rewards.map((reward) => {
                const RewardIcon = reward.icon;

                return (
                  <div className="mc-reward-card" key={reward.title}>
                    <RewardIcon size={23} />
                    <h4>{reward.title}</h4>
                    <p>{reward.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="mc-disclaimer">
              <ShieldCheck size={19} />

              <span>
                Mission completion creates progress or campaign eligibility. It
                does not guarantee a financial reward unless official campaign
                rules explicitly state otherwise.
              </span>
            </div>
          </article>
        </section>

        <section className="mc-final-message">
          <span>THE SIGNAL IS LIVE</span>
          <h2>We Are Building Space.</h2>
          <p>
            Complete missions. Support the community. Help expand BOBU
            Universe.
          </p>
        </section>
      </div>
    </motion.main>
  );
}