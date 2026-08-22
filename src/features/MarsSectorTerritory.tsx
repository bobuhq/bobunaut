import type { MarsSector } from "../core/mars/MarsSectorService";
import { MarsCommandHub3D } from "../core/mars/MarsCommandHub3D";
import type {
  MarsColonyBaseBuilding,
  MarsColonyBuildingConstructionCost,
  MarsColonyBuildingUpgrade,
  MarsColonyResourceProduction,
} from "../core/mars/MarsColonyBaseService";

import "./MarsSectorTerritory.css";

type TerritoryResources = {
  materials: number;
  energy: number;
  water: number;
  science: number;
  food: number;
};

type Props = {
  sector: MarsSector;
  isMyColonySector: boolean;
  resources: TerritoryResources | null;
  resourceProduction: MarsColonyResourceProduction | null;
  structures: {
    constructed: number;
    total: number;
  };
  contribution: number;
  colonyBase: MarsColonyBaseBuilding[];
  constructionCosts: MarsColonyBuildingConstructionCost[];
  buildingUpgrades: MarsColonyBuildingUpgrade[];
  canManageColony: boolean;
  constructingBuildingKey: string | null;
  upgradingBuildingKey: string | null;
  onConstructBuilding: (buildingKey: string) => void;
  onUpgradeBuilding: (buildingKey: string) => void;
  onBack: () => void;
};

function formatCost(
  cost: MarsColonyBuildingConstructionCost | MarsColonyBuildingUpgrade,
) {
  return [
    `M ${cost.materials_cost.toLocaleString()}`,
    `E ${cost.energy_cost.toLocaleString()}`,
    `W ${cost.water_cost.toLocaleString()}`,
    `S ${cost.science_cost.toLocaleString()}`,
    `F ${cost.food_cost.toLocaleString()}`,
  ].join(" · ");
}

export default function MarsSectorTerritory({
  sector,
  isMyColonySector,
  resources,
  resourceProduction,
  structures,
  contribution,
  colonyBase,
  constructionCosts,
  buildingUpgrades,
  canManageColony,
  constructingBuildingKey,
  upgradingBuildingKey,
  onConstructBuilding,
  onUpgradeBuilding,
  onBack,
}: Props) {
  const colonyName =
    colonyBase[0]?.colony_name ?? "COLONY";

  return (
    <section className="mars-territory mars-territory--workspace">
      <div className="mars-territory__topbar">
        <button
          type="button"
          className="mars-territory__back"
          onClick={onBack}
        >
          <span aria-hidden="true">←</span>
          <span>RETURN TO ORBIT</span>
        </button>

        <div className="mars-territory__identity">
          <span>COLONY WORKSPACE</span>

          <strong>
            {colonyName}
            {" · "}
            {sector.sector_code}
          </strong>
        </div>

        <div className="mars-territory__capacity">
          <span>STRUCTURES</span>

          <strong>
            {structures.constructed}
            {" / "}
            {structures.total}
          </strong>
        </div>
      </div>

      <div className="mars-territory__viewport mars-colony-workspace">
        <div
          className="mars-territory__planet"
          aria-hidden="true"
        />

        <div className="mars-territory__atmosphere" />

        <div className="mars-colony-workspace__horizon" />
        <div className="mars-colony-workspace__ridge mars-colony-workspace__ridge--a" />
        <div className="mars-colony-workspace__ridge mars-colony-workspace__ridge--b" />
        <div className="mars-colony-workspace__crater mars-colony-workspace__crater--a" />
        <div className="mars-colony-workspace__crater mars-colony-workspace__crater--b" />

        {isMyColonySector && (
          <>
            <aside
              className="mars-territory-hud mars-territory-hud--left"
              aria-label="Colony territory status"
            >
              <div className="mars-territory-hud__item" title="Materials">
                <span className="mars-territory-hud__icon">◆</span>
                <strong>{resources?.materials.toLocaleString() ?? "0"}</strong>
                <small>Materials</small>
              </div>

              <div className="mars-territory-hud__item" title="Water">
                <span className="mars-territory-hud__icon">◉</span>
                <strong>{resources?.water.toLocaleString() ?? "0"}</strong>
                <small>Water</small>
              </div>

              <div className="mars-territory-hud__item" title="Science">
                <span className="mars-territory-hud__icon">✦</span>
                <strong>{resources?.science.toLocaleString() ?? "0"}</strong>
                <small>Science</small>
              </div>

              <div className="mars-territory-hud__item" title="Contribution">
                <span className="mars-territory-hud__icon">★</span>
                <strong>{contribution.toLocaleString()}</strong>
                <small>Contribution</small>
              </div>
            </aside>

            <aside
              className="mars-territory-hud mars-territory-hud--right"
              aria-label="Colony resource status"
            >
              <div className="mars-territory-hud__item" title="Energy">
                <span className="mars-territory-hud__icon">ϟ</span>
                <strong>{resources?.energy.toLocaleString() ?? "0"}</strong>
                <small>Energy</small>
              </div>

              <div className="mars-territory-hud__item" title="Food">
                <span className="mars-territory-hud__icon">●</span>
                <strong>{resources?.food.toLocaleString() ?? "0"}</strong>
                <small>Food</small>
              </div>

              <div className="mars-territory-hud__item" title="Structures">
                <span className="mars-territory-hud__icon">⌂</span>
                <strong>
                  {structures.constructed}
                  {" / "}
                  {structures.total}
                </strong>
                <small>Structures</small>
              </div>

              <div className="mars-territory-hud__item" title="Sector">
                <span className="mars-territory-hud__icon">◎</span>
                <strong>{sector.sector_code}</strong>
                <small>Sector</small>
              </div>
            </aside>
          </>
        )}

        <div className="mars-colony-workspace__title">
          <span>MARS SURFACE OPERATIONS</span>
          <strong>{colonyName}</strong>
          <small>
            {sector.sector_code}
            {" · "}
            {sector.sector_name}
          </small>
        </div>

        <div className="mars-colony-workspace__base">
          {colonyBase.map((building) => {
            const positionClass =
              `mars-base-building-${building.building_key}`;

            const constructionCost =
              constructionCosts.find(
                (candidate) =>
                  candidate.building_key === building.building_key,
              ) ?? null;

            const upgrade =
              buildingUpgrades.find(
                (candidate) =>
                  candidate.building_key === building.building_key,
              ) ?? null;

            const hasConstructionResources =
              constructionCost !== null &&
              resources !== null &&
              resources.materials >= constructionCost.materials_cost &&
              resources.energy >= constructionCost.energy_cost &&
              resources.water >= constructionCost.water_cost &&
              resources.science >= constructionCost.science_cost &&
              resources.food >= constructionCost.food_cost;

            const constructing =
              constructingBuildingKey === building.building_key;

            const upgrading =
              upgradingBuildingKey === building.building_key;

            return (
              <article
                key={building.building_key}
                className={`mars-base-building ${positionClass}${
                  building.built
                    ? " mars-base-building-built"
                    : " mars-base-building-ghost"
                }`}
              >
                <div
                  className="mars-base-building-visual"
                  data-building={building.building_key}
                >
                  <div className="mars-base-building-pad" />

                  {building.building_key === "command_hub" &&
                  building.built ? (
                    <MarsCommandHub3D
                      level={building.building_level}
                    />
                  ) : (
                    <>
                      <div className="mars-base-building-body" />

                      <div className="mars-base-building-aux mars-base-building-aux--a" />
                      <div className="mars-base-building-aux mars-base-building-aux--b" />

                      <div className="mars-base-building-core" />
                      <div className="mars-base-building-light" />
                    </>
                  )}

                  {building.built && (
                    <div className="mars-base-building-level">
                      L{building.building_level}
                    </div>
                  )}

                  {building.building_key === "energy" &&
                    building.built && (
                      <div
                        className="mars-energy-system"
                        aria-label="BOBU crystal energy production"
                      >
                        <div className="mars-energy-solar">
                          <span />
                          <span />
                          <span />
                        </div>

                        <div className="mars-energy-flow">
                          <span />
                          <span />
                          <span />
                        </div>

                        <div className="mars-energy-crystal-vault">
                          <div className="mars-energy-crystals">
                            <i />
                            <i />
                            <i />
                            <i />
                          </div>

                          <div className="mars-energy-production-readout">
                            <strong>
                              +
                              {resourceProduction?.claimable_energy
                                .toLocaleString() ?? "0"}
                            </strong>

                            <small>
                              CRYSTALS ·{" "}
                              {resourceProduction?.energy_per_hour
                                .toLocaleString() ?? "0"}
                              /H
                            </small>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="mars-base-building-label">
                    <strong>{building.building_name}</strong>

                    <small>
                      {building.built
                        ? `LEVEL ${building.building_level}`
                        : "BUILD SITE"}
                    </small>
                  </div>
                </div>

                <div className="mars-base-building-info">
                  <span>{building.building_category}</span>

                  <strong>{building.building_name}</strong>

                  <small>
                    {building.built
                      ? `LEVEL ${building.building_level}`
                      : "NOT CONSTRUCTED"}
                  </small>

                  {building.built && (
                    <small>
                      {building.building_status.toUpperCase()}
                    </small>
                  )}

                  {!building.built &&
                    constructionCost &&
                    canManageColony && (
                      <div className="mars-building-upgrade">
                        <div className="mars-building-upgrade-cost">
                          <span>CONSTRUCTION COST</span>
                          <small>{formatCost(constructionCost)}</small>
                        </div>

                        <button
                          type="button"
                          disabled={
                            constructingBuildingKey !== null ||
                            upgradingBuildingKey !== null ||
                            !hasConstructionResources
                          }
                          onClick={() =>
                            onConstructBuilding(building.building_key)
                          }
                        >
                          {constructing
                            ? "CONSTRUCTING..."
                            : hasConstructionResources
                              ? "CONSTRUCT"
                              : "INSUFFICIENT RESOURCES"}
                        </button>
                      </div>
                    )}

                  {building.built &&
                    upgrade &&
                    canManageColony && (
                      <div className="mars-building-upgrade">
                        {upgrade.can_upgrade ? (
                          <>
                            <div className="mars-building-upgrade-cost">
                              <span>
                                {upgrade.next_level !== null
                                  ? `NEXT LEVEL ${upgrade.next_level}`
                                  : "MAX LEVEL"}
                              </span>

                              <small>{formatCost(upgrade)}</small>
                            </div>

                            <button
                              type="button"
                              disabled={
                                upgradingBuildingKey !== null ||
                                constructingBuildingKey !== null
                              }
                              onClick={() =>
                                onUpgradeBuilding(building.building_key)
                              }
                            >
                              {upgrading
                                ? "UPGRADING..."
                                : upgrade.next_level !== null
                                  ? `UPGRADE TO LEVEL ${upgrade.next_level}`
                                  : "MAX LEVEL"}
                            </button>
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
      </div>
    </section>
  );
}
