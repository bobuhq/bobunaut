import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Atom,
  Droplets,
  Gauge,
  House,
  Rocket,
  Shield,
  Users,
  Zap,
} from "lucide-react";

import {
  getMarsCivilizationOverview,
  type MarsCivilizationOverview,
} from "../core/mars/MarsCivilizationService";

import {
  getMyMarsAccess,
  type MarsAccess,
} from "../core/mars/MarsAccessService";

import {
  approveMarsColonyJoinRequest,
  createMyMarsColony,
  demoteMarsColonyOfficer,
  getMarsColonyDirectory,
  getMyMarsColony,
  getMyMarsColonyJoinRequests,
  getMyMarsColonyMembers,
  getMyPendingMarsColonyJoinRequest,
  leaveMyMarsColony,
  promoteMarsColonyOfficer,
  rejectMarsColonyJoinRequest,
  requestJoinMarsColony,
  transferMyMarsColonyLeadership,
  type MarsColony,
  type MarsColonyDirectoryEntry,
  type MarsColonyJoinRequest,
  type MarsColonyJoinRequestResult,
  type MarsColonyMember,
} from "../core/mars/MarsColonyService";

import {
  assignMyColonyToMarsSector,
  getMarsSectorDirectory,
  type MarsSector,
} from "../core/mars/MarsSectorService";

import {
  constructMyMarsColonyBuilding,
  getMyMarsColonyBase,
  getMyMarsColonyConstructionCosts,
  type MarsColonyBaseBuilding,
  type MarsColonyBuildingConstructionCost,
} from "../core/mars/MarsColonyBaseService";

import "./BuildMars.css";

import {
  claimMyMarsColonyResources,
  getMyMarsColonyResources,
  getMyMarsColonyBuildingUpgrades,
  getMyMarsResourceProduction,
  upgradeMyMarsColonyBuilding,
  type MarsColonyResources,
  type MarsColonyBuildingUpgrade,
  type MarsColonyResourceProduction,
} from "../core/mars/MarsColonyBaseService";

export function BuildMars() {
  const [marsAccess, setMarsAccess] =
    useState<MarsAccess | null>(null);

  const [accessLoading, setAccessLoading] =
    useState(true);

  const [accessError, setAccessError] =
    useState<string | null>(null);

  const [overview, setOverview] =
    useState<MarsCivilizationOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [myColony, setMyColony] =
    useState<MarsColony | null>(null);

  const [colonyLoading, setColonyLoading] =
    useState(true);

  const [colonyError, setColonyError] =
    useState<string | null>(null);

  const [colonyDirectory, setColonyDirectory] =
    useState<MarsColonyDirectoryEntry[]>([]);

  const [directoryLoading, setDirectoryLoading] =
    useState(false);

  const [directoryError, setDirectoryError] =
    useState<string | null>(null);

  const [showCreateColony, setShowCreateColony] =
    useState(false);

  const [showColonyDirectory, setShowColonyDirectory] =
    useState(false);

  const [newColonyName, setNewColonyName] =
    useState("");

  const [newColonySpecialization, setNewColonySpecialization] =
    useState("general");

  const [creatingColony, setCreatingColony] =
    useState(false);

  const [colonyActionError, setColonyActionError] =
    useState<string | null>(null);

  const [joiningColonyId, setJoiningColonyId] =
    useState<string | null>(null);

  const [pendingJoinRequest, setPendingJoinRequest] =
    useState<MarsColonyJoinRequestResult | null>(null);

  const [colonyJoinRequests, setColonyJoinRequests] =
    useState<MarsColonyJoinRequest[]>([]);

  const [joinRequestsLoading, setJoinRequestsLoading] =
    useState(false);

  const [joinRequestsError, setJoinRequestsError] =
    useState<string | null>(null);

  const [resolvingJoinRequestId, setResolvingJoinRequestId] =
    useState<string | null>(null);

  const [colonyMembers, setColonyMembers] =
    useState<MarsColonyMember[]>([]);

  const [membersLoading, setMembersLoading] =
    useState(false);

  const [membersError, setMembersError] =
    useState<string | null>(null);

  const [memberActionBuilderId, setMemberActionBuilderId] =
    useState<string | null>(null);

  const [colonyBase, setColonyBase] =
    useState<MarsColonyBaseBuilding[]>([]);

  const [baseLoading, setBaseLoading] =
    useState(false);

  const [baseError, setBaseError] =
    useState<string | null>(null);

  const [constructingBuildingKey, setConstructingBuildingKey] =
    useState<string | null>(null);

  const [colonyResources, setColonyResources] =
    useState<MarsColonyResources | null>(null);

  const [buildingUpgrades, setBuildingUpgrades] =
    useState<MarsColonyBuildingUpgrade[]>([]);

  const [constructionCosts, setConstructionCosts] =
    useState<MarsColonyBuildingConstructionCost[]>([]);

  const [resourceProduction, setResourceProduction] =
    useState<MarsColonyResourceProduction | null>(null);

  const [claimingResources, setClaimingResources] =
    useState(false);

  const [upgradingBuildingKey, setUpgradingBuildingKey] =
    useState<string | null>(null);


  const [leavingColony, setLeavingColony] =
    useState(false);

  const [sectors, setSectors] =
    useState<MarsSector[]>([]);

  const [sectorsLoading, setSectorsLoading] =
    useState(true);

  const [sectorsError, setSectorsError] =
    useState<string | null>(null);

  const [assigningSectorId, setAssigningSectorId] =
    useState<string | null>(null);

  const [selectedSectorId, setSelectedSectorId] =
    useState<string | null>(null);

  const [sectorActionError, setSectorActionError] =
    useState<string | null>(null);

  const [currentBuilderId, setCurrentBuilderId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentBuilder = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled) {
        setCurrentBuilderId(session?.user.id ?? null);
      }
    };

    void loadCurrentBuilder();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        setAccessLoading(true);
        setAccessError(null);

        const access = await getMyMarsAccess();

        if (!cancelled) {
          setMarsAccess(access);
        }
      } catch (loadError) {
        console.error(
          "BUILD MARS access load failed:",
          loadError,
        );

        if (!cancelled) {
          setAccessError(
            "Mars access state is temporarily unavailable.",
          );
        }
      } finally {
        if (!cancelled) {
          setAccessLoading(false);
        }
      }
    };

    void loadAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!marsAccess?.unlocked) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data =
          await getMarsCivilizationOverview();

        if (!cancelled) {
          setOverview(data);
        }
      } catch (loadError) {
        console.error(
          "BUILD MARS overview failed:",
          loadError,
        );

        if (!cancelled) {
          setError(
            "Mars civilization data is temporarily unavailable.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [marsAccess?.unlocked]);

  useEffect(() => {
    if (!marsAccess?.unlocked) {
      setColonyLoading(false);
      return;
    }

    let cancelled = false;

    const loadColony = async () => {
      try {
        setColonyLoading(true);
        setColonyError(null);

        const [colony, pendingRequest] =
          await Promise.all([
            getMyMarsColony(),
            getMyPendingMarsColonyJoinRequest(),
          ]);

        if (!cancelled) {
          setMyColony(colony);

          if (!colony && pendingRequest) {
            setPendingJoinRequest({
              membership_id:
                pendingRequest.membership_id,
              colony_id: pendingRequest.colony_id,
              colony_name: pendingRequest.colony_name,
              membership_status:
                pendingRequest.membership_status,
              requested_at:
                pendingRequest.requested_at,
            });
          } else {
            setPendingJoinRequest(null);
          }
        }
      } catch (loadError) {
        console.error(
          "BUILD MARS Colony load failed:",
          loadError,
        );

        if (!cancelled) {
          setColonyError(
            "Colony data is temporarily unavailable.",
          );
        }
      } finally {
        if (!cancelled) {
          setColonyLoading(false);
        }
      }
    };

    void loadColony();

    return () => {
      cancelled = true;
    };
  }, [marsAccess?.unlocked]);

  const loadColonyDirectory = async () => {
    try {
      setDirectoryLoading(true);
      setDirectoryError(null);

      const colonies = await getMarsColonyDirectory();

      setColonyDirectory(colonies);
    } catch (loadError) {
      console.error(
        "BUILD MARS Colony directory failed:",
        loadError,
      );

      setDirectoryError(
        "Colony directory is temporarily unavailable.",
      );
    } finally {
      setDirectoryLoading(false);
    }
  };

  const handleCreateColony = async () => {
    const trimmedName = newColonyName.trim();

    if (!trimmedName || creatingColony) {
      return;
    }

    try {
      setCreatingColony(true);
      setColonyActionError(null);

      await createMyMarsColony(
        trimmedName,
        newColonySpecialization,
      );

      const colony = await getMyMarsColony();

      setMyColony(colony);
      setShowCreateColony(false);
      setShowColonyDirectory(false);
      setNewColonyName("");
    } catch (actionError) {
      console.error(
        "BUILD MARS Colony creation failed:",
        actionError,
      );

      setColonyActionError(
        actionError instanceof Error
          ? actionError.message
          : "Colony creation failed.",
      );
    } finally {
      setCreatingColony(false);
    }
  };

  const handleRequestJoinColony = async (
    colonyId: string,
  ) => {
    if (joiningColonyId) {
      return;
    }

    try {
      setJoiningColonyId(colonyId);
      setColonyActionError(null);

      const request =
        await requestJoinMarsColony(colonyId);

      setPendingJoinRequest(request);
    } catch (actionError) {
      console.error(
        "BUILD MARS Colony join request failed:",
        actionError,
      );

      setColonyActionError(
        actionError instanceof Error
          ? actionError.message
          : "Colony join request failed.",
      );
    } finally {
      setJoiningColonyId(null);
    }
  };

  const loadSectors = async () => {
    try {
      setSectorsLoading(true);
      setSectorsError(null);

      const data = await getMarsSectorDirectory();

      setSectors(data);
    } catch (loadError) {
      console.error(
        "BUILD MARS Sector directory failed:",
        loadError,
      );

      setSectorsError(
        "Mars Sector data is temporarily unavailable.",
      );
    } finally {
      setSectorsLoading(false);
    }
  };

  useEffect(() => {
    if (!marsAccess?.unlocked) {
      setSectorsLoading(false);
      return;
    }

    void loadSectors();
  }, [marsAccess?.unlocked]);

  const handleAssignSector = async (
    sectorId: string,
  ) => {
    if (assigningSectorId) {
      return;
    }

    try {
      setAssigningSectorId(sectorId);
      setSectorActionError(null);

      const assignment =
        await assignMyColonyToMarsSector(sectorId);

      setMyColony((currentColony) =>
        currentColony
          ? {
              ...currentColony,
              active_sector_id: assignment.sector_id,
              active_sector_code:
                sectors.find(
                  (sector) =>
                    sector.sector_id === assignment.sector_id,
                )?.sector_code ?? null,
              active_sector_name: assignment.sector_name,
              active_sector_status:
                assignment.assignment_status,
              sector_assigned_at: assignment.assigned_at,
            }
          : currentColony,
      );

      await loadSectors();
    } catch (actionError) {
      console.error(
        "BUILD MARS Sector assignment failed:",
        actionError,
      );

      const message =
        actionError instanceof Error
          ? actionError.message
          : "Sector assignment failed.";

      setSectorActionError(message);
    } finally {
      setAssigningSectorId(null);
    }
  };

  const loadColonyJoinRequests = async () => {
    if (
      !myColony ||
      !["founder", "leader"].includes(myColony.my_role)
    ) {
      setColonyJoinRequests([]);
      return;
    }

    try {
      setJoinRequestsLoading(true);
      setJoinRequestsError(null);

      const requests =
        await getMyMarsColonyJoinRequests();

      setColonyJoinRequests(requests);
    } catch (loadError) {
      console.error(
        "BUILD MARS Colony join requests failed:",
        loadError,
      );

      setJoinRequestsError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Colony join requests.",
      );
    } finally {
      setJoinRequestsLoading(false);
    }
  };

  const handleApproveJoinRequest = async (
    membershipId: string,
  ) => {
    if (resolvingJoinRequestId) {
      return;
    }

    try {
      setResolvingJoinRequestId(membershipId);
      setJoinRequestsError(null);

      const result =
        await approveMarsColonyJoinRequest(
          membershipId,
        );

      setColonyJoinRequests((current) =>
        current.filter(
          (request) =>
            request.membership_id !== membershipId,
        ),
      );

      setMyColony((current) =>
        current
          ? {
              ...current,
              member_count: result.member_count,
            }
          : current,
      );
    } catch (actionError) {
      console.error(
        "BUILD MARS Colony join approval failed:",
        actionError,
      );

      setJoinRequestsError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to approve Colony join request.",
      );

      await loadColonyJoinRequests();
    } finally {
      setResolvingJoinRequestId(null);
    }
  };

  const handleRejectJoinRequest = async (
    membershipId: string,
  ) => {
    if (resolvingJoinRequestId) {
      return;
    }

    try {
      setResolvingJoinRequestId(membershipId);
      setJoinRequestsError(null);

      await rejectMarsColonyJoinRequest(
        membershipId,
      );

      setColonyJoinRequests((current) =>
        current.filter(
          (request) =>
            request.membership_id !== membershipId,
        ),
      );
    } catch (actionError) {
      console.error(
        "BUILD MARS Colony join rejection failed:",
        actionError,
      );

      setJoinRequestsError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to reject Colony join request.",
      );

      await loadColonyJoinRequests();
    } finally {
      setResolvingJoinRequestId(null);
    }
  };

  const loadColonyMembers = async () => {
    if (!myColony) {
      setColonyMembers([]);
      return;
    }

    try {
      setMembersLoading(true);
      setMembersError(null);

      const members =
        await getMyMarsColonyMembers();

      setColonyMembers(members);
    } catch (loadError) {
      console.error(
        "BUILD MARS Colony members failed:",
        loadError,
      );

      setMembersError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Colony members.",
      );
    } finally {
      setMembersLoading(false);
    }
  };

  const refreshColonyAfterMemberAction = async () => {
    const refreshedColony =
      await getMyMarsColony();

    setMyColony(refreshedColony);

    if (refreshedColony) {
      const members =
        await getMyMarsColonyMembers();

      setColonyMembers(members);
    } else {
      setColonyMembers([]);
    }
  };

  const handlePromoteOfficer = async (
    builderId: string,
  ) => {
    if (memberActionBuilderId) {
      return;
    }

    try {
      setMemberActionBuilderId(builderId);
      setMembersError(null);

      await promoteMarsColonyOfficer(builderId);

      await refreshColonyAfterMemberAction();
    } catch (actionError) {
      console.error(
        "BUILD MARS Officer promotion failed:",
        actionError,
      );

      setMembersError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to promote Colony Officer.",
      );
    } finally {
      setMemberActionBuilderId(null);
    }
  };

  const handleDemoteOfficer = async (
    builderId: string,
  ) => {
    if (memberActionBuilderId) {
      return;
    }

    try {
      setMemberActionBuilderId(builderId);
      setMembersError(null);

      await demoteMarsColonyOfficer(builderId);

      await refreshColonyAfterMemberAction();
    } catch (actionError) {
      console.error(
        "BUILD MARS Officer demotion failed:",
        actionError,
      );

      setMembersError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to demote Colony Officer.",
      );
    } finally {
      setMemberActionBuilderId(null);
    }
  };

  const handleTransferLeadership = async (
    builderId: string,
  ) => {
    if (
      memberActionBuilderId ||
      !myColony ||
      builderId === currentBuilderId
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Transfer operational Colony leadership to this Builder?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setMemberActionBuilderId(builderId);
      setMembersError(null);

      await transferMyMarsColonyLeadership(
        builderId,
      );

      await refreshColonyAfterMemberAction();
    } catch (actionError) {
      console.error(
        "BUILD MARS leadership transfer failed:",
        actionError,
      );

      setMembersError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to transfer Colony leadership.",
      );
    } finally {
      setMemberActionBuilderId(null);
    }
  };

  useEffect(() => {
    if (!myColony) {
      setColonyMembers([]);
      return;
    }

    void loadColonyMembers();
  }, [myColony?.colony_id]);

  const handleLeaveColony = async () => {
    if (
      !myColony ||
      leavingColony ||
      !["member", "officer"].includes(myColony.my_role)
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Leave ${myColony.colony_name}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setLeavingColony(true);
      setMembersError(null);
      setColonyActionError(null);

      await leaveMyMarsColony();

      setMyColony(null);
      setColonyMembers([]);
      setColonyJoinRequests([]);
      setPendingJoinRequest(null);

      setShowCreateColony(false);
      setShowColonyDirectory(false);

      await loadColonyDirectory();
    } catch (actionError) {
      console.error(
        "BUILD MARS leave Colony failed:",
        actionError,
      );

      setMembersError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to leave Colony.",
      );
    } finally {
      setLeavingColony(false);
    }
  };

  const selectedSector = useMemo(
    () =>
      sectors.find(
        (sector) =>
          sector.sector_id === selectedSectorId,
      ) ?? null,
    [sectors, selectedSectorId],
  );

  const loadColonyBase = async () => {
    if (!myColony) {
      setColonyBase([]);
      return;
    }

    try {
      setBaseLoading(true);
      setBaseError(null);

      const buildings =
        await getMyMarsColonyBase();

      setColonyBase(buildings);
    } catch (loadError) {
      console.error(
        "BUILD MARS Colony Base failed:",
        loadError,
      );

      setBaseError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Colony Base.",
      );
    } finally {
      setBaseLoading(false);
    }
  };

  const handleConstructBuilding = async (
    buildingKey: string,
  ) => {
    if (
      !myColony ||
      constructingBuildingKey ||
      !["founder", "leader"].includes(myColony.my_role)
    ) {
      return;
    }

    try {
      setConstructingBuildingKey(buildingKey);
      setBaseError(null);

      await constructMyMarsColonyBuilding(
        buildingKey,
      );

      const [buildings, resources, upgrades, costs] =
        await Promise.all([
          getMyMarsColonyBase(),
          getMyMarsColonyResources(),
          getMyMarsColonyBuildingUpgrades(),
          getMyMarsColonyConstructionCosts(),
        ]);

      setColonyBase(buildings);
      setColonyResources(resources);
      setBuildingUpgrades(upgrades);
      setConstructionCosts(costs);
    } catch (actionError) {
      console.error(
        "BUILD MARS building construction failed:",
        actionError,
      );

      setBaseError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to construct Colony building.",
      );
    } finally {
      setConstructingBuildingKey(null);
    }
  };

  const loadColonyEconomy = async () => {
    if (!myColony) {
      setColonyResources(null);
      setBuildingUpgrades([]);
      setConstructionCosts([]);
      setResourceProduction(null);
      return;
    }

    try {
      const [resources, upgrades, costs, production] =
        await Promise.all([
          getMyMarsColonyResources(),
          getMyMarsColonyBuildingUpgrades(),
          getMyMarsColonyConstructionCosts(),
          getMyMarsResourceProduction(),
        ]);

      setColonyResources(resources);
      setBuildingUpgrades(upgrades);
      setConstructionCosts(costs);
      setResourceProduction(production);
    } catch (loadError) {
      console.error(
        "BUILD MARS Colony economy failed:",
        loadError,
      );

      setBaseError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Colony resources.",
      );
    }
  };

  const refreshColonyBase = async () => {
    const [buildings, resources, upgrades, costs, production] =
      await Promise.all([
        getMyMarsColonyBase(),
        getMyMarsColonyResources(),
        getMyMarsColonyBuildingUpgrades(),
        getMyMarsColonyConstructionCosts(),
        getMyMarsResourceProduction(),
      ]);

    setColonyBase(buildings);
    setColonyResources(resources);
    setBuildingUpgrades(upgrades);
    setConstructionCosts(costs);
    setResourceProduction(production);
  };

  const handleClaimResources = async () => {
    if (
      !myColony ||
      claimingResources ||
      !["founder", "leader"].includes(myColony.my_role)
    ) {
      return;
    }

    try {
      setClaimingResources(true);
      setBaseError(null);

      await claimMyMarsColonyResources();

      const [resources, production] = await Promise.all([
        getMyMarsColonyResources(),
        getMyMarsResourceProduction(),
      ]);

      setColonyResources(resources);
      setResourceProduction(production);
    } catch (claimError) {
      console.error(
        "BUILD MARS resource claim failed:",
        claimError,
      );

      setBaseError(
        claimError instanceof Error
          ? claimError.message
          : "Unable to collect Colony resources.",
      );
    } finally {
      setClaimingResources(false);
    }
  };

  const handleUpgradeBuilding = async (
    buildingKey: string,
  ) => {
    if (
      !myColony ||
      upgradingBuildingKey ||
      !["founder", "leader"].includes(myColony.my_role)
    ) {
      return;
    }

    try {
      setUpgradingBuildingKey(buildingKey);
      setBaseError(null);

      await upgradeMyMarsColonyBuilding(buildingKey);

      await refreshColonyBase();
    } catch (actionError) {
      console.error(
        "BUILD MARS building upgrade failed:",
        actionError,
      );

      setBaseError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to upgrade Colony building.",
      );
    } finally {
      setUpgradingBuildingKey(null);
    }
  };

  useEffect(() => {
    if (!myColony) {
      setColonyBase([]);
      setColonyResources(null);
      setBuildingUpgrades([]);
      setConstructionCosts([]);
      setResourceProduction(null);
      return;
    }

    void Promise.all([
      loadColonyBase(),
      loadColonyEconomy(),
    ]);
  }, [myColony?.colony_id]);

  const builderProgress = useMemo(() => {
    if (!overview || overview.target_builder_count <= 0) {
      return 0;
    }

    return Math.min(
      (overview.builders_joined /
        overview.target_builder_count) *
        100,
      100,
    );
  }, [overview]);

  const unlockProgress = useMemo(() => {
    if (
      !overview ||
      !overview.next_unlock_required_builders ||
      overview.next_unlock_required_builders <= 0
    ) {
      return 0;
    }

    return Math.min(
      (overview.builders_joined /
        overview.next_unlock_required_builders) *
        100,
      100,
    );
  }, [overview]);

  if (accessLoading) {
    return (
      <main className="mars-page">
        <div className="mars-state">
          Checking Mars access...
        </div>
      </main>
    );
  }

  if (accessError || !marsAccess) {
    return (
      <main className="mars-page">
        <div className="mars-state mars-state-error">
          {accessError ?? "Mars access unavailable."}
        </div>
      </main>
    );
  }

  if (!marsAccess.unlocked) {
    const accessProgress =
      marsAccess.required_gp > 0
        ? Math.min(
            (marsAccess.current_gp /
              marsAccess.required_gp) *
              100,
            100,
          )
        : 0;

    return (
      <main className="mars-page">
        <section className="mars-hero mars-access-hero">
          <div className="mars-kicker">
            BOBU CIVILIZATION PROTOCOL
          </div>

          <h1>BUILD MARS</h1>

          <p>
            Mars participation unlocks permanently when your
            Builder reaches the required Total GP.
          </p>
        </section>

        <section className="mars-access-panel">
          <span className="mars-section-label">
            MARS ACCESS
          </span>

          <h2>Access Locked</h2>

          <div className="mars-access-balance">
            <strong>
              {marsAccess.current_gp.toLocaleString()}
            </strong>

            <span>/</span>

            <strong>
              {marsAccess.required_gp.toLocaleString()}
            </strong>

            <span>GP</span>
          </div>

          <div className="mars-progress">
            <div
              className="mars-progress-fill"
              style={{ width: `${accessProgress}%` }}
            />
          </div>

          <p className="mars-access-remaining">
            {marsAccess.remaining_gp.toLocaleString()} GP
            remaining
          </p>

          <p className="mars-access-copy">
            Reach the required Total GP to permanently unlock
            Colony creation, Colony membership, Mars Sectors,
            and civilization participation.
          </p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mars-page">
        <div className="mars-state">
          Establishing Mars uplink...
        </div>
      </main>
    );
  }

  if (error || !overview) {
    return (
      <main className="mars-page">
        <div className="mars-state mars-state-error">
          {error ?? "Mars civilization data unavailable."}
        </div>
      </main>
    );
  }

  const metrics = [
    ["Energy", overview.energy, Zap],
    ["Water", overview.water, Droplets],
    ["Habitats", overview.habitats, House],
    ["Science", overview.science, Atom],
    ["Exploration", overview.exploration, Rocket],
    ["Security", overview.security, Shield],
  ] as const;

  return (
    <main className="mars-page">
      <section className="mars-hero">
        <div className="mars-kicker">
          BOBU CIVILIZATION PROTOCOL
        </div>

        <h1>BUILD MARS</h1>

        <p>
          One civilization. One million Builders.
          Build the infrastructure required for humanity's
          next world.
        </p>

        <div className="mars-population">
          <Users size={22} />

          <strong>
            {overview.builders_joined.toLocaleString()}
          </strong>

          <span>/</span>

          <strong>
            {overview.target_builder_count.toLocaleString()}
          </strong>

          <span>Builders</span>
        </div>

        <div className="mars-progress">
          <div
            className="mars-progress-fill"
            style={{ width: `${builderProgress}%` }}
          />
        </div>
      </section>

      <section className="mars-unlock">
        <div>
          <span className="mars-section-label">
            NEXT CIVILIZATION UNLOCK
          </span>

          <h2>
            {overview.next_unlock_title ??
              "Awaiting next objective"}
          </h2>

          <p>
            {overview.next_unlock_status === "locked"
              ? "LOCKED"
              : (
                  overview.next_unlock_status ??
                  "UNKNOWN"
                ).toUpperCase()}
          </p>
        </div>

        {overview.next_unlock_required_builders !== null && (
          <div className="mars-unlock-progress">
            <strong>
              {overview.builders_joined.toLocaleString()}
              {" / "}
              {overview.next_unlock_required_builders.toLocaleString()}
            </strong>

            <span>Builders</span>

            <div className="mars-progress">
              <div
                className="mars-progress-fill"
                style={{ width: `${unlockProgress}%` }}
              />
            </div>
          </div>
        )}
      </section>

      <section className="mars-metrics">
        {metrics.map(([label, value, Icon]) => (
          <article
            className="mars-metric"
            key={label}
          >
            <Icon size={22} />

            <span>{label}</span>

            <strong>
              {value.toLocaleString()}
            </strong>
          </article>
        ))}
      </section>

      <section className="mars-contribution">
        <Gauge size={24} />

        <div>
          <span>Total Civilization Contribution</span>

          <strong>
            {overview.total_contribution.toLocaleString()}
          </strong>
        </div>
      </section>

      <section className="mars-colony-network">
        <div className="mars-colony-heading">
          <div>
            <span className="mars-section-label">
              COLONY NETWORK
            </span>

            <h2>My Mars Colony</h2>
          </div>

          <Users size={26} />
        </div>

        {colonyLoading && (
          <div className="mars-colony-state">
            Synchronizing Colony network...
          </div>
        )}

        {!colonyLoading && colonyError && (
          <div className="mars-colony-state mars-state-error">
            {colonyError}
          </div>
        )}

        {!colonyLoading &&
          !colonyError &&
          !myColony && (
            <div className="mars-colony-onboarding">
              <div className="mars-colony-empty">
                <strong>No active Colony</strong>

                <p>
                  Establish a new Colony or request membership
                  in an existing Mars Colony.
                </p>

                <div className="mars-colony-entry-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateColony((value) => !value);
                      setShowColonyDirectory(false);
                      setColonyActionError(null);
                    }}
                  >
                    Create Colony
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !showColonyDirectory;

                      setShowColonyDirectory(next);
                      setShowCreateColony(false);
                      setColonyActionError(null);

                      if (
                        next &&
                        colonyDirectory.length === 0
                      ) {
                        void loadColonyDirectory();
                      }
                    }}
                  >
                    Explore Colonies
                  </button>
                </div>
              </div>

              {showCreateColony && (
                <div className="mars-colony-create">
                  <span className="mars-section-label">
                    NEW COLONY
                  </span>

                  <h3>Establish a Mars Colony</h3>

                  <label>
                    Colony Name
                    <input
                      type="text"
                      value={newColonyName}
                      maxLength={48}
                      disabled={creatingColony}
                      placeholder="Enter Colony name"
                      onChange={(event) =>
                        setNewColonyName(
                          event.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    Specialization
                    <select
                      value={newColonySpecialization}
                      disabled={creatingColony}
                      onChange={(event) =>
                        setNewColonySpecialization(
                          event.target.value,
                        )
                      }
                    >
                      <option value="general">
                        General
                      </option>
                      <option value="science">
                        Science
                      </option>
                      <option value="exploration">
                        Exploration
                      </option>
                      <option value="infrastructure">
                        Infrastructure
                      </option>
                      <option value="security">
                        Security
                      </option>
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={
                      creatingColony ||
                      newColonyName.trim().length === 0
                    }
                    onClick={() =>
                      void handleCreateColony()
                    }
                  >
                    {creatingColony
                      ? "Establishing..."
                      : "Establish Colony"}
                  </button>
                </div>
              )}

              {showColonyDirectory && (
                <div className="mars-colony-directory">
                  <div className="mars-colony-directory-heading">
                    <div>
                      <span className="mars-section-label">
                        COLONY DIRECTORY
                      </span>

                      <h3>Explore Mars Colonies</h3>
                    </div>

                    <button
                      type="button"
                      disabled={directoryLoading}
                      onClick={() =>
                        void loadColonyDirectory()
                      }
                    >
                      Refresh
                    </button>
                  </div>

                  {directoryLoading && (
                    <div className="mars-colony-state">
                      Synchronizing Colony directory...
                    </div>
                  )}

                  {!directoryLoading &&
                    directoryError && (
                      <div className="mars-colony-state mars-state-error">
                        {directoryError}
                      </div>
                    )}

                  {!directoryLoading &&
                    !directoryError &&
                    colonyDirectory.length === 0 && (
                      <div className="mars-colony-state">
                        No active Colonies have been
                        established yet.
                      </div>
                    )}

                  {!directoryLoading &&
                    !directoryError &&
                    colonyDirectory.length > 0 && (
                      <div className="mars-colony-directory-grid">
                        {colonyDirectory.map((colony) => {
                          const isPending =
                            pendingJoinRequest?.colony_id ===
                            colony.colony_id;

                          const joining =
                            joiningColonyId ===
                            colony.colony_id;

                          return (
                            <article
                              className="mars-colony-directory-card"
                              key={colony.colony_id}
                            >
                              <div>
                                <span>
                                  {colony.colony_code}
                                </span>

                                <strong>
                                  {colony.colony_status.toUpperCase()}
                                </strong>
                              </div>

                              <h4>
                                {colony.colony_name}
                              </h4>

                              <p>
                                {colony.specialization.toUpperCase()}
                              </p>

                              <dl>
                                <div>
                                  <dt>Members</dt>
                                  <dd>
                                    {colony.member_count.toLocaleString()}
                                  </dd>
                                </div>

                                <div>
                                  <dt>Contribution</dt>
                                  <dd>
                                    {colony.total_contribution.toLocaleString()}
                                  </dd>
                                </div>
                              </dl>

                              <button
                                type="button"
                                disabled={
                                  joiningColonyId !== null ||
                                  isPending
                                }
                                onClick={() =>
                                  void handleRequestJoinColony(
                                    colony.colony_id,
                                  )
                                }
                              >
                                {isPending
                                  ? "Request Pending"
                                  : joining
                                    ? "Requesting..."
                                    : "Request to Join"}
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                </div>
              )}

              {pendingJoinRequest && (
                <div className="mars-colony-request-status">
                  <strong>Join Request Pending</strong>

                  <p>
                    Your membership request for{" "}
                    {pendingJoinRequest.colony_name} is
                    awaiting Colony leadership approval.
                  </p>
                </div>
              )}

              {colonyActionError && (
                <div className="mars-colony-action-error">
                  {colonyActionError}
                </div>
              )}
            </div>
          )}

        {!colonyLoading &&
          !colonyError &&
          myColony && (
            <div className="mars-colony-card">
              <div className="mars-colony-primary">
                <span>{myColony.colony_code}</span>

                <h3>{myColony.colony_name}</h3>

                <p>
                  {myColony.specialization.toUpperCase()}
                </p>
              </div>

              {["founder", "leader"].includes(
                myColony.my_role,
              ) && (
                <div className="mars-colony-management">
                  <div className="mars-colony-management-heading">
                    <div>
                      <span className="mars-section-label">
                        COLONY MANAGEMENT
                      </span>

                      <h4>Pending Join Requests</h4>
                    </div>

                    <button
                      type="button"
                      disabled={joinRequestsLoading}
                      onClick={() =>
                        void loadColonyJoinRequests()
                      }
                    >
                      {joinRequestsLoading
                        ? "Loading..."
                        : "Load Requests"}
                    </button>
                  </div>

                  {joinRequestsError && (
                    <div className="mars-colony-action-error">
                      {joinRequestsError}
                    </div>
                  )}

                  {!joinRequestsLoading &&
                    !joinRequestsError &&
                    colonyJoinRequests.length === 0 && (
                      <div className="mars-colony-state">
                        No pending membership requests.
                      </div>
                    )}

                  {colonyJoinRequests.length > 0 && (
                    <div className="mars-colony-request-list">
                      {colonyJoinRequests.map(
                        (request) => {
                          const resolving =
                            resolvingJoinRequestId ===
                            request.membership_id;

                          return (
                            <article
                              className="mars-colony-request-item"
                              key={request.membership_id}
                            >
                              <div>
                                <span>BUILDER</span>

                                <strong>
                                  {request.builder_id}
                                </strong>

                                <small>
                                  {request.membership_status.toUpperCase()}
                                </small>
                              </div>

                              <div className="mars-colony-request-actions">
                                <button
                                  type="button"
                                  disabled={
                                    resolvingJoinRequestId !==
                                    null
                                  }
                                  onClick={() =>
                                    void handleApproveJoinRequest(
                                      request.membership_id,
                                    )
                                  }
                                >
                                  {resolving
                                    ? "Processing..."
                                    : "Approve"}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    resolvingJoinRequestId !==
                                    null
                                  }
                                  onClick={() =>
                                    void handleRejectJoinRequest(
                                      request.membership_id,
                                    )
                                  }
                                >
                                  Reject
                                </button>
                              </div>
                            </article>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mars-colony-members">
                <div className="mars-colony-members-heading">
                  <div>
                    <span className="mars-section-label">
                      COLONY MEMBERS
                    </span>

                    <h4>
                      Active Builders
                    </h4>
                  </div>

                  <button
                    type="button"
                    disabled={membersLoading}
                    onClick={() =>
                      void loadColonyMembers()
                    }
                  >
                    {membersLoading
                      ? "Loading..."
                      : "Refresh Members"}
                  </button>
                </div>

                {membersError && (
                  <div className="mars-colony-action-error">
                    {membersError}
                  </div>
                )}

                {membersLoading &&
                  colonyMembers.length === 0 && (
                    <div className="mars-colony-state">
                      Synchronizing Colony members...
                    </div>
                  )}

                {!membersLoading &&
                  !membersError &&
                  colonyMembers.length === 0 && (
                    <div className="mars-colony-state">
                      No active Colony members found.
                    </div>
                  )}

                {colonyMembers.length > 0 && (
                  <div className="mars-colony-member-list">
                    {colonyMembers.map((member) => {
                      const isCurrentBuilder =
                        member.builder_id ===
                        currentBuilderId;

                      const isCurrentLeader =
                        myColony.leader_builder_id ===
                        currentBuilderId;

                      const processing =
                        memberActionBuilderId ===
                        member.builder_id;

                      const visibleName =
                        member.display_name?.trim() ||
                        member.username?.trim() ||
                        "BOBU Builder";

                      return (
                        <article
                          className="mars-colony-member-card"
                          key={member.membership_id}
                        >
                          <div className="mars-colony-member-identity">
                            <div>
                              <strong>
                                {visibleName}
                              </strong>

                              {member.username && (
                                <span>
                                  @{member.username}
                                </span>
                              )}
                            </div>

                            <span
                              className={`mars-colony-role mars-colony-role-${member.membership_role}`}
                            >
                              {member.membership_role.toUpperCase()}
                            </span>
                          </div>

                          <div className="mars-colony-member-meta">
                            <span>
                              Builder
                            </span>

                            <strong>
                              {member.builder_id}
                            </strong>

                            <span>
                              Joined
                            </span>

                            <strong>
                              {member.joined_at
                                ? new Date(
                                    member.joined_at,
                                  ).toLocaleDateString()
                                : "—"}
                            </strong>
                          </div>

                          {isCurrentBuilder && (
                            <div className="mars-colony-member-you">
                              YOU
                            </div>
                          )}

                          {isCurrentLeader &&
                            !isCurrentBuilder && (
                              <div className="mars-colony-member-actions">
                                {member.membership_role ===
                                  "member" && (
                                  <button
                                    type="button"
                                    disabled={
                                      memberActionBuilderId !==
                                      null
                                    }
                                    onClick={() =>
                                      void handlePromoteOfficer(
                                        member.builder_id,
                                      )
                                    }
                                  >
                                    {processing
                                      ? "Processing..."
                                      : "Promote Officer"}
                                  </button>
                                )}

                                {member.membership_role ===
                                  "officer" && (
                                  <button
                                    type="button"
                                    disabled={
                                      memberActionBuilderId !==
                                      null
                                    }
                                    onClick={() =>
                                      void handleDemoteOfficer(
                                        member.builder_id,
                                      )
                                    }
                                  >
                                    {processing
                                      ? "Processing..."
                                      : "Demote Officer"}
                                  </button>
                                )}

                                {member.membership_role !==
                                  "founder" && (
                                  <button
                                    type="button"
                                    disabled={
                                      memberActionBuilderId !==
                                      null
                                    }
                                    onClick={() =>
                                      void handleTransferLeadership(
                                        member.builder_id,
                                      )
                                    }
                                  >
                                    Transfer Leadership
                                  </button>
                                )}
                              </div>
                            )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mars-colony-stats">
                <div>
                  <span>Role</span>
                  <strong>
                    {myColony.my_role.toUpperCase()}
                  </strong>
                </div>

                <div>
                  <span>Members</span>
                  <strong>
                    {myColony.member_count.toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>Contribution</span>
                  <strong>
                    {myColony.total_contribution.toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {myColony.colony_status.toUpperCase()}
                  </strong>
                </div>

                <div>
                  <span>Sector</span>
                  <strong>
                    {myColony.active_sector_name ??
                      "UNASSIGNED"}
                  </strong>
                </div>
              </div>

              <div className="mars-colony-lifecycle">
                {["member", "officer"].includes(
                  myColony.my_role,
                ) && (
                  <button
                    type="button"
                    className="mars-colony-leave-button"
                    disabled={leavingColony}
                    onClick={() =>
                      void handleLeaveColony()
                    }
                  >
                    {leavingColony
                      ? "Leaving Colony..."
                      : "Leave Colony"}
                  </button>
                )}

                {myColony.my_role === "leader" && (
                  <p>
                    Transfer Colony leadership before leaving.
                  </p>
                )}

                {myColony.my_role === "founder" && (
                  <p>
                    Founder membership cannot be abandoned
                    directly. Transfer Colony control first.
                  </p>
                )}
              </div>
            </div>
          )}
      </section>

      <section className="mars-colony-base-section">
          <div className="mars-colony-base-heading">
            <div>
              <span className="mars-section-label">
                COLONY BASE
              </span>

              <h2>
                {myColony
                  ? `${myColony.colony_name} Base`
                  : "Colony Base"}
              </h2>

              <p>
                {myColony
                  ? "Construct and expand permanent Colony infrastructure on the Mars surface."
                  : "Establish or join a Mars Colony to activate your planetary base."}
              </p>
            </div>

            <div className="mars-colony-base-summary">
              <span>
                {myColony ? "STRUCTURES" : "BASE STATUS"}
              </span>

              <strong>
                {myColony
                  ? `${colonyBase.filter(
                      (building) => building.built,
                    ).length} / ${colonyBase.length}`
                  : "OFFLINE"}
              </strong>
            </div>
          </div>

          {!myColony && (
            <div className="mars-colony-base-locked">
              <div className="mars-colony-base-lock-copy">
                <span>BASE OFFLINE</span>

                <strong>
                  Establish a Colony to activate your Mars Base
                </strong>

                <p>
                  Command Hub, Habitat, Energy, Water, and Science Lab
                  infrastructure will become available after Colony activation.
                </p>
              </div>

              <div className="mars-colony-base-lock-grid">
                {[
                  "COMMAND HUB",
                  "HABITAT",
                  "ENERGY",
                  "WATER",
                  "SCIENCE LAB",
                ].map((building) => (
                  <div
                    key={building}
                    className="mars-colony-base-lock-card"
                  >
                    <span>{building}</span>
                    <small>LOCKED</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myColony && baseLoading && (
            <div className="mars-colony-base-state">
              Synchronizing Colony Base...
            </div>
          )}

          {myColony && !baseLoading && baseError && (
            <div className="mars-colony-base-state mars-state-error">
              {baseError}
            </div>
          )}

          {myColony &&
            !baseLoading &&
            !baseError &&
            colonyBase.length > 0 && (
              <>
                {colonyResources && (
                <div className="mars-colony-resources">
                  {[
                    ["MATERIALS", colonyResources.materials],
                    ["ENERGY", colonyResources.energy],
                    ["WATER", colonyResources.water],
                    ["SCIENCE", colonyResources.science],
                    ["FOOD", colonyResources.food],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="mars-colony-resource"
                    >
                      <span>{label}</span>
                      <strong>
                        {Number(value).toLocaleString()}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              {resourceProduction && (
                <div className="mars-colony-production">
                  <div className="mars-colony-production-header">
                    <div>
                      <span>COLONY PRODUCTION</span>
                      <strong>Resource Production Online</strong>
                    </div>

                    {["founder", "leader"].includes(
                      myColony.my_role,
                    ) && (
                      <button
                        type="button"
                        disabled={
                          claimingResources ||
                          (
                            resourceProduction.claimable_materials <= 0 &&
                            resourceProduction.claimable_energy <= 0 &&
                            resourceProduction.claimable_water <= 0 &&
                            resourceProduction.claimable_science <= 0 &&
                            resourceProduction.claimable_food <= 0
                          )
                        }
                        onClick={() =>
                          void handleClaimResources()
                        }
                      >
                        {claimingResources
                          ? "Collecting..."
                          : "Collect Resources"}
                      </button>
                    )}
                  </div>

                  <div className="mars-colony-production-grid">
                    {[
                      [
                        "MATERIALS",
                        resourceProduction.materials_per_hour,
                        resourceProduction.claimable_materials,
                      ],
                      [
                        "ENERGY",
                        resourceProduction.energy_per_hour,
                        resourceProduction.claimable_energy,
                      ],
                      [
                        "WATER",
                        resourceProduction.water_per_hour,
                        resourceProduction.claimable_water,
                      ],
                      [
                        "SCIENCE",
                        resourceProduction.science_per_hour,
                        resourceProduction.claimable_science,
                      ],
                      [
                        "FOOD",
                        resourceProduction.food_per_hour,
                        resourceProduction.claimable_food,
                      ],
                    ].map(([label, rate, claimable]) => (
                      <div
                        key={String(label)}
                        className="mars-colony-production-resource"
                      >
                        <span>{label}</span>

                        <strong>
                          +{Number(claimable).toLocaleString()}
                        </strong>

                        <small>
                          {Number(rate).toLocaleString()} / HOUR
                        </small>
                      </div>
                    ))}
                  </div>

                  <div className="mars-colony-production-meta">
                    <span>
                      ACCRUED{" "}
                      {Math.floor(
                        resourceProduction.accrued_seconds / 3600,
                      )}
                      H{" "}
                      {Math.floor(
                        (resourceProduction.accrued_seconds % 3600) / 60,
                      )}
                      M
                    </span>

                    <span>
                      MAX{" "}
                      {Math.floor(
                        resourceProduction.max_accrual_seconds / 3600,
                      )}
                      H
                    </span>
                  </div>
                </div>
              )}

              <div className="mars-base-surface">
                <div className="mars-base-horizon" />
                <div className="mars-base-ridge mars-base-ridge-a" />
                <div className="mars-base-ridge mars-base-ridge-b" />
                <div className="mars-base-crater mars-base-crater-a" />
                <div className="mars-base-crater mars-base-crater-b" />

                {colonyBase.map((building) => {
                  const positionClass =
                    `mars-base-building-${building.building_key}`;

                  const constructionCost =
                    constructionCosts.find(
                      (candidate) =>
                        candidate.building_key ===
                        building.building_key,
                    ) ?? null;

                  const hasConstructionResources =
                    constructionCost !== null &&
                    colonyResources !== null &&
                    colonyResources.materials >=
                      constructionCost.materials_cost &&
                    colonyResources.energy >=
                      constructionCost.energy_cost &&
                    colonyResources.water >=
                      constructionCost.water_cost &&
                    colonyResources.science >=
                      constructionCost.science_cost &&
                    colonyResources.food >=
                      constructionCost.food_cost;

                  const canConstruct =
                    !building.built &&
                    constructionCost !== null &&
                    ["founder", "leader"].includes(
                      myColony.my_role,
                    );

                  const constructing =
                    constructingBuildingKey ===
                    building.building_key;

                  const upgrade =
                    buildingUpgrades.find(
                      (candidate) =>
                        candidate.building_key ===
                        building.building_key,
                    ) ?? null;

                  const canManage =
                    ["founder", "leader"].includes(
                      myColony.my_role,
                    );

                  const upgrading =
                    upgradingBuildingKey ===
                    building.building_key;

                  return (
                    <article
                      key={building.building_key}
                      className={`mars-base-building ${positionClass}${
                        building.built
                          ? " mars-base-building-built"
                          : " mars-base-building-ghost"
                      }`}
                    >
                      <div className="mars-base-building-visual">
                        <div className="mars-base-building-body" />
                        <div className="mars-base-building-light" />
                      </div>

                      <div className="mars-base-building-info">
                        <span>
                          {building.building_category.toUpperCase()}
                        </span>

                        <strong>
                          {building.building_name}
                        </strong>

                        <small>
                          {building.built
                            ? `LEVEL ${building.building_level}`
                            : "NOT CONSTRUCTED"}
                        </small>

                        {canConstruct && constructionCost && (
                          <div className="mars-building-upgrade">
                            <div className="mars-building-upgrade-cost">
                              <span>CONSTRUCTION COST</span>

                              <small>
                                M {constructionCost.materials_cost.toLocaleString()}
                                {" · "}
                                E {constructionCost.energy_cost.toLocaleString()}
                                {" · "}
                                W {constructionCost.water_cost.toLocaleString()}
                                {" · "}
                                S {constructionCost.science_cost.toLocaleString()}
                                {" · "}
                                F {constructionCost.food_cost.toLocaleString()}
                              </small>
                            </div>

                            <button
                              type="button"
                              disabled={
                                constructingBuildingKey !== null ||
                                upgradingBuildingKey !== null ||
                                !hasConstructionResources
                              }
                              onClick={() =>
                                void handleConstructBuilding(
                                  building.building_key,
                                )
                              }
                            >
                              {constructing
                                ? "Constructing..."
                                : hasConstructionResources
                                  ? "Construct"
                                  : "Insufficient Resources"}
                            </button>
                          </div>
                        )}

                        {building.built && upgrade && (
                          <div className="mars-building-upgrade">
                            {upgrade.can_upgrade ? (
                              <>
                                <div className="mars-building-upgrade-cost">
                                  <span>
                                    NEXT LEVEL {upgrade.next_level}
                                  </span>

                                  <small>
                                    M {upgrade.materials_cost.toLocaleString()}
                                    {" · "}
                                    E {upgrade.energy_cost.toLocaleString()}
                                    {" · "}
                                    W {upgrade.water_cost.toLocaleString()}
                                    {" · "}
                                    S {upgrade.science_cost.toLocaleString()}
                                    {" · "}
                                    F {upgrade.food_cost.toLocaleString()}
                                  </small>
                                </div>

                                {canManage && (
                                  <button
                                    type="button"
                                    disabled={
                                      upgradingBuildingKey !== null ||
                                      constructingBuildingKey !== null
                                    }
                                    onClick={() =>
                                      void handleUpgradeBuilding(
                                        building.building_key,
                                      )
                                    }
                                  >
                                    {upgrading
                                      ? "Upgrading..."
                                      : `Upgrade to Level ${upgrade.next_level}`}
                                  </button>
                                )}
                              </>
                            ) : (
                              <small>MAX LEVEL</small>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              </>
            )}

          {myColony &&
            !baseLoading &&
            !baseError &&
            colonyBase.length === 0 && (
              <div className="mars-colony-base-state">
                Colony Base infrastructure is not available.
              </div>
            )}
      </section>

      <section className="mars-sector-network">
        <div className="mars-sector-heading">
          <div>
            <span className="mars-section-label">
              MARS SECTORS
            </span>

            <h2>Sector Network</h2>

            <p>
              Explore active Mars Sectors and establish your
              Colony inside one operational region.
            </p>
          </div>

          <Rocket size={26} />
        </div>

        {sectorsLoading && (
          <div className="mars-sector-state">
            Synchronizing Mars Sectors...
          </div>
        )}

        {!sectorsLoading && sectorsError && (
          <div className="mars-sector-state mars-state-error">
            {sectorsError}
          </div>
        )}

        {!sectorsLoading &&
          !sectorsError &&
          sectors.length === 0 && (
            <div className="mars-sector-state">
              No active Mars Sectors are currently available.
            </div>
          )}

        {!sectorsLoading &&
          !sectorsError &&
          sectors.length > 0 && (
            <div className="mars-map-shell">
              <div className="mars-map-heading">
                <div>
                  <span className="mars-section-label">
                    INTERACTIVE MARS MAP
                  </span>

                  <h3>Operational Surface</h3>

                  <p>
                    Explore live Mars Sectors and monitor Colony
                    expansion across the surface.
                  </p>
                </div>

                <div className="mars-map-summary">
                  <span>ACTIVE SECTORS</span>
                  <strong>{sectors.length}</strong>
                </div>
              </div>

              <div
                className="mars-map"
                role="img"
                aria-label="Interactive BUILD MARS sector map"
              >
                <div className="mars-map-planet-glow" />
                <div className="mars-map-crater mars-map-crater-a" />
                <div className="mars-map-crater mars-map-crater-b" />
                <div className="mars-map-crater mars-map-crater-c" />
                <div className="mars-map-ridge mars-map-ridge-a" />
                <div className="mars-map-ridge mars-map-ridge-b" />

                <svg
                  className="mars-map-network"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M28 30 L50 39 L73 28" />
                  <path d="M50 39 L79 51 L67 69" />
                  <path d="M50 39 L35 67 L67 69" />
                  <path d="M35 67 L28 30" />
                  <path d="M73 28 L79 51" />
                </svg>

                {sectors.map((sector) => {
                  if (
                    sector.map_x === null ||
                    sector.map_y === null
                  ) {
                    return null;
                  }

                  const isCurrentSector =
                    myColony?.active_sector_id ===
                    sector.sector_id;

                  const capacityPercent =
                    sector.max_colonies > 0
                      ? Math.min(
                          (sector.current_colonies /
                            sector.max_colonies) *
                            100,
                          100,
                        )
                      : 0;

                  return (
                    <button
                      key={sector.sector_id}
                      type="button"
                      className={`mars-map-node${
                        isCurrentSector
                          ? " mars-map-node-current"
                          : ""
                      }${
                        selectedSectorId ===
                        sector.sector_id
                          ? " mars-map-node-selected"
                          : ""
                      }`}
                      style={{
                        left: `${sector.map_x}%`,
                        top: `${sector.map_y}%`,
                      }}
                      title={`${sector.sector_name} — ${sector.current_colonies}/${sector.max_colonies} Colonies`}
                      onClick={() => {
                        setSelectedSectorId(
                          sector.sector_id,
                        );
                      }}
                    >
                      <span className="mars-map-node-pulse" />

                      <span className="mars-map-node-core" />

                      <span className="mars-map-node-label">
                        <strong>
                          {sector.sector_code}
                        </strong>

                        <small>
                          {sector.current_colonies}
                          {" / "}
                          {sector.max_colonies}
                        </small>

                        <span className="mars-map-node-capacity">
                          <i
                            style={{
                              width: `${capacityPercent}%`,
                            }}
                          />
                        </span>
                      </span>
                    </button>
                  );
                })}

                {selectedSector && (
                  <div className="mars-map-sector-detail">
                    <div className="mars-map-sector-detail-top">
                      <div>
                        <span>
                          {selectedSector.sector_code}
                        </span>

                        <strong>
                          {selectedSector.sector_name}
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSectorId(null)
                        }
                        aria-label="Close sector details"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mars-map-sector-detail-grid">
                      <div>
                        <span>Colonies</span>
                        <strong>
                          {selectedSector.current_colonies}
                          {" / "}
                          {selectedSector.max_colonies}
                        </strong>
                      </div>

                      <div>
                        <span>Contribution</span>
                        <strong>
                          {selectedSector.total_contribution.toLocaleString()}
                        </strong>
                      </div>

                      <div>
                        <span>Status</span>
                        <strong>
                          {selectedSector.sector_status.toUpperCase()}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mars-map-sector-jump"
                      onClick={() => {
                        const target =
                          document.getElementById(
                            `mars-sector-${selectedSector.sector_id}`,
                          );

                        target?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }}
                    >
                      View Sector Controls
                    </button>
                  </div>
                )}

                <div className="mars-map-legend">
                  <span>
                    <i className="mars-map-legend-node" />
                    Sector
                  </span>

                  <span>
                    <i className="mars-map-legend-current" />
                    Your Colony Sector
                  </span>
                </div>
              </div>
            </div>
          )}

        {!sectorsLoading &&
          !sectorsError &&
          sectors.length > 0 && (
            <div className="mars-sector-grid">
              {sectors.map((sector) => {
                const capacityPercent =
                  sector.max_colonies > 0
                    ? Math.min(
                        (sector.current_colonies /
                          sector.max_colonies) *
                          100,
                        100,
                      )
                    : 0;

                const isLeader =
                  Boolean(
                    myColony &&
                      currentBuilderId &&
                      myColony.leader_builder_id ===
                        currentBuilderId,
                  );

                const hasActiveSector =
                  Boolean(myColony?.active_sector_id);

                const isCurrentSector =
                  myColony?.active_sector_id ===
                  sector.sector_id;

                const capacityReached =
                  sector.current_colonies >=
                  sector.max_colonies;

                const assigning =
                  assigningSectorId === sector.sector_id;

                return (
                  <article
                    id={`mars-sector-${sector.sector_id}`}
                    className="mars-sector-card"
                    key={sector.sector_id}
                  >
                    <div className="mars-sector-card-top">
                      <span>{sector.sector_code}</span>

                      <strong>
                        {sector.sector_status.toUpperCase()}
                      </strong>
                    </div>

                    <h3>{sector.sector_name}</h3>

                    <div className="mars-sector-capacity">
                      <div>
                        <span>Colonies</span>

                        <strong>
                          {sector.current_colonies.toLocaleString()}
                          {" / "}
                          {sector.max_colonies.toLocaleString()}
                        </strong>
                      </div>

                      <div className="mars-progress">
                        <div
                          className="mars-progress-fill"
                          style={{
                            width: `${capacityPercent}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mars-sector-contribution">
                      <span>Sector Contribution</span>

                      <strong>
                        {sector.total_contribution.toLocaleString()}
                      </strong>
                    </div>

                    {isLeader &&
                      !hasActiveSector && (
                        <button
                          className="mars-sector-assign"
                          type="button"
                          disabled={
                            capacityReached ||
                            assigningSectorId !== null
                          }
                          onClick={() =>
                            void handleAssignSector(
                              sector.sector_id,
                            )
                          }
                        >
                          {assigning
                            ? "Assigning..."
                            : capacityReached
                              ? "Sector Full"
                              : "Assign Colony"}
                        </button>
                      )}

                    {isLeader &&
                      isCurrentSector && (
                        <button
                          className="mars-sector-assign"
                          type="button"
                          disabled
                        >
                          Current Sector
                        </button>
                      )}
                  </article>
                );
              })}
            </div>
          )}

        {sectorActionError && (
          <div className="mars-sector-action-error">
            {sectorActionError}
          </div>
        )}

        {myColony &&
          currentBuilderId &&
          myColony.leader_builder_id !==
            currentBuilderId && (
            <div className="mars-sector-permission">
              Sector assignment is controlled by the active
              Colony Leader.
            </div>
          )}
      </section>
    </main>
  );
}
