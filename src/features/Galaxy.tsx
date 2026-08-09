import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Sparkles,
} from "lucide-react";
import { useBuilderStore } from "./identity/hooks/useBuilderStore";
import { useLanguage } from "../core/language";
import {
  galaxyService,
  type GalaxyMember as RealGalaxyMember,
  type GalaxyMiningMember,
  type GalacticChainLevel,
} from "../core/builder/services/GalaxyService";
import { getPrimaryBranchTheme } from "./galaxy/galaxyThemes";

type GalaxyMember = {
  builderId: string;
  parentBuilderId: string;
  depth: number;
  name: string;
  builders: number;
  gp: number;
  status: "pending" | "active";
  theme: ReturnType<typeof getPrimaryBranchTheme>;
};

export function Galaxy() {
  const { language, t } = useLanguage();
  const builder = useBuilderStore();

  const [galaxyMembers, setGalaxyMembers] = useState<
    RealGalaxyMember[]
  >([]);

  const [
    miningTeamMembers,
    setMiningTeamMembers,
  ] = useState<GalaxyMiningMember[]>([]);

  const [inviter, setInviter] =
    useState<RealGalaxyMember | null>(null);

  const [
    galacticChainLevels,
    setGalacticChainLevels,
  ] = useState<GalacticChainLevel[]>([]);
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
        const [
          members,
          miningMembers,
          loadedInviter,
          loadedGalacticChain,
        ] = await Promise.all([
          galaxyService.loadMyGalaxy(),
          galaxyService
            .loadMyMiningTeam()
            .catch((error) => {
              console.error(
                "Mining Team status could not be loaded:",
                error,
              );

              return [];
            }),
          galaxyService.loadMyInviter().catch((error) => {
            console.error(
              t("galaxy.error.inviterLoad"),
              error,
            );

            return null;
          }),
          galaxyService
            .loadMyGalacticChain()
            .catch((error) => {
              console.error(
                "Galactic Chain could not be loaded:",
                error,
              );

              return [];
            }),
        ]);

        if (isMounted) {
          setGalaxyMembers(members);
          setMiningTeamMembers(miningMembers);
          setInviter(loadedInviter);
          setGalacticChainLevels(
            loadedGalacticChain,
          );
        }
      } catch (error) {
        console.error(
          t("galaxy.error.dataLoad"),
          error,
        );

        if (isMounted) {
          setGalaxyMembers([]);
          setMiningTeamMembers([]);
          setInviter(null);
          setGalacticChainLevels([]);
          setGalaxyError(
            t("galaxy.error.dataLoad"),
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
          `?ref=${encodeURIComponent(
            builder.inviteCode,
          )}`,
          window.location.origin +
            import.meta.env.BASE_URL,
        ).toString()
      : null;

  const miningActivityByBuilder = useMemo(
    () =>
      new Map(
        miningTeamMembers.map((member) => [
          member.builderId,
          member.isMiningActive,
        ]),
      ),
    [miningTeamMembers],
  );

  const activeMemberCount = galaxyMembers.filter(
    (member) =>
      miningActivityByBuilder.get(
        member.builderId,
      ) === true,
  ).length;


const directActiveCircleCount = galaxyMembers.filter(
  (member) =>
    member.depth === 1 &&
    member.referralStatus === "active",
).length;

const pendingMemberCount = Math.max(
    0,
    galaxyMembers.length - activeMemberCount,
  );

  const galaxyLevelTarget = 10;

  const remainingActiveBuilders = Math.max(
    0,
    galaxyLevelTarget - activeMemberCount,
  );

  const visibleMembers = useMemo<GalaxyMember[]>(
    () =>
      galaxyMembers.map((member, index) => ({
        builderId: member.builderId,
        parentBuilderId: member.parentBuilderId,
        depth: member.depth,
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

  const galacticChainTotalGp =
    galacticChainLevels.reduce(
      (total, level) =>
        total + level.totalChainGp,
      0,
    );

  const galacticChainPendingGp =
    galacticChainLevels.reduce(
      (total, level) =>
        total + level.pendingChainGp,
      0,
    );

  const galacticChainEligibleGp =
    galacticChainLevels.reduce(
      (total, level) =>
        total + level.eligibleChainGp,
      0,
    );

  const childrenByParent = useMemo(() => {
    const children = new Map<string, GalaxyMember[]>();

    for (const member of visibleMembers) {
      const siblings =
        children.get(member.parentBuilderId) ?? [];

      siblings.push(member);
      children.set(member.parentBuilderId, siblings);
    }

    return children;
  }, [visibleMembers]);

  const memberOrder = useMemo(
    () =>
      new Map(
        visibleMembers.map((member, index) => [
          member.builderId,
          index,
        ]),
      ),
    [visibleMembers],
  );

  const renderGalaxyBranch = (
    member: GalaxyMember,
  ): ReactNode => {
    const children =
      childrenByParent.get(member.builderId) ?? [];
    const memberIndex =
      memberOrder.get(member.builderId) ?? 0;

    return (
      <motion.div
        className="galaxy-tree-branch"
        key={member.builderId}
        style={
          {
            "--branch-color":
              member.theme.lineColor,
          } as CSSProperties
        }
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay:
            0.05 +
            Math.min(member.depth, 8) * 0.06,
          duration: 0.38,
        }}
      >
        <article
          className={`galaxy-member-card ${
            selectedMemberId === member.builderId
              ? "selected"
              : ""
          }`}
          style={
            {
              "--node-gradient":
                member.theme.nodeGradient,
              "--node-glow":
                member.theme.glowColor,
              "--node-ring":
                member.theme.ringColor,
              "--node-text":
                member.theme.textAccent,
              opacity:
                member.status === "active"
                  ? 1
                  : 0.66,
            } as CSSProperties
          }
          onClick={() =>
            setSelectedMemberId(member.builderId)
          }
        >
          <div className="galaxy-member-icon">
            <img
              className={`bobu-tone-${
                memberIndex % 4
              }`}
              src="/images/galaxy/bobu-builder-space.webp"
              alt={`${member.name} BOBU`}
            />
          </div>

          <strong>{member.name}</strong>

          <div className="galaxy-member-meta">
            {member.gp.toLocaleString(language)} GP
            {" · "}
            {member.builders} Builders
          </div>

          <span
            className={`galaxy-member-status ${
              member.status === "active"
                ? ""
                : "pending"
            }`}
          >
            {member.status === "active"
              ? t("galaxy.status.active")
              : t("galaxy.status.pending")}
          </span>
        </article>

        {children.length > 0 && (
          <div className="galaxy-children">
            {children.map((child) =>
              renderGalaxyBranch(child),
            )}
          </div>
        )}
      </motion.div>
    );
  };

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
          width: min(1520px, calc(100% - 22px));
          margin: 0 auto;
          padding: 112px 0 60px;
          color: white;
        }

        .galaxy-shell {
          display: grid;
          grid-template-columns:
            285px minmax(0, 1fr);
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
          align-self: start;
          flex-direction: column;
          min-height: 760px;
          padding: 22px 18px;
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
          overflow: hidden;
          width: 154px;
          height: 154px;
          margin: 0 auto 16px;
          place-items: center;
          border:
            2px solid rgba(191, 108, 255, 0.72);
          border-radius: 50%;
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

        .galaxy-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .galaxy-profile h2 {
          margin: 0;
          overflow: hidden;
          font-size: 1.65rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .galaxy-profile p {
          margin: 5px 0 0;
          color: rgba(218, 224, 255, 0.48);
          font-size: 1.05rem;
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
          padding: 18px 22px 22px;
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
          padding: 19px 24px;
          border-right:
            1px solid rgba(135, 145, 220, 0.1);
        }

        .galaxy-top-stat:last-child {
          border-right: 0;
        }

        .galaxy-top-stat span {
          display: block;
          color: rgba(217, 223, 255, 0.48);
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .galaxy-top-stat strong {
          display: block;
          margin-top: 7px;
          font-size: 1.55rem;
        }

        .galaxy-network {
          position: relative;
          min-height: 520px;
          margin-top: 14px;
          padding: 18px 22px 20px;
          overflow: auto;
          border:
            1px solid rgba(135, 145, 220, 0.12);
          border-radius: 20px;
          background:
            radial-gradient(
              ellipse at 50% 20%,
              rgba(214, 76, 255, 0.26),
              transparent 27%
            ),
            radial-gradient(
              ellipse at 25% 58%,
              rgba(38, 117, 255, 0.19),
              transparent 31%
            ),
            radial-gradient(
              ellipse at 77% 59%,
              rgba(255, 55, 190, 0.18),
              transparent 31%
            ),
            radial-gradient(
              circle at 50% 50%,
              rgba(92, 55, 205, 0.15),
              transparent 55%
            ),
            linear-gradient(
              180deg,
              rgba(5, 7, 28, 0.54),
              rgba(3, 5, 20, 0.78)
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
          min-width: 760px;
          flex-direction: column;
          align-items: center;
          padding: 12px 20px 6px;
        }

        .galaxy-root-card {
          display: grid;
          width: 190px;
          min-height: 205px;
          place-items: center;
          border: 0;
          border-radius: 0;
          text-align: center;
          cursor: pointer;
          background: transparent;
          box-shadow: none;
        }

        .galaxy-root-image {
          width: 150px;
          height: 150px;
          margin: 0 auto 10px;
          border: 3px solid rgba(211, 104, 255, 0.82);
          border-radius: 50%;
          object-fit: cover;
          box-shadow:
            0 0 0 8px rgba(125, 76, 255, 0.1),
            0 0 30px rgba(210, 84, 255, 0.68),
            0 0 62px rgba(111, 81, 255, 0.48);
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
          font-size: 0.66rem;
          letter-spacing: 0.11em;
        }

        .galaxy-tree-trunk {
          width: 1px;
          height: 44px;
          background:
            linear-gradient(
              rgba(255, 198, 77, 0.72),
              rgba(109, 90, 255, 0.62)
            );
          box-shadow:
            0 0 10px rgba(118, 88, 255, 0.58);
        }

        .galaxy-forest {
          position: relative;
          display: flex;
          width: max-content;
          min-width: 100%;
          align-items: flex-start;
          justify-content: center;
          gap: 34px;
          padding: 30px 28px 10px;
        }

        .galaxy-forest::before {
          content: "";
          position: absolute;
          top: 0;
          left: 8%;
          width: 84%;
          height: 2px;
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
            0 0 12px rgba(101, 205, 255, 0.42);
        }

        .galaxy-tree-branch {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 0 0 auto;
        }

        .galaxy-tree-branch::before {
          content: "";
          position: absolute;
          top: -30px;
          left: 50%;
          width: 2px;
          height: 30px;
          background: var(--branch-color);
          box-shadow:
            0 0 10px var(--branch-color);
          transform: translateX(-50%);
        }

        .galaxy-children {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 26px;
          margin-top: 18px;
          padding: 38px 14px 0;
        }

        .galaxy-children::before {
          content: "";
          position: absolute;
          top: 0;
          left: 10%;
          width: 80%;
          height: 2px;
          background:
            linear-gradient(
              90deg,
              transparent,
              var(--branch-color),
              transparent
            );
          box-shadow:
            0 0 10px var(--branch-color);
          opacity: 0.68;
        }

        .galaxy-children >
        .galaxy-tree-branch::before {
          top: -38px;
          height: 38px;
        }

        .galaxy-member-card {
          display: grid;
          width: 126px;
          min-height: 150px;
          justify-items: center;
          align-content: start;
          padding: 0;
          border: 0;
          border-radius: 0;
          text-align: center;
          cursor: pointer;
          background: transparent;
          box-shadow: none;
          transition:
            transform 180ms ease,
            filter 180ms ease;
        }

        .galaxy-member-card:hover {
          filter: brightness(1.15);
          transform: translateY(-3px);
        }

        .galaxy-member-card.selected
        .galaxy-member-icon {
          border-color: rgba(255, 255, 255, 0.95);
          box-shadow:
            0 0 0 5px rgba(116, 91, 255, 0.12),
            0 0 28px var(--node-glow);
        }

        .galaxy-member-icon {
          width: 92px;
          height: 92px;
          margin: 0 auto 10px;
          overflow: hidden;
          border: 2px solid var(--node-ring);
          border-radius: 50%;
          background: var(--node-gradient);
          box-shadow:
            0 0 16px var(--node-glow),
            0 0 32px
              color-mix(
                in srgb,
                var(--node-glow) 36%,
                transparent
              );
        }

        .galaxy-member-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: filter 180ms ease;
        }

        .bobu-tone-0 {
          filter:
            hue-rotate(35deg)
            saturate(1.35)
            brightness(1.05);
        }

        .bobu-tone-1 {
          filter:
            hue-rotate(105deg)
            saturate(1.45)
            brightness(1.04);
        }

        .bobu-tone-2 {
          filter:
            hue-rotate(310deg)
            saturate(1.45)
            brightness(1.06);
        }

        .bobu-tone-3 {
          filter:
            hue-rotate(150deg)
            saturate(1.5)
            brightness(1.08);
        }

        .galaxy-member-card strong {
          display: block;
          width: 126px;
          overflow: hidden;
          color: white;
          font-size: 0.76rem;
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
          margin-top: 6px;
          color: #70ffc0;
          font-size: 0.62rem;
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
          grid-template-columns: 0.9fr 1.6fr;
          gap: 16px;
          margin-top: 12px;
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
          position: relative;
          display: inline-grid;
          width: 22px;
          height: 22px;
          place-items: center;
          border: 1px solid currentColor;
          border-radius: 7px;
          background:
            color-mix(
              in srgb,
              currentColor 14%,
              transparent
            );
          box-shadow: 0 0 12px currentColor;
        }

        .galaxy-legend i::after {
          content: "✦";
          color: currentColor;
          font-size: 0.72rem;
          line-height: 1;
        }

        .galaxy-legend span:nth-child(1) i::after {
          content: "●";
        }

        .galaxy-legend span:nth-child(2) i::after {
          content: "○";
        }

        .galaxy-legend span:nth-child(3) i::after {
          content: "⚡";
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

        .galaxy-inviter-card {
          position: relative;
          z-index: 2;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          text-align: center;
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
        }

        .galaxy-inviter-card img {
          width: 74px;
          height: 74px;
          object-fit: cover;
          border-radius: 50%;
          border: 3px solid rgba(171, 128, 255, 0.72);
          box-shadow:
            0 0 18px rgba(160, 110, 255, 0.55),
            0 0 42px rgba(110, 70, 255, 0.35),
            inset 0 0 18px rgba(255,255,255,0.12);
        }

        .galaxy-inviter-card strong {
          color: #f4f6ff;
          font-size: 0.94rem;
          line-height: 1.25;
        }

        .galaxy-inviter-card small {
          color: rgba(207, 213, 255, 0.68);
          font-size: 0.72rem;
        }

        .galaxy-inviter-label {
          color: rgba(173, 188, 255, 0.86);
          font-size: 0.63rem;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .galaxy-inviter-line {
          width: 1px;
          height: 30px;
          margin: 0 auto;
          background:
            linear-gradient(
              to bottom,
              rgba(137, 158, 255, 0.7),
              rgba(137, 158, 255, 0.18)
            );
          box-shadow:
            0 0 10px rgba(105, 130, 255, 0.34);
        }



        .galaxy-root-image-compact {
          width: 84px !important;
          height: 84px !important;
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
              <img
                src="/images/galaxy/bobu-builder-space.webp"
                alt={t("galaxy.image.builderAlt")}
              />
            </div>

            <h2>
              {builder.username ||
                t("galaxy.profile.genesisBuilder")}
            </h2>

            <p>
              {t("galaxy.profile.builderLevel", {
                level: builder.level,
              })}
            </p>

            <div className="galaxy-rank">
              <Sparkles size={13} />
              {t("galaxy.profile.nebulaRank", {
                level: builder.level,
              })}
            </div>
          </div>

          <div className="galaxy-side-stats">
            <div className="galaxy-side-stat">
              <span>
                {t("galaxy.sidebar.personalGp")}
              </span>
              <strong>
                {builder.personalGp.toLocaleString(language)}
              </strong>
            </div>

            <div className="galaxy-side-stat">
              <span>
                {t("galaxy.sidebar.pendingNetworkGp")}
              </span>
              <strong>
                {builder.pendingNetworkGp.toLocaleString(language)}
              </strong>
            </div>

            <div className="galaxy-side-stat">
              <span>
                {t("galaxy.sidebar.eligibleNetworkGp")}
              </span>
              <strong>
                {builder.eligibleNetworkGp.toLocaleString(language)}
              </strong>
            </div>

            <div className="galaxy-side-stat">
              <span>
                {t("galaxy.sidebar.totalGp")}
              </span>
              <strong>
                {builder.gp.toLocaleString(language)}
              </strong>
            </div>

            <div className="galaxy-side-stat">
              <span>
                {t("galaxy.sidebar.inviteCode")}
              </span>
              <strong>
                {builder.inviteCode || "—"}
              </strong>
            </div>

            <div className="galaxy-side-stat">
              <span>
                {t("galaxy.sidebar.activeCircle")}
              </span>
              <strong>{directActiveCircleCount}</strong>
            </div>
          </div>

          <div className="galaxy-invite">
            <h3>{t("galaxy.invite.title")}</h3>

            <p>
              {t("galaxy.invite.description")}
            </p>

            <div className="galaxy-referral-box">
              <code>
                {referralLink ||
                  t("galaxy.invite.unavailable")}
              </code>

              <button
                type="button"
                className="galaxy-copy"
                onClick={copyReferralLink}
                disabled={!referralLink}
                aria-label={
                  copied
                    ? t("galaxy.invite.copiedAria")
                    : t("galaxy.invite.copyAria")
                }
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
              <span>
                {t("galaxy.top.totalBuilders")}
              </span>
              <strong>{galaxyMembers.length}</strong>
            </div>

            <div className="galaxy-top-stat">
              <span>
                {t("galaxy.top.activeNow")}
              </span>
              <strong>{activeMemberCount}</strong>
            </div>

            <div className="galaxy-top-stat">
              <span>
                {t("galaxy.top.totalGp")}
              </span>
              <strong>
                {builder.gp.toLocaleString(language)}
              </strong>
            </div>

            <div className="galaxy-top-stat">
              <span>{t("galaxy.top.rank")}</span>
              <strong>#{builder.level}</strong>
            </div>
          </section>

          <section className="galaxy-network">
            <div className="galaxy-network-heading">
              <div>
                <h1>{t("galaxy.network.title")}</h1>
                <p>
                  {t("galaxy.network.description")}
                </p>
              </div>

              <span className="galaxy-online">
                {t("galaxy.network.online")}
              </span>
            </div>

            <div className="galaxy-tree">
              {inviter ? (
                <>
                  <motion.div
                    className="galaxy-inviter-card"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <span className="galaxy-inviter-label">
                      {t("galaxy.network.invitedBy")}
                    </span>

                    <img
                      src="/images/galaxy/bobu-builder-space.webp"
                      alt={t("galaxy.image.inviterAlt")}
                    />

                    <strong>
                      {inviter.displayName ??
                        inviter.username ??
                        t(
                          "galaxy.network.builderFallback",
                          {
                            id: inviter.builderId.slice(
                              0,
                              6,
                            ),
                          },
                        )}
                    </strong>

                    <small>
                      {t("galaxy.network.inviterMeta", {
                        level: inviter.level,
                        gp: inviter.gp.toLocaleString(
                          language,
                        ),
                      })}
                    </small>
                  </motion.div>

                  <div className="galaxy-inviter-line" />
                </>
              ) : null}

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
                  <img
                    className="galaxy-root-image galaxy-root-image-compact"
                    src="/images/galaxy/bobu-builder-space.webp"
                    alt={t("galaxy.image.kingAlt")}
                  />

                  <strong>
                    {builder.username ||
                      t("galaxy.profile.kingBobu")}
                  </strong>

                  <span>
                    {t("galaxy.profile.nebulaCore")}
                  </span>
                </div>
              </motion.div>

              <div className="galaxy-tree-trunk" />

              {isGalaxyLoading ? (
                <div className="galaxy-empty">
                  {t("galaxy.network.loading")}
                </div>
              ) : galaxyError ? (
                <div className="galaxy-empty">
                  {galaxyError}
                </div>
              ) : visibleMembers.length > 0 ? (
                <div className="galaxy-forest">
                  {(childrenByParent.get(builder.id) ?? [])
                    .map((member) =>
                      renderGalaxyBranch(member),
                    )}
                </div>
              ) : (
                <div className="galaxy-empty">
                  {t("galaxy.network.empty")}
                </div>
              )}
            </div>
          </section>

          <section className="galaxy-footer-grid">
            <article
              className="galaxy-footer-card"
              style={{ gridColumn: "1 / -1" }}
            >
              <h3>{t("galaxy.chain.title")}</h3>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "rgba(218, 224, 255, 0.55)",
                  fontSize: "0.72rem",
                  lineHeight: 1.5,
                }}
              >
                {t("galaxy.chain.description")}
              </p>

              <div className="galaxy-summary">
                <div>
                  <span>{t("galaxy.chain.total")}</span>
                  <strong>
                    {galacticChainTotalGp.toLocaleString(
                      language,
                    )} GP
                  </strong>
                </div>

                <div>
                  <span>{t("galaxy.chain.pending")}</span>
                  <strong>
                    {galacticChainPendingGp.toLocaleString(
                      language,
                    )} GP
                  </strong>
                </div>

                <div>
                  <span>{t("galaxy.chain.eligible")}</span>
                  <strong>
                    {galacticChainEligibleGp.toLocaleString(
                      language,
                    )} GP
                  </strong>
                </div>
              </div>

              <div
                className="galaxy-summary"
                style={{ marginTop: 14 }}
              >
                {galacticChainLevels.map((level) => (
                  <div key={level.depth}>
                    <span>
                      {t("galaxy.chain.level", {
                        level: level.depth,
                      })}
                    </span>

                    <strong>
                      {t("galaxy.chain.levelSummary", {
                        builders:
                          level.rewardedBuilderCount,
                        reward:
                          level.rewardPerBuilder,
                        total:
                          level.totalChainGp,
                      })}
                    </strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="galaxy-footer-grid">
            <article className="galaxy-footer-card">
              <h3>
                {t("galaxy.footer.statusTitle")}
              </h3>

              <div className="galaxy-legend">
                <span style={{ color: "#70ffc0" }}>
                  <i />
                  {t("galaxy.footer.activeBuilder")}
                </span>

                <span style={{ color: "#ffc76d" }}>
                  <i />
                  {t(
                    "galaxy.footer.pendingActivation",
                  )}
                </span>

                <span style={{ color: "#8f7cff" }}>
                  <i />
                  {t("galaxy.footer.referralBranch")}
                </span>
              </div>
            </article>

            <article className="galaxy-footer-card">
              <h3>
                {t("galaxy.footer.summaryTitle")}
              </h3>

              <div className="galaxy-summary">
                <div>
                  <span>
                    {t("galaxy.footer.totalNetwork")}
                  </span>
                  <strong>
                    {t("galaxy.footer.builderCount", {
                      count: galaxyMembers.length,
                    })}
                  </strong>
                </div>

                <div>
                  <span>
                    {t(
                      "galaxy.footer.verifiedConnections",
                    )}
                  </span>
                  <strong>{activeMemberCount}</strong>
                </div>

                <div>
                  <span>
                    {t("galaxy.footer.pendingBuilders")}
                  </span>
                  <strong>{pendingMemberCount}</strong>
                </div>

                <div>
                  <span>
                    {t("galaxy.footer.nextLevel")}
                  </span>
                  <strong>
                    {remainingActiveBuilders === 0
                      ? t("galaxy.footer.ready")
                      : t("galaxy.footer.remaining", {
                          count:
                            remainingActiveBuilders,
                        })}
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
