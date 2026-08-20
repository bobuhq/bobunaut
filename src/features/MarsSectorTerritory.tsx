import { useMemo, useState } from "react";

import type { MarsSector } from "../core/mars/MarsSectorService";

import "./MarsSectorTerritory.css";

type Props = {
  sector: MarsSector;
  isMyColonySector: boolean;
  onBack: () => void;
};

type HexPlot = {
  id: string;
  q: number;
  r: number;
  state: "colony" | "available" | "locked";
};

const HEX_RADIUS = 3;

function buildHexPlots(
  isMyColonySector: boolean,
): HexPlot[] {
  const plots: HexPlot[] = [];

  for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q += 1) {
    const r1 = Math.max(
      -HEX_RADIUS,
      -q - HEX_RADIUS,
    );

    const r2 = Math.min(
      HEX_RADIUS,
      -q + HEX_RADIUS,
    );

    for (let r = r1; r <= r2; r += 1) {
      const isCenter = q === 0 && r === 0;

      const distance = Math.max(
        Math.abs(q),
        Math.abs(r),
        Math.abs(-q - r),
      );

      plots.push({
        id: `${q}:${r}`,
        q,
        r,
        state:
          isCenter && isMyColonySector
            ? "colony"
            : distance <= 1
              ? "available"
              : "locked",
      });
    }
  }

  return plots;
}

export default function MarsSectorTerritory({
  sector,
  isMyColonySector,
  onBack,
}: Props) {
  const [selectedPlotId, setSelectedPlotId] =
    useState<string | null>(null);

  const plots = useMemo(
    () => buildHexPlots(isMyColonySector),
    [isMyColonySector],
  );

  const selectedPlot =
    plots.find((plot) => plot.id === selectedPlotId) ??
    null;

  return (
    <section className="mars-territory">
      <div className="mars-territory__topbar">
        <button
          type="button"
          className="mars-territory__back"
          onClick={onBack}
        >
          <span aria-hidden="true">←</span>
          <span>MARS MAP</span>
        </button>

        <div className="mars-territory__identity">
          <span>SECTOR TERRITORY</span>

          <strong>
            {sector.sector_code}
            {" · "}
            {sector.sector_name}
          </strong>
        </div>

        <div className="mars-territory__capacity">
          <span>COLONIES</span>

          <strong>
            {sector.current_colonies}
            {" / "}
            {sector.max_colonies}
          </strong>
        </div>
      </div>

      <div className="mars-territory__viewport">
        <div
          className="mars-territory__planet"
          aria-hidden="true"
        />

        <div className="mars-territory__atmosphere" />

        <div className="mars-territory__hex-field">
          {plots.map((plot) => {
            const x =
              plot.q * 74 +
              plot.r * 37;

            const y =
              plot.r * 64;

            const isSelected =
              selectedPlotId === plot.id;

            return (
              <button
                key={plot.id}
                type="button"
                className={[
                  "mars-territory-hex",
                  `mars-territory-hex--${plot.state}`,
                  isSelected
                    ? "mars-territory-hex--selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  transform: `translate3d(${x}px, ${y}px, 0)`,
                }}
                onClick={() =>
                  setSelectedPlotId(plot.id)
                }
                aria-label={`Territory plot ${plot.id}`}
              >
                <span className="mars-territory-hex__surface" />

                {plot.state === "locked" && (
                  <span className="mars-territory-hex__lock">
                    🔒
                  </span>
                )}

                {plot.state === "available" && (
                  <span className="mars-territory-hex__marker">
                    +
                  </span>
                )}

                {plot.state === "colony" && (
                  <span className="mars-territory-colony">
                    <i className="mars-territory-colony__beam" />
                    <i className="mars-territory-colony__tower" />
                    <i className="mars-territory-colony__dome" />
                    <i className="mars-territory-colony__wing mars-territory-colony__wing--left" />
                    <i className="mars-territory-colony__wing mars-territory-colony__wing--right" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mars-territory__title">
          <span>MARS SECTOR</span>
          <strong>{sector.sector_code}</strong>
          <small>
            Select a territory plot to inspect its status.
          </small>
        </div>

        <div className="mars-territory__legend">
          <span>
            <i className="mars-territory__legend-colony" />
            Colony
          </span>

          <span>
            <i className="mars-territory__legend-open" />
            Available
          </span>

          <span>
            <i className="mars-territory__legend-locked" />
            Locked
          </span>
        </div>

        {selectedPlot && (
          <aside className="mars-territory-panel">
            <button
              type="button"
              className="mars-territory-panel__close"
              onClick={() => setSelectedPlotId(null)}
              aria-label="Close territory details"
            >
              ×
            </button>

            <span>TERRITORY PLOT</span>

            <strong>
              {sector.sector_code}
              {" · "}
              {selectedPlot.id}
            </strong>

            <div>
              <small>STATUS</small>

              <b>
                {selectedPlot.state === "colony"
                  ? "YOUR COLONY"
                  : selectedPlot.state === "available"
                    ? "UNASSIGNED"
                    : "LOCKED"}
              </b>
            </div>

            {selectedPlot.state === "colony" && (
              <button
                type="button"
                className="mars-territory-panel__enter"
                disabled
              >
                COLONY BASE · SOON
              </button>
            )}

            {selectedPlot.state === "available" && (
              <p>
                This territory is not assigned to a
                Builder.
              </p>
            )}

            {selectedPlot.state === "locked" && (
              <p>
                This territory is not currently open for
                settlement.
              </p>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}
