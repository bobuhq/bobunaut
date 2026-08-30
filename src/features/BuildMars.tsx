import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
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
  getMarsSectorDirectory,
  type MarsSector,
} from "../core/mars/MarsSectorService";


import "./BuildMars.css";


const MarsPlanetMap = lazy(() =>
  import("../core/mars/planetmap/MarsPlanetMap").then(
    (module) => ({
      default: module.MarsPlanetMap,
    }),
  ),
);

export function BuildMars() {

  const { t } = useLanguage();
  const navigate = useNavigate();

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

  const [sectors, setSectors] =
    useState<MarsSector[]>([]);

  const [sectorsLoading, setSectorsLoading] =
    useState(true);

  const [sectorsError, setSectorsError] =
    useState<string | null>(null);

  const [selectedSectorId, setSelectedSectorId] =
    useState<string | null>(null);

  const [sectorDiveActive, setSectorDiveActive] =
    useState(false);

  const [sectorActionError, setSectorActionError] =
    useState<string | null>(null);

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
  }, []);

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
    void loadSectors();
  }, []);

  const handleEnterSector = (
    sectorId: string,
  ) => {
    if (sectorDiveActive) {
      return;
    }

    const enteringSector =
      sectors.find(
        (sector) =>
          sector.sector_id === sectorId,
      ) ?? null;

    const sectorCode =
      enteringSector?.sector_code
        ?.trim()
        .toLowerCase() ?? "";

    const isAresSector =
      sectorCode === "ares" ||
      enteringSector?.sector_name
        ?.trim()
        .toLowerCase()
        .includes("ares") === true;

    if (!isAresSector) {
      setSectorActionError(
        `${enteringSector?.sector_name ?? "This sector"} exploration is not available yet. Ares is the active exploration region.`,
      );
      return;
    }

    if (!marsAccess?.unlocked) {
      setSectorActionError(
        "ARES access requirements are not complete.",
      );
      return;
    }

    setSectorActionError(null);
    setSectorDiveActive(true);

    window.setTimeout(() => {
      navigate(
        "/mars/explore?sector=ares",
      );
    }, 5550);
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

      <div className="mars-orbit-secondary">
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

      </div>

      <section className="mars-sector-network is-orbit-mode">
        <div className="mars-sector-heading">
          <div>
            <span className="mars-section-label">
              {t("mars.sector.label")}
            </span>

            <h2>{t("mars.sector.network")}</h2>

            <p>{t("mars.sector.description")}</p>
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
                  currentSectorId={null}
                  selectedSectorId={selectedSectorId}
                  onSelectSector={(sectorId) => {
                    setSelectedSectorId(sectorId);
                    setSectorActionError(null);
                  }}
                  onEnterSector={handleEnterSector}
                  diving={sectorDiveActive}
                  ariaLabel={t("mars.map.ariaLabel")}
                  aresAccess={marsAccess}
                  aresAccessLoading={accessLoading}
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

        {sectorActionError && (
          <div className="mars-sector-action-error">
            {sectorActionError}
          </div>
        )}
      </section>
    </main>
  );
}
