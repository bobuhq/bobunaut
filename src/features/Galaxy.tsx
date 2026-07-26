import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Orbit,
  Rocket,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { Title } from "../shared/Title";
import { useBuilderStore } from "./identity/hooks/useBuilderStore";
import {
  galaxyService,
  type GalaxyMember as RealGalaxyMember,
} from "../core/builder/services/GalaxyService";
import {
  getPrimaryBranchTheme,
  galaxyThemes,
} from "./galaxy/galaxyThemes";

type GalaxyMember = {
  name: string;
  level: number;
  angle: number;
  builders: number;
  xp: number;
  parent: string;
  status: "pending" | "active";
  theme: ReturnType<typeof getPrimaryBranchTheme>;
};



const createGalaxyStats = (
  memberCount: number,
  activeCount: number,
  pendingCount: number,
  gp: number,
) => [
  {
    label: "Galaxy Members",
    value: memberCount.toLocaleString(),
    detail: `${activeCount} active · ${pendingCount} pending`,
    icon: Users,
  },
  {
    label: "Builder GP",
    value: gp.toLocaleString(),
    detail: "Current Builder balance",
    icon: Zap,
  },
  {
    label: "Active Builders",
    value: activeCount.toLocaleString(),
    detail: "Verified Galaxy connections",
    icon: Orbit,
  },
  {
    label: "Pending Builders",
    value: pendingCount.toLocaleString(),
    detail: "Awaiting activation",
    icon: Sparkles,
  },
] as const;

export function Galaxy() {
  const builder = useBuilderStore();
  const [galaxyMembers, setGalaxyMembers] = useState<RealGalaxyMember[]>([]);
  const [isGalaxyLoading, setIsGalaxyLoading] = useState(true);
  const [galaxyError, setGalaxyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GalaxyMember | null>(
    null,
  );
  const [activeGalaxy, setActiveGalaxy] = useState("Genesis");

  useEffect(() => {
    let isMounted = true;

    const loadGalaxy = async () => {
      setIsGalaxyLoading(true);
      setGalaxyError(null);

      try {
        const members = await galaxyService.loadMyGalaxy();

        if (isMounted) {
          setGalaxyMembers(members);
        }
      } catch (error) {
        console.error("Galaxy data could not be loaded", error);

        if (isMounted) {
          setGalaxyMembers([]);
          setGalaxyError("Galaxy data could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsGalaxyLoading(false);
        }
      }
    };

    void loadGalaxy();

    return () => {
      isMounted = false;
    };
  }, [builder.id]);

  const referralLink =
    builder.inviteCode && builder.inviteCode !== "BOBU-GENESIS"
      ? new URL(
          `join/${encodeURIComponent(builder.inviteCode)}`,
          window.location.origin + import.meta.env.BASE_URL,
        ).toString()
      : null;

  const activeMemberCount = galaxyMembers.filter(
    (member) => member.referralStatus === "active",
  ).length;

  const pendingMemberCount = galaxyMembers.filter(
    (member) => member.referralStatus === "pending",
  ).length;

  const stats = createGalaxyStats(
    galaxyMembers.length,
    activeMemberCount,
    pendingMemberCount,
    builder.gp,
  );

  const visibleMembers = useMemo<GalaxyMember[]>(() => {
    if (activeGalaxy !== "Genesis") {
      return [];
    }

    return galaxyMembers.map((member, index) => ({
      name:
        member.displayName ??
        member.username ??
        `Builder ${member.builderId.slice(0, 6)}`,
      level: 1,
      angle:
        galaxyMembers.length > 0
          ? (360 / galaxyMembers.length) * index
          : 0,
      builders: member.referralCount,
      xp: member.gp,
      parent: "Genesis",
      status: member.referralStatus,
      theme: getPrimaryBranchTheme(index),
    }));
  }, [activeGalaxy, galaxyMembers]);

  const currentGalaxyOwner: GalaxyMember | null = null;

  const galaxyTitle =
    activeGalaxy === "Genesis"
      ? "Genesis Builder Galaxy"
      : `${activeGalaxy} Galaxy`;

  const copyReferralLink = async () => {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  const exploreGalaxy = () => {
    if (!selectedMember) {
      return;
    }

    setActiveGalaxy(selectedMember.name);
    setSelectedMember(null);
  };

  const returnToMyGalaxy = () => {
    setActiveGalaxy("Genesis");
    setSelectedMember(null);
  };

  return (
    <motion.div
      className="my-galaxy-page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
    >
      <style>{`
        .my-galaxy-page {
          width: min(1240px, calc(100% - 32px));
          margin: 0 auto;
          padding: 130px 0 80px;
        }

        .galaxy-dashboard-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.75fr);
          gap: 22px;
          margin-top: 28px;
        }

        .galaxy-panel {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(151, 118, 255, 0.2);
          border-radius: 28px;
          background:
            linear-gradient(
              145deg,
              rgba(18, 14, 48, 0.84),
              rgba(6, 12, 30, 0.9)
            );
          box-shadow:
            0 28px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.045);
          backdrop-filter: blur(24px);
        }

        .galaxy-visual {
          min-height: 620px;
          padding: 28px;
        }

        .galaxy-visual::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 50% 50%,
              rgba(126, 83, 255, 0.16),
              transparent 27%
            ),
            radial-gradient(
              circle at 15% 18%,
              rgba(56, 209, 255, 0.09),
              transparent 24%
            ),
            radial-gradient(
              circle at 85% 82%,
              rgba(255, 80, 207, 0.08),
              transparent 23%
            );
        }

        .galaxy-panel-heading {
          position: relative;
          z-index: 5;
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        .galaxy-panel-heading h2 {
          margin: 6px 0 0;
          color: #fff;
          font-size: clamp(1.25rem, 2vw, 1.75rem);
        }

        .galaxy-eyebrow {
          color: #81e8ff;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .galaxy-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(91, 255, 181, 0.22);
          border-radius: 999px;
          color: #7dffc2;
          background: rgba(33, 152, 103, 0.1);
          font-size: 0.72rem;
          font-weight: 800;
        }

        .galaxy-status::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 12px currentColor;
        }

        .galaxy-canvas {
          position: relative;
          width: min(530px, 92%);
          aspect-ratio: 1;
          margin: 18px auto 0;
        }

        .orbit-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 1px solid rgba(133, 181, 255, 0.16);
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .orbit-ring.one {
          width: 42%;
          height: 42%;
        }

        .orbit-ring.two {
          width: 68%;
          height: 68%;
        }

        .orbit-ring.three {
          width: 94%;
          height: 94%;
        }

        .galaxy-core {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 10;
          display: grid;
          width: 112px;
          height: 112px;
          place-items: center;
          border: 1px solid rgba(134, 229, 255, 0.7);
          border-radius: 50%;
          color: white;
          text-align: center;
          cursor: pointer;
          transform: translate(-50%, -50%);
          background:
            radial-gradient(
              circle at 35% 28%,
              #a56cff,
              #4b2eb8 48%,
              #100d31 75%
            );
          box-shadow:
            0 0 0 10px rgba(113, 73, 255, 0.08),
            0 0 46px rgba(113, 73, 255, 0.72),
            0 0 95px rgba(71, 203, 255, 0.2);
        }

        .galaxy-core strong {
          display: block;
          font-size: 0.9rem;
        }

        .galaxy-core span {
          display: block;
          margin-top: 2px;
          color: #d9c9ff;
          font-size: 0.58rem;
        }

        .member-node {
          --distance: 110px;
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 6;
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border: 1px solid var(--node-ring);
          border-radius: 50%;
          color: var(--node-text);
          cursor: pointer;
          transform:
            translate(-50%, -50%)
            rotate(var(--angle))
            translateX(var(--distance))
            rotate(calc(var(--angle) * -1));
          background: var(--node-gradient);
          box-shadow:
            0 0 16px color-mix(
              in srgb,
              var(--node-glow) 58%,
              transparent
            ),
            0 0 34px color-mix(
              in srgb,
              var(--node-glow) 24%,
              transparent
            );
          transition:
            filter 180ms ease,
            box-shadow 180ms ease,
            border-color 180ms ease;
        }

        .member-node:hover {
          filter: brightness(1.45);
        }

        .member-node.selected {
          border-color: rgba(255, 255, 255, 0.95);
          filter: brightness(1.55);
          box-shadow:
            0 0 0 5px rgba(111, 95, 255, 0.14),
            0 0 22px rgba(103, 211, 255, 0.78),
            0 0 42px rgba(130, 83, 255, 0.48);
        }

        .member-node.level-1 {
          --distance: 110px;
          width: 46px;
          height: 46px;
        }

        .member-node.level-2 {
          --distance: 180px;
          width: 38px;
          height: 38px;
        }

        .member-node.level-3 {
          --distance: 248px;
          width: 30px;
          height: 30px;
          opacity: 0.8;
        }

        .member-node span {
          position: absolute;
          top: calc(100% + 7px);
          left: 50%;
          width: max-content;
          color: rgba(235, 238, 255, 0.72);
          font-size: 0.62rem;
          transform: translateX(-50%);
        }

        .empty-orbit {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 220px;
          color: rgba(220, 225, 255, 0.54);
          text-align: center;
          font-size: 0.76rem;
          line-height: 1.5;
          transform: translate(-50%, 90px);
        }

        .galaxy-side {
          display: grid;
          align-content: start;
          gap: 18px;
        }

        .profile-card,
        .referral-card,
        .progress-card {
          padding: 22px;
        }

        .profile-card h3,
        .referral-card h3,
        .progress-card h3 {
          margin: 0;
          color: white;
        }

        .profile-card p,
        .referral-card p,
        .progress-card p {
          color: rgba(222, 226, 255, 0.62);
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .rank-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 16px;
          padding: 9px 12px;
          border-radius: 12px;
          color: #ffdb7d;
          background: rgba(133, 92, 20, 0.14);
          font-size: 0.75rem;
          font-weight: 800;
        }

        .member-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .member-meta div {
          padding: 12px;
          border: 1px solid rgba(135, 160, 255, 0.12);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
        }

        .member-meta span {
          display: block;
          color: rgba(222, 226, 255, 0.52);
          font-size: 0.66rem;
        }

        .member-meta strong {
          display: block;
          margin-top: 4px;
          color: white;
          font-size: 1rem;
        }

        .explore-button,
        .reset-selection {
          width: 100%;
          margin-top: 14px;
          padding: 11px 14px;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .explore-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(96, 218, 255, 0.34);
          color: #d9f7ff;
          background:
            linear-gradient(
              110deg,
              rgba(109, 72, 255, 0.28),
              rgba(47, 170, 214, 0.2)
            );
        }

        .reset-selection {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(235, 238, 255, 0.7);
          background: rgba(255, 255, 255, 0.04);
        }

        .progress-track {
          height: 9px;
          margin-top: 14px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
        }

        .progress-fill {
          width: 74%;
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #7356ff,
              #4fc4ff,
              #70ffd0
            );
        }

        .referral-box {
          display: flex;
          gap: 9px;
          margin-top: 16px;
          padding: 8px;
          border: 1px solid rgba(137, 160, 255, 0.18);
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.18);
        }

        .referral-box code {
          min-width: 0;
          overflow: hidden;
          flex: 1;
          color: #c9d8ff;
          font-size: 0.68rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .copy-button {
          display: inline-grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border: 1px solid rgba(98, 220, 255, 0.25);
          border-radius: 11px;
          color: #aeeeff;
          cursor: pointer;
          background: rgba(66, 151, 191, 0.12);
        }

        .galaxy-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-top: 22px;
        }

        .galaxy-stat {
          min-height: 150px;
          padding: 20px;
        }

        .galaxy-stat-icon {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border-radius: 12px;
          color: #87e3ff;
          background: rgba(65, 154, 206, 0.1);
        }

        .galaxy-stat strong {
          display: block;
          margin-top: 18px;
          color: white;
          font-size: 1.8rem;
        }

        .galaxy-stat h3 {
          margin: 5px 0 0;
          color: rgba(235, 238, 255, 0.84);
          font-size: 0.79rem;
        }

        .galaxy-stat p {
          color: rgba(223, 229, 255, 0.48);
          font-size: 0.68rem;
        }

        @media (max-width: 980px) {
          .galaxy-dashboard-grid {
            grid-template-columns: 1fr;
          }

          .galaxy-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 720px) {
          .my-galaxy-page {
            width: min(100% - 20px, 1240px);
            padding-top: 112px;
          }

          .galaxy-visual {
            min-height: 500px;
          }

          .galaxy-core {
            width: 88px;
            height: 88px;
          }

          .member-node.level-1,
          .member-node.level-2,
          .member-node.level-3 {
            --distance: 138px;
          }

          .member-node span {
            display: none;
          }

          .galaxy-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <Title
        k="MY GALAXY"
        t="Build a universe that grows with you."
        p="Every Builder you invite becomes part of your expanding BOBU Galaxy."
      />

      <section className="galaxy-dashboard-grid">
        <div className="galaxy-panel galaxy-visual">
          <div className="galaxy-panel-heading">
            <div>
              <span className="galaxy-eyebrow">
                {activeGalaxy === "Genesis"
                  ? "Personal network"
                  : "Exploring galaxy"}
              </span>

              <h2>{galaxyTitle}</h2>
            </div>

            <span className="galaxy-status">Galaxy Online</span>
          </div>

          <div className="galaxy-canvas">
            <div className="orbit-ring one" />
            <div className="orbit-ring two" />
            <div className="orbit-ring three" />

            <motion.div
              className="galaxy-core"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              onClick={() => setSelectedMember(null)}
            >
              <div>
                <Crown size={24} />
                <strong>
                  {activeGalaxy === "Genesis" ? "YOU" : activeGalaxy}
                </strong>
                <span>GALAXY CORE</span>
              </div>
            </motion.div>

            {visibleMembers.map((member, index) => (
              <motion.div
                className={`member-node level-${member.level} ${
                  selectedMember?.name === member.name ? "selected" : ""
                }`}
                style={
                  {
                    "--angle": `${member.angle}deg`,
                    "--distance": `${115 + (index % 3) * 58}px`,
                    "--node-gradient": member.theme.nodeGradient,
                    "--node-glow": member.theme.glowColor,
                    "--node-ring": member.theme.ringColor,
                    "--node-text": member.theme.textAccent,
                    opacity:
                      member.status === "active"
                        ? 1
                        : 0.48,
                  } as React.CSSProperties
                }
                key={`${activeGalaxy}-${member.name}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: 0.12 + index * 0.08,
                  duration: 0.45,
                }}
                whileHover={{
                  filter: "brightness(1.45)",
                  zIndex: 20,
                }}
                onClick={() => setSelectedMember(member)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setSelectedMember(member);
                  }
                }}
              >
                <Star size={member.level >= 3 ? 10 : 14} />
                <span>{member.name}</span>
              </motion.div>
            ))}

            {visibleMembers.length === 0 && (
              <div className="empty-orbit">
                This Builder has not created any new stars yet.
              </div>
            )}
          </div>
        </div>

        <aside className="galaxy-side">
          <section className="galaxy-panel profile-card">
            <h3>
              {selectedMember
                ? selectedMember.name
                : builder.username || "Genesis Builder"}
            </h3>

            <p>
              {selectedMember
                ? `Level ${selectedMember.level} Builder`
                : activeGalaxy === "Genesis"
                  ? "Founding Builder"
                  : "Galaxy Commander"}
            </p>

            <div className="rank-badge">
              <Sparkles size={15} />
              {selectedMember
                ? `Orbit Level ${selectedMember.level}`
                : activeGalaxy === "Genesis"
                  ? "Nebula Builder · Rank 07"
                  : `${visibleMembers.length} Connected Stars`}
            </div>

            {selectedMember && (
              <>
                <div className="member-meta">
                  <div>
                    <span>Builders</span>
                    <strong>{selectedMember.builders}</strong>
                  </div>

                  <div>
                    <span>Builder XP</span>
                    <strong>{selectedMember.xp}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="explore-button"
                  onClick={exploreGalaxy}
                >
                  <Rocket size={16} />
                  Explore {selectedMember.name} Galaxy
                </button>
              </>
            )}

            {activeGalaxy !== "Genesis" && (
              <button
                type="button"
                className="reset-selection"
                onClick={returnToMyGalaxy}
              >
                <ArrowLeft size={16} />
                Return to My Galaxy
              </button>
            )}
          </section>

          <section className="galaxy-panel progress-card">
            <h3>Next Galaxy Level</h3>

            <p>
              Expand your network and complete missions to unlock the Supernova
              rank.
            </p>

            <div className="progress-track">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: "74%" }}
                transition={{ duration: 1.1 }}
              />
            </div>
          </section>

          <section className="galaxy-panel referral-card">
            <h3>Invite New Builders</h3>

            <p>
              Share your portal link. Every verified Builder becomes a new star
              in your galaxy.
            </p>

            <div className="referral-box">
              <code>{referralLink}</code>

              <button
                className="copy-button"
                type="button"
                onClick={copyReferralLink}
                aria-label="Copy referral link"
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </button>
            </div>
          </section>
        </aside>
      </section>

      <section className="galaxy-stats">
        {stats.map(({ label, value, detail, icon: Icon }) => (
          <motion.article
            className="galaxy-panel galaxy-stat"
            key={label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="galaxy-stat-icon">
              <Icon size={19} />
            </div>

            <strong>{value}</strong>
            <h3>{label}</h3>
            <p>{detail}</p>
          </motion.article>
        ))}
      </section>
    </motion.div>
  );
}
