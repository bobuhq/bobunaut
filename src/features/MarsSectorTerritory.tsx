import { useState } from "react";
import type { MarsSector } from "../core/mars/MarsSectorService";
import { MarsColonyWorld3D } from "../core/mars/colonyworld/MarsColonyWorld3D";
import type {
  MarsColonyBaseBuilding,
  MarsColonyBuildingConstructionCost,
  MarsColonyBuildingUpgrade,
  MarsColonyResourceProduction,
} from "../core/mars/MarsColonyBaseService";

import MarsMarket from "./MarsMarket";
import type {
  MarsInventoryItem,
} from "../core/mars/MarsMarketService";

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
  onInventoryPlacementSaved: () => void | Promise<void>;
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
  onInventoryPlacementSaved,
  onBack,
}: Props) {
  const colonyName =
    colonyBase[0]?.colony_name ?? "COLONY";

  const [marketOpen, setMarketOpen] =
    useState(false);

  const [
    placingInventoryItem,
    setPlacingInventoryItem,
  ] = useState<MarsInventoryItem | null>(
    null,
  );

  const beginInventoryPlacement = (
    item: MarsInventoryItem,
  ) => {
    if (
      item.item_type !== "building" ||
      !item.building_key ||
      item.quantity <= 0
    ) {
      return;
    }

    setPlacingInventoryItem(item);

    /*
     * Close the Market drawer so the Builder gets
     * the complete Mars surface for placement.
     */
    setMarketOpen(false);
  };

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

        <div className="mars-territory__topbar-actions">
          {isMyColonySector && (
            <button
              type="button"
              className="mars-territory__market"
              onClick={() => setMarketOpen(true)}
            >
              <span aria-hidden="true">◈</span>
              <span>MARKET</span>
            </button>
          )}

          <div className="mars-territory__capacity">
            <span>STRUCTURES</span>

            <strong>
              {structures.constructed}
              {" / "}
              {structures.total}
            </strong>
          </div>
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

        <div className="mars-colony-workspace__base mars-colony-workspace__base--3d">
          <MarsColonyWorld3D
            buildings={colonyBase}
            canManageColony={canManageColony}
            inventoryPlacementItem={
              placingInventoryItem
            }
            onCancelInventoryPlacement={() =>
              setPlacingInventoryItem(null)
            }
            onInventoryPlacementSaved={async () => {
              /*
               * The placement RPC has already committed the
               * authoritative building position at this point.
               *
               * Refresh the existing production Colony Base
               * snapshot so the newly placed building appears
               * immediately and remains server-authoritative.
               */
              await onInventoryPlacementSaved();

              setPlacingInventoryItem(null);
            }}
          />
        </div>
      </div>

      <MarsMarket
        open={marketOpen}
        onClose={() => setMarketOpen(false)}
        onPlaceInventoryBuilding={
          beginInventoryPlacement
        }
      />
    </section>
  );
}
