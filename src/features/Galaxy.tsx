import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Crown,
  Sparkles,
  Star,
} from "lucide-react";
import { useBuilderStore } from "./identity/hooks/useBuilderStore";
import {
  galaxyService,
  type GalaxyMember as RealGalaxyMember,
} from "../core/builder/services/GalaxyService";
import { getPrimaryBranchTheme } from "./galaxy/galaxyThemes";

type GalaxyMember = {
  builderId: string;
  name: string;
  builders: number;
  gp: number;
  status: "pending" | "active";
  theme: ReturnType<typeof getPrimaryBranchTheme>;
};

export function Galaxy() {
  const builder = useBuilderStore();

  const [galaxyMembers, setGalaxyMembers] = useState<
    RealGalaxyMember[]
  >([]);
  const [isGalaxyLoading, setIsGalaxyLoading] =
    useState(true);
  const [galaxyError, setGalaxyError] = useState<
    string | null
  >(null);
  const [selectedMemberId, setSelectedMemberId] =
    useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        console.error(
          "Galaxy data could not be loaded",
          error,
        );

        if (isMounted) {
          setGalaxyMembers([]);
          setGalaxyError(
            "Galaxy data could not be loaded.",
          );
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
    builder.inviteCode &&
    builder.inviteCode !== "BOBU-GENESIS"
      ? new URL(
          `join/${encodeURIComponent(
            builder.inviteCode,
          )}`,
          window.location.origin +
            import.meta.env.BASE_URL,
        ).toString()
      : null;

  const activeMemberCount = galaxyMembers.filter(
    (member) =>
      member.referralStatus === "active",
  ).length;

  const pendingMemberCount = galaxyMembers.filter(
    (member) =>
      member.referralStatus === "pending",
  ).length;

  const galaxyLevelTarget = 10;

  const remainingActiveBuilders = Math.max(
    0,
    galaxyLevelTarget - activeMemberCount,
  );

  const visibleMembers = useMemo<GalaxyMember[]>(
    () =>
      galaxyMembers.map((member, index) => ({
        builderId: member.builderId,
        name:
          member.displayName ??
          member.username ??
          `Builder ${member.builderId.slice(0, 6)}`,
        builders: member.referralCount,
        gp: member.gp,
        status: member.referralStatus,
        theme: getPrimaryBranchTheme(index),
      })),
    [galaxyMembers],
  );

  const copyReferralLink = async () => {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        referralLink,
      );
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
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
          width: min(1440px, calc(100% - 28px));
          margin: 0 auto;
          padding: 112px 0 60px;
          color: white;
        }

        .galaxy-shell {
          display: grid;
          grid-template-columns:
            250px minmax(0, 1fr);
          min-height: 760px;
          overflow: hidden;
          border:
            1px solid rgba(132, 108, 255, 0.24);
          border-radius: 26px;
          background:
            radial-gradient(
              circle at 65% 22%,
              rgba(72, 87, 255, 0.12),
              transparent 32%
            ),
            linear-gradient(
              145deg,
              rgba(12, 14, 39, 0.97),
              rgba(5, 9, 25, 0.98)
            );
          box-shadow:
            0 34px 100px rgba(0, 0, 0, 0.46),
            inset 0 1px
              rgba(255, 255, 255, 0.04);
        }

        .galaxy-sidebar {
          display: flex;
          flex-direction: column;
          padding: 26px 20px;
          border-right:
            1px solid rgba(133, 145, 222, 0.12);
          background:
            linear-gradient(
              180deg,
              rgba(24, 22, 62, 0.7),
              rgba(8, 11, 31, 0.72)
            );
        }

        .galaxy-profile {
          padding-bottom: 22px;
          border-bottom:
            1px solid rgba(133, 145, 222, 0.12);
          text-align: center;
        }

        .galaxy-avatar {
          display: grid;
          width: 72px;
          height: 72px;
          margin: 0 auto 13px;
          place-items: center;
          border:
            1px solid rgba(255, 218, 114, 0.72);
          border-radius: 22px;
          color: #ffe598;
          background:
            radial-gradient(
              circle at 35% 25%,
              rgba(255, 229, 129, 0.95),
              rgba(150, 84, 250, 0.92) 48%,
              rgba(38, 21, 91, 0.98)
            );
          box-shadow:
            0 0 24px rgba(255, 193, 77, 0.3),
            0 0 44px rgba(128, 91, 255, 0.28);
        }

        .galaxy-profile h2 {
          margin: 0;
          overflow: hidden;
          font-size: 0.94rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-profile p {
          margin: 5px 0 0;
          color: rgba(218, 224, 255, 0.48);
          font-size: 0.64rem;
        }

        .galaxy-rank {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          padding: 7px 10px;
          border:
            1px solid rgba(255, 210, 101, 0.18);
          border-radius: 999px;
          color: #ffdf85;
          background: rgba(170, 108, 26, 0.12);
          font-size: 0.64rem;
          font-weight: 800;
        }

        .galaxy-side-stats {
          display: grid;
          gap: 9px;
          margin-top: 20px;
        }

        .galaxy-side-stat {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 12px;
          border:
            1px solid rgba(129, 145, 225, 0.1);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
        }

        .galaxy-side-stat span {
          color: rgba(218, 224, 255, 0.5);
          font-size: 0.64rem;
        }

        .galaxy-side-stat strong {
          max-width: 130px;
          overflow: hidden;
          font-size: 0.76rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-invite {
          margin-top: auto;
          padding-top: 20px;
        }

        .galaxy-invite h3 {
          margin: 0 0 6px;
          font-size: 0.8rem;
        }

        .galaxy-invite p {
          margin: 0;
          color: rgba(218, 224, 255, 0.48);
          font-size: 0.63rem;
          line-height: 1.45;
        }

        .galaxy-referral-box {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
          padding: 7px;
          border:
            1px solid rgba(108, 201, 255, 0.16);
          border-radius: 11px;
          background: rgba(0, 0, 0, 0.2);
        }

        .galaxy-referral-box code {
          min-width: 0;
          overflow: hidden;
          flex: 1;
          color: #b9d9ff;
          font-size: 0.57rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-copy {
          display: grid;
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
          place-items: center;
          border:
            1px solid rgba(97, 213, 255, 0.23);
          border-radius: 9px;
          color: #9be8ff;
          cursor: pointer;
          background: rgba(54, 151, 194, 0.11);
        }

        .galaxy-copy:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        .galaxy-main {
          min-width: 0;
          padding: 22px;
        }

        .galaxy-topbar {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          overflow: hidden;
          border:
            1px solid rgba(135, 145, 220, 0.12);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.025);
        }

        .galaxy-top-stat {
          min-width: 0;
          padding: 16px 18px;
          border-right:
            1px solid rgba(135, 145, 220, 0.1);
        }

        .galaxy-top-stat:last-child {
          border-right: 0;
        }

        .galaxy-top-stat span {
          display: block;
          color: rgba(217, 223, 255, 0.48);
          font-size: 0.61rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .galaxy-top-stat strong {
          display: block;
          margin-top: 7px;
          font-size: 1.12rem;
        }

        .galaxy-network {
          position: relative;
          min-height: 500px;
          margin-top: 18px;
          padding: 22px 18px 26px;
          overflow: auto;
          border:
            1px solid rgba(135, 145, 220, 0.12);
          border-radius: 20px;
          background:
            radial-gradient(
              circle at 50% 24%,
              rgba(113, 79, 255, 0.13),
              transparent 29%
            ),
            linear-gradient(
              rgba(255, 255, 255, 0.018),
              rgba(255, 255, 255, 0.008)
            );
        }

        .galaxy-network-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .galaxy-network-heading h1 {
          margin: 0;
          font-size: clamp(1rem, 2vw, 1.35rem);
        }

        .galaxy-network-heading p {
          margin: 5px 0 0;
          color: rgba(217, 223, 255, 0.48);
          font-size: 0.66rem;
        }

        .galaxy-online {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #78ffc0;
          font-size: 0.64rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .galaxy-online::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 10px currentColor;
        }

        .galaxy-tree {
          display: flex;
          min-width: 650px;
          flex-direction: column;
          align-items: center;
          padding: 34px 8px 8px;
        }

        .galaxy-root-card {
          display: grid;
          width: 190px;
          min-height: 108px;
          place-items: center;
          border:
            1px solid rgba(255, 220, 120, 0.66);
          border-radius: 18px;
          text-align: center;
          cursor: pointer;
          background:
            radial-gradient(
              circle at 35% 20%,
              rgba(255, 235, 158, 0.98),
              rgba(238, 157, 55, 0.88) 22%,
              rgba(121, 70, 230, 0.94) 58%,
              rgba(38, 21, 91, 0.98)
            );
          box-shadow:
            0 0 26px rgba(255, 193, 77, 0.34),
            0 0 50px rgba(128, 91, 255, 0.3);
        }

        .galaxy-root-card strong {
          display: block;
          max-width: 165px;
          margin-top: 5px;
          overflow: hidden;
          font-size: 0.82rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-root-card span {
          display: block;
          margin-top: 3px;
          color: #e8ddff;
          font-size: 0.55rem;
          letter-spacing: 0.11em;
        }

        .galaxy-tree-trunk {
          width: 1px;
          height: 52px;
          background:
            linear-gradient(
              rgba(255, 198, 77, 0.72),
              rgba(109, 90, 255, 0.62)
            );
          box-shadow:
            0 0 10px rgba(118, 88, 255, 0.58);
        }

        .galaxy-member-grid {
          position: relative;
          display: grid;
          width: 100%;
          grid-template-columns:
            repeat(auto-fit, minmax(145px, 1fr));
          gap: 42px 18px;
          padding: 30px 0 0;
        }

        .galaxy-member-grid::before {
          content: "";
          position: absolute;
          top: 0;
          left: 8%;
          width: 84%;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(101, 205, 255, 0.62) 12%,
              rgba(138, 101, 255, 0.72) 50%,
              rgba(101, 205, 255, 0.62) 88%,
              transparent
            );
          box-shadow:
            0 0 10px rgba(101, 205, 255, 0.34);
        }

        .galaxy-member-branch {
          position: relative;
          display: flex;
          justify-content: center;
        }

        .galaxy-member-branch::before {
          content: "";
          position: absolute;
          top: -30px;
          left: 50%;
          width: 1px;
          height: 30px;
          background: var(--branch-color);
          box-shadow: 0 0 9px var(--branch-color);
        }

        .galaxy-member-card {
          width: min(100%, 168px);
          min-height: 112px;
          padding: 14px 12px;
          border: 1px solid var(--node-ring);
          border-radius: 15px;
          text-align: center;
          cursor: pointer;
          background:
            radial-gradient(
              circle at 50% 0%,
              color-mix(
                in srgb,
                var(--node-glow) 22%,
                transparent
              ),
              transparent 58%
            ),
            linear-gradient(
              145deg,
              color-mix(
                in srgb,
                var(--node-glow) 10%,
                rgba(25, 27, 62, 0.97)
              ),
              rgba(10, 13, 36, 0.98)
            );
          box-shadow:
            0 0 20px
              color-mix(
                in srgb,
                var(--node-glow) 26%,
                transparent
              ),
            inset 0 1px
              rgba(255, 255, 255, 0.04);
          transition:
            transform 180ms ease,
            filter 180ms ease;
        }

        .galaxy-member-card:hover {
          filter: brightness(1.16);
          transform: translateY(-3px);
        }

        .galaxy-member-card.selected {
          border-color: rgba(255, 255, 255, 0.92);
          box-shadow:
            0 0 0 4px
              rgba(116, 91, 255, 0.1),
            0 0 26px var(--node-glow);
        }

        .galaxy-member-icon {
          display: grid;
          width: 34px;
          height: 34px;
          margin: 0 auto 8px;
          place-items: center;
          border: 1px solid var(--node-ring);
          border-radius: 11px;
          color: var(--node-text);
          background: var(--node-gradient);
          box-shadow: 0 0 15px var(--node-glow);
        }

        .galaxy-member-card strong {
          display: block;
          overflow: hidden;
          font-size: 0.7rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-member-meta {
          margin-top: 6px;
          color: rgba(220, 226, 255, 0.48);
          font-size: 0.55rem;
        }

        .galaxy-member-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          color: #70ffc0;
          font-size: 0.52rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .galaxy-member-status::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 7px currentColor;
        }

        .galaxy-member-status.pending {
          color: #ffc76d;
        }

        .galaxy-empty {
          margin-top: 28px;
          padding: 20px;
          border:
            1px dashed rgba(131, 143, 209, 0.18);
          border-radius: 14px;
          color: rgba(220, 225, 255, 0.5);
          text-align: center;
          font-size: 0.67rem;
        }

        .galaxy-footer-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 16px;
          margin-top: 18px;
        }

        .galaxy-footer-card {
          padding: 17px;
          border:
            1px solid rgba(135, 145, 220, 0.12);
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.025);
        }

        .galaxy-footer-card h3 {
          margin: 0;
          font-size: 0.76rem;
        }

        .galaxy-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 13px;
        }

        .galaxy-legend span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: rgba(220, 226, 255, 0.54);
          font-size: 0.61rem;
        }

        .galaxy-legend i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 8px currentColor;
        }

        .galaxy-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 13px;
        }

        .galaxy-summary div {
          padding: 10px;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.025);
        }

        .galaxy-summary span {
          display: block;
          color: rgba(220, 226, 255, 0.46);
          font-size: 0.55rem;
        }

        .galaxy-summary strong {
          display: block;
          margin-top: 5px;
          font-size: 0.75rem;
        }

        @media (max-width: 980px) {
          .galaxy-shell {
            grid-template-columns: 1fr;
          }

          .galaxy-sidebar {
            border-right: 0;
            border-bottom:
              1px solid rgba(133, 145, 222, 0.12);
          }

          .galaxy-side-stats {
            grid-template-columns: repeat(3, 1fr);
          }

          .galaxy-invite {
            margin-top: 18px;
          }
        }

        @media (max-width: 720px) {
          .my-galaxy-page {
            width: min(100% - 16px, 1440px);
            padding-top: 104px;
          }

          .galaxy-main {
            padding: 13px;
          }

          .galaxy-topbar {
            grid-template-columns: repeat(2, 1fr);
          }

          .galaxy-top-stat:nth-child(2) {
            border-right: 0;
          }

          .galaxy-top-stat:nth-child(-n + 2) {
            border-bottom:
              1px solid rgba(135, 145, 220, 0.1);
          }

          .galaxy-network-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .galaxy-footer-grid {
            grid-template-columns: 1fr;
          }

          .galaxy-summary {
            grid-template-columns: 1fr;
          }

          .galaxy-side-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="galaxy-shell">
        <aside className="galaxy-sidebar">
          <div className="galaxy-profile">
            <div className="galaxy-avatar">
              <Crown size={28} />
            </div>

            <h2>
              {builder.username || "Genesis Builder"}
            </h2>

            <p>
              BOBU Builder · Level {builder.level}
            </p>

            <div className="galaxy-rank">
              <Sparkles size={13} />
              Nebula Rank {builder.level}
            </div>
          </div>

          <div className="galaxy-side-stats">
            <div className="galaxy-side-stat">
              <span>Builder GP</span>
              <strong>
                {builder.gp.toLocaleString("tr-TR")}
              </strong>
            </div>

            <div className="galaxy-side-stat">
              <span>Invite Code</span>
              <strong>
                {builder.inviteCode || "—"}
              </strong>
            </div>

            <div className="galaxy-side-stat">
              <span>Active Circle</span>
              <strong>{activeMemberCount}</strong>
            </div>
          </div>

          <div className="galaxy-invite">
            <h3>Invite New Builders</h3>

            <p>
              Share your portal link. Every verified
              Builder becomes a new branch in your
              Galaxy.
            </p>

            <div className="galaxy-referral-box">
              <code>
                {referralLink ||
                  "Referral link unavailable"}
              </code>

              <button
                type="button"
                className="galaxy-copy"
                onClick={copyReferralLink}
                disabled={!referralLink}
                aria-label="Copy referral link"
              >
                {copied ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}
              </button>
            </div>
          </div>
        </aside>

        <main className="galaxy-main">
          <section className="galaxy-topbar">
            <div className="galaxy-top-stat">
              <span>Total Builders</span>
              <strong>{galaxyMembers.length}</strong>
            </div>

            <div className="galaxy-top-stat">
              <span>Active Now</span>
              <strong>{activeMemberCount}</strong>
            </div>

            <div className="galaxy-top-stat">
              <span>Total GP</span>
              <strong>
                {builder.gp.toLocaleString("tr-TR")}
              </strong>
            </div>

            <div className="galaxy-top-stat">
              <span>Galaxy Rank</span>
              <strong>#{builder.level}</strong>
            </div>
          </section>

          <section className="galaxy-network">
            <div className="galaxy-network-heading">
              <div>
                <h1>Galaxy Network</h1>
                <p>
                  Your complete Builder referral universe.
                </p>
              </div>

              <span className="galaxy-online">
                Galaxy Online
              </span>
            </div>

            <div className="galaxy-tree">
              <motion.div
                className="galaxy-root-card"
                animate={{ y: [0, -3, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                onClick={() =>
                  setSelectedMemberId(null)
                }
              >
                <div>
                  <Crown size={25} />

                  <strong>
                    {builder.username || "KING BOBU"}
                  </strong>

                  <span>YOU · NEBULA CORE</span>
                </div>
              </motion.div>

              <div className="galaxy-tree-trunk" />

              {isGalaxyLoading ? (
                <div className="galaxy-empty">
                  Loading Galaxy network…
                </div>
              ) : galaxyError ? (
                <div className="galaxy-empty">
                  {galaxyError}
                </div>
              ) : visibleMembers.length > 0 ? (
                <div className="galaxy-member-grid">
                  {visibleMembers.map(
                    (member, index) => (
                      <motion.div
                        className="galaxy-member-branch"
                        key={member.builderId}
                        style={
                          {
                            "--branch-color":
                              member.theme.lineColor,
                          } as CSSProperties
                        }
                        initial={{
                          opacity: 0,
                          y: 14,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay:
                            0.06 + index * 0.06,
                          duration: 0.38,
                        }}
                      >
                        <article
                          className={`galaxy-member-card ${
                            selectedMemberId ===
                            member.builderId
                              ? "selected"
                              : ""
                          }`}
                          style={
                            {
                              "--node-gradient":
                                member.theme
                                  .nodeGradient,
                              "--node-glow":
                                member.theme.glowColor,
                              "--node-ring":
                                member.theme.ringColor,
                              "--node-text":
                                member.theme.textAccent,
                              opacity:
                                member.status ===
                                "active"
                                  ? 1
                                  : 0.66,
                            } as CSSProperties
                          }
                          onClick={() =>
                            setSelectedMemberId(
                              member.builderId,
                            )
                          }
                        >
                          <div className="galaxy-member-icon">
                            <Star size={14} />
                          </div>

                          <strong>
                            {member.name}
                          </strong>

                          <div className="galaxy-member-meta">
                            {member.gp.toLocaleString(
                              "tr-TR",
                            )}{" "}
                            GP · {member.builders} Builders
                          </div>

                          <span
                            className={`galaxy-member-status ${
                              member.status ===
                              "active"
                                ? ""
                                : "pending"
                            }`}
                          >
                            {member.status === "active"
                              ? "Active"
                              : "Pending"}
                          </span>
                        </article>
                      </motion.div>
                    ),
                  )}
                </div>
              ) : (
                <div className="galaxy-empty">
                  You have not invited any Builders yet.
                </div>
              )}
            </div>
          </section>

          <section className="galaxy-footer-grid">
            <article className="galaxy-footer-card">
              <h3>Network Status</h3>

              <div className="galaxy-legend">
                <span style={{ color: "#70ffc0" }}>
                  <i />
                  Active Builder
                </span>

                <span style={{ color: "#ffc76d" }}>
                  <i />
                  Pending Activation
                </span>

                <span style={{ color: "#8f7cff" }}>
                  <i />
                  Referral Branch
                </span>
              </div>
            </article>

            <article className="galaxy-footer-card">
              <h3>Network Summary</h3>

              <div className="galaxy-summary">
                <div>
                  <span>Total Network</span>
                  <strong>
                    {galaxyMembers.length} Builders
                  </strong>
                </div>

                <div>
                  <span>Verified Connections</span>
                  <strong>{activeMemberCount}</strong>
                </div>

                <div>
                  <span>Pending Builders</span>
                  <strong>{pendingMemberCount}</strong>
                </div>

                <div>
                  <span>Next Galaxy Level</span>
                  <strong>
                    {remainingActiveBuilders === 0
                      ? "Ready"
                      : `${remainingActiveBuilders} remaining`}
                  </strong>
                </div>
              </div>
            </article>
          </section>
        </main>
      </section>
    </motion.div>
  );
}
