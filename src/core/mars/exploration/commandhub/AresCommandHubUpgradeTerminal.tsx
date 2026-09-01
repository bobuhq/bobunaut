import {
  Html,
} from "@react-three/drei";
import {
  useEffect,
  useState,
} from "react";
import * as THREE from "three";

import {
  getMyMarsColonyBuildingUpgrades,
  upgradeMyMarsColonyBuilding,
  type MarsColonyBuildingUpgrade,
} from "../../MarsColonyBaseService";

import {
  ARES_COMMAND_HUB_POSITION,
} from "./AresCommandHubCollision";

type Props = {
  targetRef:
    React.RefObject<THREE.Group | null>;
  onUpgraded?: () => void;
};

const INTERACTION_DISTANCE = 3.2;

export function AresCommandHubUpgradeTerminal({
  targetRef,
  onUpgraded,
}: Props) {
  const [
    upgrade,
    setUpgrade,
  ] =
    useState<MarsColonyBuildingUpgrade | null>(
      null,
    );

  const [distance, setDistance] =
    useState(Number.POSITIVE_INFINITY);

  const [loading, setLoading] =
    useState(true);

  const [upgrading, setUpgrading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const upgrades =
        await getMyMarsColonyBuildingUpgrades();

      const commandHub =
        upgrades.find(
          (item) =>
            item.building_key ===
            "command_hub",
        ) ?? null;

      setUpgrade(commandHub);
    } catch (loadError) {
      console.error(
        "Failed to load Command Hub upgrade:",
        loadError,
      );

      setError(
        "COMMAND HUB DATA UNAVAILABLE",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUpgrade();
  }, []);

  useEffect(() => {
    let frame = 0;

    const updateDistance = () => {
      const target = targetRef.current;

      if (target) {
        const worldPosition =
          new THREE.Vector3();

        target.getWorldPosition(
          worldPosition,
        );

        const dx =
          worldPosition.x -
          (
            ARES_COMMAND_HUB_POSITION.x +
            2.65
          );
        const dz =
          worldPosition.z -
          (
            ARES_COMMAND_HUB_POSITION.z +
            1.55
          );

        setDistance(
          Math.sqrt(
            dx * dx + dz * dz,
          ),
        );
      }

      frame =
        requestAnimationFrame(
          updateDistance,
        );
    };

    frame =
      requestAnimationFrame(
        updateDistance,
      );

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [targetRef]);

  const nearby =
    distance <=
    INTERACTION_DISTANCE;

  const handleUpgrade = async () => {
    if (
      !nearby ||
      !upgrade?.can_upgrade ||
      upgrading
    ) {
      return;
    }

    setUpgrading(true);
    setError(null);

    try {
      await upgradeMyMarsColonyBuilding(
        "command_hub",
      );

      await loadUpgrade();
      onUpgraded?.();
    } catch (upgradeError) {
      console.error(
        "Command Hub upgrade failed:",
        upgradeError,
      );

      const message =
        upgradeError instanceof Error
          ? upgradeError.message
          : "UPGRADE FAILED";

      setError(message);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <group
      position={[
        2.65,
        0,
        1.55,
      ]}
    >
      <mesh
        position={[0, 0.72, 0]}
        castShadow
      >
        <boxGeometry
          args={[1.15, 1.44, 0.72]}
        />
        <meshStandardMaterial
          color="#24242d"
          metalness={0.8}
          roughness={0.28}
        />
      </mesh>

      <mesh
        position={[
          0,
          1.02,
          -0.38,
        ]}
      >
        <boxGeometry
          args={[0.82, 0.52, 0.04]}
        />
        <meshStandardMaterial
          color="#8f4bd8"
          emissive="#6f28a8"
          emissiveIntensity={1.6}
        />
      </mesh>

      {nearby && (
        <Html
          center
          position={[
            0,
            1.85,
            0,
          ]}
          distanceFactor={7}
        >
          <div
            style={{
              width: "260px",
              padding: "14px",
              border:
                "1px solid rgba(186,120,255,.75)",
              borderRadius: "12px",
              background:
                "rgba(12,10,20,.94)",
              color: "#fff",
              fontFamily:
                "Inter, sans-serif",
              boxShadow:
                "0 0 30px rgba(128,54,190,.3)",
              pointerEvents: "auto",
            }}
          >
          <div
            style={{
              width: "190px",
              padding: "9px 10px",
              border:
                "1px solid rgba(186,120,255,.75)",
              borderRadius: "12px",
              background:
                "rgba(12,10,20,.94)",
              color: "#fff",
              fontFamily:
                "Inter, sans-serif",
              boxShadow:
                "0 0 30px rgba(128,54,190,.3)",
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "2px",
                color: "#b77cff",
              }}
            >
              COMMAND HUB CONTROL
            </div>

            {loading ? (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                }}
              >
                LOADING...
              </div>
            ) : upgrade ? (
              <>
                <div
                  style={{
                    marginTop: "7px",
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                >
                  LEVEL{" "}
                  {upgrade.current_level}
                </div>

                {upgrade.can_upgrade &&
                upgrade.next_level ? (
                  <>
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "11px",
                        opacity: 0.72,
                      }}
                    >
                      UPGRADE TO LEVEL{" "}
                      {upgrade.next_level}
                    </div>

                    <div
                      style={{
                        marginTop: "9px",
                        fontSize: "11px",
                        lineHeight: 1.7,
                      }}
                    >
                      MATERIALS ·{" "}
                      {upgrade.materials_cost}
                      <br />
                      ENERGY ·{" "}
                      {upgrade.energy_cost}
                      <br />
                      WATER ·{" "}
                      {upgrade.water_cost}
                      <br />
                      SCIENCE ·{" "}
                      {upgrade.science_cost}
                      <br />
                      FOOD ·{" "}
                      {upgrade.food_cost}
                    </div>

                    <button
                      type="button"
                      disabled={upgrading}
                      onClick={() => {
                        void handleUpgrade();
                      }}
                      style={{
                        width: "100%",
                        marginTop: "11px",
                        padding: "9px",
                        border:
                          "1px solid #a867e5",
                        borderRadius: "8px",
                        background:
                          "rgba(126,56,181,.24)",
                        color: "#fff",
                        fontWeight: 800,
                        cursor:
                          upgrading
                            ? "wait"
                            : "pointer",
                      }}
                    >
                      {upgrading
                        ? "UPGRADING..."
                        : `UPGRADE TO LEVEL ${upgrade.next_level}`}
                    </button>
                  </>
                ) : (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "11px",
                      opacity: 0.72,
                    }}
                  >
                    MAXIMUM AVAILABLE LEVEL
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "11px",
                }}
              >
                COMMAND HUB NOT AVAILABLE
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop: "9px",
                  fontSize: "10px",
                  color: "#ff9898",
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>
        </Html>
      )}
    </group>
  );
}
