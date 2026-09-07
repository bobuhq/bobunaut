import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  MarsSector,
} from "../core/mars/MarsSectorService";

import {
  constructMyMarsColonyBuilding,
  getMyMarsColonyBase,
  getMyMarsColonyBuildingUpgrades,
  getMyMarsColonyConstructionCosts,
  getMyMarsColonyResources,
  getMyMarsResourceProduction,
  upgradeMyMarsColonyBuilding,
  type MarsColonyBaseBuilding,
  type MarsColonyBuildingConstructionCost,
  type MarsColonyBuildingUpgrade,
  type MarsColonyResourceProduction,
  type MarsColonyResources,
} from "../core/mars/MarsColonyBaseService";

import {
  getMyMarsColony,
  type MarsColony,
} from "../core/mars/MarsColonyService";

import MarsSectorTerritory from "./MarsSectorTerritory";

type Props = {
  sector: MarsSector;
  onBack: () => void;
};

export default function MobileMarsTerritory({
  sector,
  onBack,
}: Props) {
  const [colony, setColony] =
    useState<MarsColony | null>(null);

  const [buildings, setBuildings] =
    useState<MarsColonyBaseBuilding[]>([]);

  const [resources, setResources] =
    useState<MarsColonyResources | null>(null);

  const [production, setProduction] =
    useState<MarsColonyResourceProduction | null>(null);

  const [constructionCosts, setConstructionCosts] =
    useState<MarsColonyBuildingConstructionCost[]>([]);

  const [upgrades, setUpgrades] =
    useState<MarsColonyBuildingUpgrade[]>([]);

  const [constructingKey, setConstructingKey] =
    useState<string | null>(null);

  const [upgradingKey, setUpgradingKey] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [
      nextColony,
      nextBuildings,
      nextResources,
      nextProduction,
      nextCosts,
      nextUpgrades,
    ] = await Promise.all([
      getMyMarsColony(),
      getMyMarsColonyBase(),
      getMyMarsColonyResources(),
      getMyMarsResourceProduction(),
      getMyMarsColonyConstructionCosts(),
      getMyMarsColonyBuildingUpgrades(),
    ]);

    setColony(nextColony);
    setBuildings(nextBuildings);
    setResources(nextResources);
    setProduction(nextProduction);
    setConstructionCosts(nextCosts);
    setUpgrades(nextUpgrades);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        await refresh();
      } catch (loadError) {
        console.error(
          "Mobile Mars territory load failed:",
          loadError,
        );

        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Mars Colony.",
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
  }, [refresh]);

  if (loading) {
    return (
      <div className="mars-colony-base-state">
        SYNCHRONIZING ARES COLONY...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mars-colony-base-state mars-state-error">
        {error}
      </div>
    );
  }

  const canManage =
    colony !== null &&
    ["founder", "leader"].includes(colony.my_role);

  return (
    <MarsSectorTerritory
      sector={sector}
      isMyColonySector={
        colony?.active_sector_id === sector.sector_id
      }
      resources={resources}
      resourceProduction={production}
      structures={{
        constructed: buildings.filter(
          (building) => building.built,
        ).length,
        total: buildings.length,
      }}
      contribution={
        colony?.total_contribution ?? 0
      }
      colonyBase={buildings}
      constructionCosts={constructionCosts}
      buildingUpgrades={upgrades}
      canManageColony={canManage}
      constructingBuildingKey={constructingKey}
      upgradingBuildingKey={upgradingKey}
      onConstructBuilding={(buildingKey) => {
        if (!canManage || constructingKey !== null) {
          return;
        }

        void (async () => {
          try {
            setConstructingKey(buildingKey);
            await constructMyMarsColonyBuilding(
              buildingKey,
            );
            await refresh();
          } finally {
            setConstructingKey(null);
          }
        })();
      }}
      onUpgradeBuilding={(buildingKey) => {
        if (!canManage || upgradingKey !== null) {
          return;
        }

        void (async () => {
          try {
            setUpgradingKey(buildingKey);
            await upgradeMyMarsColonyBuilding(
              buildingKey,
            );
            await refresh();
          } finally {
            setUpgradingKey(null);
          }
        })();
      }}
      onInventoryPlacementSaved={refresh}
      onBack={onBack}
    />
  );
}
