import { useEffect, useMemo, useState } from "react";
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
  getMyMarsColony,
  type MarsColony,
} from "../core/mars/MarsColonyService";

import "./BuildMars.css";

export function BuildMars() {
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

  useEffect(() => {
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
  }, []);

  useEffect(() => {
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
  }, []);

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
              </div>
            </div>
          )}
      </section>
    </main>
  );
}
