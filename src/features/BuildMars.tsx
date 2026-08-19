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
  getMyMarsColony,
  type MarsColony,
} from "../core/mars/MarsColonyService";

import {
  assignMyColonyToMarsSector,
  getMarsSectorDirectory,
  type MarsSector,
} from "../core/mars/MarsSectorService";

import "./BuildMars.css";

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

  const [sectors, setSectors] =
    useState<MarsSector[]>([]);

  const [sectorsLoading, setSectorsLoading] =
    useState(true);

  const [sectorsError, setSectorsError] =
    useState<string | null>(null);

  const [assigningSectorId, setAssigningSectorId] =
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

        const colony = await getMyMarsColony();

        if (!cancelled) {
          setMyColony(colony);
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
            <div className="mars-colony-empty">
              <strong>No active Colony</strong>

              <p>
                You are not currently an active member of a
                Mars Colony.
              </p>
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
