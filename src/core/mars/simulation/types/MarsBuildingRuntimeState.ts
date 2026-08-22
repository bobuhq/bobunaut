export type MarsBuildingOperationalStatus =
  | "offline"
  | "standby"
  | "active"
  | "degraded"
  | "maintenance"
  | "disabled"
  | "archived";

export type MarsBuildingRuntimeState = {
  buildingId: string;
  colonyId: string;
  buildingKey: string;

  level: number;
  operationalStatus:
    MarsBuildingOperationalStatus;

  efficiency: number;

  energyProductionPerHour: number;
  energyConsumptionPerHour: number;

  waterProductionPerHour: number;
  waterConsumptionPerHour: number;

  scienceProductionPerHour: number;

  foodProductionPerHour: number;
  foodConsumptionPerHour: number;

  storageCapacity: number;
  storageUsed: number;

  workersRequired: number;
  workersAssigned: number;

  condition: number;

  lastSimulatedAt: string;
};
