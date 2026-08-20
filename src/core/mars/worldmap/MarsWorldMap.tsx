import type {
  CSSProperties,
} from "react";

import type {
  MarsSector,
} from "../MarsSectorService";

import "./MarsWorldMap.css";

type MarsWorldMapProps = {
  sectors: MarsSector[];
  currentSectorId: string | null;
  selectedSectorId: string | null;
  onSelectSector: (sectorId: string) => void;
  ariaLabel: string;
};

type SectorState =
  | "current"
  | "selected"
  | "active"
  | "locked";

function getSectorState(
  sector: MarsSector,
  currentSectorId: string | null,
  selectedSectorId: string | null,
): SectorState {
  if (sector.sector_id === currentSectorId) {
    return "current";
  }

  if (sector.sector_id === selectedSectorId) {
    return "selected";
  }

  if (
    sector.sector_status === "active" &&
    sector.current_colonies <
      sector.max_colonies
  ) {
    return "active";
  }

  return "locked";
}

function getSectorStyle(
  sector: MarsSector,
): CSSProperties {
  return {
    left: `${sector.map_x ?? 50}%`,
    top: `${sector.map_y ?? 50}%`,
  };
}

export function MarsWorldMap({
  sectors,
  currentSectorId,
  selectedSectorId,
  onSelectSector,
  ariaLabel,
}: MarsWorldMapProps) {
  return (
    <section
      className="mars-world-map"
      aria-label={ariaLabel}
    >
      <div className="mars-world-map__surface">
        <div className="mars-world-map__terrain mars-world-map__terrain--a" />
        <div className="mars-world-map__terrain mars-world-map__terrain--b" />
        <div className="mars-world-map__terrain mars-world-map__terrain--c" />

        <div className="mars-world-map__crater mars-world-map__crater--a" />
        <div className="mars-world-map__crater mars-world-map__crater--b" />
        <div className="mars-world-map__crater mars-world-map__crater--c" />
        <div className="mars-world-map__crater mars-world-map__crater--d" />

        <div className="mars-world-map__ridge mars-world-map__ridge--a" />
        <div className="mars-world-map__ridge mars-world-map__ridge--b" />
        <div className="mars-world-map__ridge mars-world-map__ridge--c" />

        {sectors.map((sector) => {
          if (
            sector.map_x === null ||
            sector.map_y === null
          ) {
            return null;
          }

          const state =
            getSectorState(
              sector,
              currentSectorId,
              selectedSectorId,
            );

          return (
            <button
              key={sector.sector_id}
              type="button"
              className={`mars-world-map__sector is-${state}`}
              style={getSectorStyle(sector)}
              onClick={() =>
                onSelectSector(
                  sector.sector_id,
                )
              }
              aria-pressed={
                sector.sector_id ===
                selectedSectorId
              }
            >
              <span className="mars-world-map__sector-glow" />
              <span className="mars-world-map__sector-core" />

              <span className="mars-world-map__sector-label">
                <strong>
                  {sector.sector_code}
                </strong>

                <small>
                  {sector.sector_name}
                </small>

                <em>
                  {sector.current_colonies}
                  {" / "}
                  {sector.max_colonies}
                </em>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
