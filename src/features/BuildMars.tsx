import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../core/language";
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

const MarsPlanetMap = lazy(() =>
  import("../core/mars/planetmap/MarsPlanetMap").then(
    (module) => ({
      default: module.MarsPlanetMap,
    }),
  ),
);

export function BuildMars() {
  const { t } = useLanguage();

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

  const [enteredSectorId, setEnteredSectorId] =
    useState<string | null>(null);

  const [sectorDiveActive, setSectorDiveActive] =
    useState(false);

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
            t("mars.error.accessUnavailable"),
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
            t("mars.error.civilizationUnavailable"),
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
            t("mars.error.colonyUnavailable"),
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
        t("mars.error.directoryUnavailable"),
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
          : t("mars.error.colonyCreationFailed"),
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
          : t("mars.error.joinRequestFailed"),
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
        t("mars.error.sectorsUnavailable"),
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
          : t("mars.error.sectorAssignmentFailed");

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
          : t("mars.error.joinRequestsUnavailable"),
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
          : t("mars.error.approveRequestFailed"),
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
          : t("mars.error.rejectRequestFailed"),
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
      t("mars.colony.leaveConfirm", {
        colony: myColony.colony_name,
      }),
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

  const handleEnterSector = (
    sectorId: string,
  ) => {
    if (sectorDiveActive) {
      return;
    }

    setSectorDiveActive(true);

    /*
     * Orbital dive:
     * keep the 3D planet visible while the
     * transition closes around the viewport.
     */
    window.setTimeout(() => {
      setEnteredSectorId(
        sectorId,
      );
    }, 5550);

    window.setTimeout(() => {
      setSectorDiveActive(false);
    }, 6500);
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
          {accessError ?? t("mars.error.accessUnavailableShort")}
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
            {t("mars.kicker")}
          </div>

          <h1>{t("mars.title")}</h1>

          <p>{t("mars.access.description")}</p>
        </section>

        <section className="mars-access-panel">
          <span className="mars-section-label">
            MARS ACCESS
          </span>

          <h2>{t("mars.access.locked")}</h2>

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
            {t("mars.access.unlockDescription")}
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
          {error ?? t("mars.error.civilizationUnavailableShort")}
        </div>
      </main>
    );
  }

  const metrics = [
    [t("mars.metric.energy"), overview.energy, Zap],
    [t("mars.metric.water"), overview.water, Droplets],
    [t("mars.metric.habitats"), overview.habitats, House],
    [t("mars.metric.science"), overview.science, Atom],
    [t("mars.metric.exploration"), overview.exploration, Rocket],
    [t("mars.metric.security"), overview.security, Shield],
  ] as const;

  return (
    <main className="mars-page">
      <section className="mars-hero">
        <div className="mars-kicker">
          {t("mars.kicker")}
        </div>

        <h1>{t("mars.title")}</h1>

        <p>{t("mars.hero.description")}</p>

        <div className="mars-population">
          <Users size={22} />

          <strong>
            {overview.builders_joined.toLocaleString()}
          </strong>

          <span>/</span>

          <strong>
            {overview.target_builder_count.toLocaleString()}
          </strong>

          <span>{t("mars.builders")}</span>
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
            {t("mars.unlock.label")}
          </span>

          <h2>
            {overview.next_unlock_key
              ? t(`mars.unlock.${overview.next_unlock_key}`)
              : t("mars.unlock.awaitingObjective")}
          </h2>

          <p>
            {overview.next_unlock_status === "locked"
              ? t("mars.common.locked")
              : overview.next_unlock_status
                ? t(`mars.status.${overview.next_unlock_status}`)
                : t("mars.common.unknown")}
          </p>
        </div>

        {overview.next_unlock_required_builders !== null && (
          <div className="mars-unlock-progress">
            <strong>
              {overview.builders_joined.toLocaleString()}
              {" / "}
              {overview.next_unlock_required_builders.toLocaleString()}
            </strong>

            <span>{t("mars.builders")}</span>

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
          <span>{t("mars.contribution.total")}</span>

          <strong>
            {overview.total_contribution.toLocaleString()}
          </strong>
        </div>
      </section>

      <section className="mars-colony-network">
        <div className="mars-colony-heading">
          <div>
            <span className="mars-section-label">
              {t("mars.colony.network")}
            </span>

            <h2>{t("mars.colony.myColony")}</h2>
          </div>

          <Users size={26} />
        </div>

        {colonyLoading && (
          <div className="mars-colony-state">
            {t("mars.colony.syncNetwork")}
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
                <strong>{t("mars.colony.none")}</strong>

                <p>{t("mars.colony.emptyDescription")}</p>

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

                  <h3>{t("mars.colony.establishTitle")}</h3>

                  <label>
                    Colony Name
                    <input
                      type="text"
                      value={newColonyName}
                      maxLength={48}
                      disabled={creatingColony}
                      placeholder={t("mars.colony.namePlaceholder")}
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
                      ? t("mars.colony.establishing")
                      : t("mars.colony.establish")}
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

                      <h3>{t("mars.colony.exploreTitle")}</h3>
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
                      {t("mars.colony.syncDirectory")}
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
                        {t("mars.colony.directoryEmpty")}
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
                                  {t(`mars.status.${colony.colony_status}`)}
                                </strong>
                              </div>

                              <h4>
                                {colony.colony_name}
                              </h4>

                              <p>
                                {t(`mars.specialization.${colony.specialization}`)}
                              </p>

                              <dl>
                                <div>
                                  <dt>{t("mars.common.members")}</dt>
                                  <dd>
                                    {colony.member_count.toLocaleString()}
                                  </dd>
                                </div>

                                <div>
                                  <dt>{t("mars.common.contribution")}</dt>
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
                                  ? t("mars.colony.requestPending")
                                  : joining
                                    ? t("mars.colony.requesting")
                                    : t("mars.colony.requestToJoin")}
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
                  <strong>{t("mars.colony.joinPending")}</strong>

                  <p>
                    {t("mars.colony.joinPendingDescription", {
                      colony: pendingJoinRequest.colony_name,
                    })}
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
                  {t(`mars.specialization.${myColony.specialization}`)}
                </p>
              </div>

              {["founder", "leader"].includes(
                myColony.my_role,
              ) && (
                <div className="mars-colony-management">
                  <div className="mars-colony-management-heading">
                    <div>
                      <span className="mars-section-label">
                        {t("mars.colony.management")}
                      </span>

                      <h4>{t("mars.colony.pendingRequests")}</h4>
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
                        : t("mars.colony.loadRequests")}
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
                        {t("mars.colony.noPendingRequests")}
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
                                <span>{t("mars.member.builder")}</span>

                                <strong>
                                  {request.builder_id}
                                </strong>

                                <small>
                                  {t(`mars.status.${request.membership_status}`)}
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
                      {t("mars.colony.members")}
                    </span>

                    <h4>
                      {t("mars.colony.activeBuilders")}
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
                      : t("mars.colony.refreshMembers")}
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
                      {t("mars.colony.noActiveMembers")}
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
                        t("mars.member.defaultBuilder");

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
                              {t(`mars.role.${member.membership_role}`)}
                            </span>
                          </div>

                          <div className="mars-colony-member-meta">
                            <span>{t("mars.member.builder")}</span>

                            <strong>
                              {member.builder_id}
                            </strong>

                            <span>{t("mars.member.joined")}</span>

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
                              {t("mars.member.you")}
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
                                      ? t("mars.common.processing")
                                      : t("mars.member.promoteOfficer")}
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
                                      ? t("mars.common.processing")
                                      : t("mars.member.demoteOfficer")}
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
                                    {t("mars.member.transferLeadership")}
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
                  <span>{t("mars.common.role")}</span>
                  <strong>
                    {t(`mars.role.${myColony.my_role}`)}
                  </strong>
                </div>

                <div>
                  <span>{t("mars.common.members")}</span>
                  <strong>
                    {myColony.member_count.toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>{t("mars.common.contribution")}</span>
                  <strong>
                    {myColony.total_contribution.toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>{t("mars.common.status")}</span>
                  <strong>
                    {t(`mars.status.${myColony.colony_status}`)}
                  </strong>
                </div>

                <div>
                  <span>{t("mars.common.sector")}</span>
                  <strong>
                    {myColony.active_sector_name ??
                      t("mars.common.unassigned")}
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
                      ? t("mars.colony.leaving")
                      : t("mars.colony.leave")}
                  </button>
                )}

                {myColony.my_role === "leader" && (
                  <p>
                    {t("mars.colony.transferBeforeLeaving")}
                  </p>
                )}

                {myColony.my_role === "founder" && (
                  <p>
                    {t("mars.colony.founderCannotLeave")}
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
                {t("mars.base.label")}
              </span>

              <h2>
                {myColony
                  ? t("mars.base.namedBase", {
                      name: myColony.colony_name,
                    })
                  : t("mars.base.title")}
              </h2>

              <p>
                {myColony
                  ? t("mars.base.activeDescription")
                  : t("mars.base.inactiveDescription")}
              </p>
            </div>

            <div className="mars-colony-base-summary">
              <span>
                {myColony
                  ? t("mars.base.structures")
                  : t("mars.base.status")}
              </span>

              <strong>
                {myColony
                  ? `${colonyBase.filter(
                      (building) => building.built,
                    ).length} / ${colonyBase.length}`
                  : t("mars.common.offline")}
              </strong>
            </div>
          </div>

          {!myColony && (
            <div className="mars-colony-base-locked">
              <div className="mars-colony-base-lock-copy">
                <span>{t("mars.base.offline")}</span>

                <strong>
                  {t("mars.base.activateTitle")}
                </strong>

                <p>
                  {t("mars.base.activateDescription")}
                </p>
              </div>

              <div className="mars-colony-base-lock-grid">
                {[
                  t("mars.building.commandHub"),
                  t("mars.building.habitat"),
                  t("mars.resource.energy"),
                  t("mars.resource.water"),
                  t("mars.building.scienceLab"),
                ].map((building) => (
                  <div
                    key={building}
                    className="mars-colony-base-lock-card"
                  >
                    <span>{building}</span>
                    <small>{t("mars.common.locked")}</small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myColony && baseLoading && (
            <div className="mars-colony-base-state">
              {t("mars.base.synchronizing")}
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
                    [t("mars.resource.materials"), colonyResources.materials],
                    [t("mars.resource.energy"), colonyResources.energy],
                    [t("mars.resource.water"), colonyResources.water],
                    [t("mars.resource.science"), colonyResources.science],
                    [t("mars.resource.food"), colonyResources.food],
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
                      <span>{t("mars.production.label")}</span>
                      <strong>{t("mars.production.online")}</strong>
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
                          ? t("mars.production.collecting")
                          : t("mars.production.collect")}
                      </button>
                    )}
                  </div>

                  <div className="mars-colony-production-grid">
                    {[
                      [
                        t("mars.resource.materials"),
                        resourceProduction.materials_per_hour,
                        resourceProduction.claimable_materials,
                      ],
                      [
                        t("mars.resource.energy"),
                        resourceProduction.energy_per_hour,
                        resourceProduction.claimable_energy,
                      ],
                      [
                        t("mars.resource.water"),
                        resourceProduction.water_per_hour,
                        resourceProduction.claimable_water,
                      ],
                      [
                        t("mars.resource.science"),
                        resourceProduction.science_per_hour,
                        resourceProduction.claimable_science,
                      ],
                      [
                        t("mars.resource.food"),
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
                          {t("mars.production.perHour", {
                            value: Number(rate).toLocaleString(),
                          })}
                        </small>
                      </div>
                    ))}
                  </div>

                  <div className="mars-colony-production-meta">
                    <span>
                      {t("mars.production.accrued")}{" "}
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
                      {t("mars.production.max")}{" "}
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
                          {t(`mars.buildingCategory.${building.building_category}`)}
                        </span>

                        <strong>
                          {building.building_name}
                        </strong>

                        <small>
                          {building.built
                            ? t("mars.building.level", {
                                level: building.building_level,
                              })
                            : t("mars.building.notConstructed")}
                        </small>

                        {canConstruct && constructionCost && (
                          <div className="mars-building-upgrade">
                            <div className="mars-building-upgrade-cost">
                              <span>{t("mars.building.constructionCost")}</span>

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
                                ? t("mars.building.constructing")
                                : hasConstructionResources
                                  ? t("mars.building.construct")
                                  : t("mars.building.insufficientResources")}
                            </button>
                          </div>
                        )}

                        {building.built && upgrade && (
                          <div className="mars-building-upgrade">
                            {upgrade.can_upgrade ? (
                              <>
                                <div className="mars-building-upgrade-cost">
                                  <span>
                                    {upgrade.next_level !== null
                                  ? t("mars.building.nextLevel", {
                                      level: upgrade.next_level,
                                    })
                                  : t("mars.building.maxLevel")}
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
                                      ? t("mars.building.upgrading")
                                      : upgrade.next_level !== null
                                      ? t("mars.building.upgradeToLevel", {
                                          level: upgrade.next_level,
                                        })
                                      : t("mars.building.maxLevel")}
                                  </button>
                                )}
                              </>
                            ) : (
                              <small>{t("mars.building.maxLevel")}</small>
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
                {t("mars.base.infrastructureUnavailable")}
              </div>
            )}
      </section>

      <section className="mars-sector-network">
        <div className="mars-sector-heading">
          <div>
            <span className="mars-section-label">
              {t("mars.sector.label")}
            </span>

            <h2>{t("mars.sector.network")}</h2>

            <p>
              {t("mars.sector.description")}
            </p>
          </div>

          <Rocket size={26} />
        </div>

        {sectorsLoading && (
          <div className="mars-sector-state">
            {t("mars.sector.synchronizing")}
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
              {t("mars.sector.noneAvailable")}
            </div>
          )}

        {!sectorsLoading &&
          !sectorsError &&
          sectors.length > 0 && (
            <>
              {!enteredSectorId && (
              <div className="mars-planet-map-section">
                <Suspense
                  fallback={
                    <div className="mars-planet-map-loading">
                      {t("mars.sector.synchronizing")}
                    </div>
                  }
                >
                  <MarsPlanetMap
                    sectors={sectors}
                    currentSectorId={
                      myColony?.active_sector_id ?? null
                    }
                    selectedSectorId={
                      selectedSectorId
                    }
                    onSelectSector={(sectorId) => {
                      setSelectedSectorId(
                        sectorId,
                      );

                      setEnteredSectorId(
                        null,
                      );
                    }}
                    onEnterSector={
                      handleEnterSector
                    }
                    diving={sectorDiveActive}
                    ariaLabel={t("mars.map.ariaLabel")}
                  />
                </Suspense>
              </div>
              )}

              {sectorDiveActive && (
                <div
                  className="mars-orbital-dive"
                  aria-hidden="true"
                >
                  <div className="mars-orbital-dive__space">
                    <div className="mars-orbital-dive__stars mars-orbital-dive__stars--a" />
                    <div className="mars-orbital-dive__stars mars-orbital-dive__stars--b" />
                    <div className="mars-orbital-dive__stars mars-orbital-dive__stars--c" />

                    <div className="mars-orbital-dive__galaxy mars-orbital-dive__galaxy--a" />
                    <div className="mars-orbital-dive__galaxy mars-orbital-dive__galaxy--b" />
                    <div className="mars-orbital-dive__nebula mars-orbital-dive__nebula--a" />
                    <div className="mars-orbital-dive__nebula mars-orbital-dive__nebula--b" />

                    <div className="mars-orbital-dive__streaks" />
                    <div className="mars-orbital-dive__vanishing-point" />

                    <div className="mars-orbital-dive__arrival">
                      <div className="mars-orbital-dive__atmosphere" />

                      <div className="mars-orbital-dive__mars-target">
                        <div className="mars-orbital-dive__mars-shade" />
                      </div>
                    </div>
                  </div>

                  <div className="mars-orbital-dive__tunnel" />
                  <div className="mars-orbital-dive__core" />
                  <div className="mars-orbital-dive__flash" />
                </div>
              )}

              {enteredSectorId !== null && (
                <div className="mars-sector-entry mars-sector-entry--arriving">
                  <div className="mars-sector-return-row">
                    <button
                      type="button"
                      className="mars-sector-return-button"
                      onClick={() => {
                        setEnteredSectorId(null);
                      }}
                    >
                      <span aria-hidden="true">←</span>
                      <span>RETURN TO ORBIT</span>
                    </button>
                  </div>

                  <div className="mars-map-shell">
              <div className="mars-map-heading">
                <div>
                  <span className="mars-section-label">
                    {t("mars.map.label")}
                  </span>

                  <h3>{t("mars.map.operationalSurface")}</h3>

                  <p>
                    {t("mars.map.description")}
                  </p>
                </div>

                <div className="mars-map-summary">
                  <span>{t("mars.map.activeSectors")}</span>
                  <strong>{sectors.length}</strong>
                </div>
              </div>

              <div
                className="mars-map"
                role="img"
                aria-label={t("mars.map.ariaLabel")}
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
                      title={t("mars.map.sectorTooltip", {
                        name: sector.sector_name,
                        current: sector.current_colonies,
                        max: sector.max_colonies,
                      })}
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
                        aria-label={t("mars.map.closeDetails")}
                      >
                        ×
                      </button>
                    </div>

                    <div className="mars-map-sector-detail-grid">
                      <div>
                        <span>{t("mars.sector.colonies")}</span>
                        <strong>
                          {selectedSector.current_colonies}
                          {" / "}
                          {selectedSector.max_colonies}
                        </strong>
                      </div>

                      <div>
                        <span>{t("mars.common.contribution")}</span>
                        <strong>
                          {selectedSector.total_contribution.toLocaleString()}
                        </strong>
                      </div>

                      <div>
                        <span>{t("mars.common.status")}</span>
                        <strong>
                          {t(`mars.status.${selectedSector.sector_status}`)}
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
                      {t("mars.sector.viewControls")}
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
                    {t("mars.sector.yourColonySector")}
                  </span>
                </div>
              </div>
            </div>
                  </div>
                )}
            </>

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
                        {t(`mars.status.${sector.sector_status}`)}
                      </strong>
                    </div>

                    <h3>{sector.sector_name}</h3>

                    <div className="mars-sector-capacity">
                      <div>
                        <span>{t("mars.sector.colonies")}</span>

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
                      <span>{t("mars.sector.contribution")}</span>

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
                            ? t("mars.sector.assigning")
                            : capacityReached
                              ? t("mars.sector.full")
                              : t("mars.sector.assignColony")}
                        </button>
                      )}

                    {isLeader &&
                      isCurrentSector && (
                        <button
                          className="mars-sector-assign"
                          type="button"
                          disabled
                        >
                          {t("mars.sector.current")}
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
              {t("mars.sector.leaderControlled")}
            </div>
          )}
      </section>
    </main>
  );
}
