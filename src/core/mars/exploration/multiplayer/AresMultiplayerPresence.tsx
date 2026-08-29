import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import {
  useFrame,
} from "@react-three/fiber";

import * as THREE from "three";

import {
  AresPresenceEngine,
  type AresRemoteBuilder,
} from "./AresPresenceEngine";

import {
  AresRemoteBuilder as RemoteBuilderVisual,
} from "./AresRemoteBuilder";

const PRESENCE_HEARTBEAT_MS =
  1000;

const REMOTE_STALE_AFTER_MS =
  4000;

interface AresMultiplayerPresenceProps {
  characterRef:
    MutableRefObject<THREE.Group | null>;
  builderId: string;
  displayName:
    | string
    | null
    | undefined;
  onOnlineCountChange?: (
    count: number,
  ) => void;
}

export function AresMultiplayerPresence({
  characterRef,
  builderId,
  displayName,
  onOnlineCountChange,
}: AresMultiplayerPresenceProps) {
  const [
    remoteBuilders,
    setRemoteBuilders,
  ] =
    useState<
      AresRemoteBuilder[]
    >([]);

  const connectedRef =
    useRef(false);

  const sendingRef =
    useRef(false);

  const engineRef =
    useRef<AresPresenceEngine | null>(
      null,
    );

  if (!engineRef.current) {
    engineRef.current =
      new AresPresenceEngine();
  }

  const presenceEngine =
    engineRef.current;

  useEffect(() => {
    let active = true;

    const publishRemoteSnapshot =
      (
        builders:
          AresRemoteBuilder[],
      ) => {
        if (!active) {
          return;
        }

        const now =
          Date.now();

        const freshBuilders =
          builders.filter(
            (builder) =>
              now -
                builder.updatedAt <
              REMOTE_STALE_AFTER_MS,
          );

        setRemoteBuilders(
          freshBuilders,
        );

        onOnlineCountChange?.(
          freshBuilders.length +
            1,
        );
      };

    const unsubscribe =
      presenceEngine.subscribe(
        publishRemoteSnapshot,
      );

    const remotePruneTimer =
      window.setInterval(
        () => {
          presenceEngine.pruneStaleBuilders(
            REMOTE_STALE_AFTER_MS,
          );

          publishRemoteSnapshot(
            presenceEngine.getRemoteBuilders(),
          );
        },
        PRESENCE_HEARTBEAT_MS,
      );

    const heartbeatTimer =
      window.setInterval(
        () => {
          if (
            !connectedRef.current
          ) {
            return;
          }

          const group =
            characterRef.current;

          if (!group) {
            return;
          }

          void presenceEngine.updateTransform(
            {
              x:
                group.position.x,
              y:
                group.position.y,
              z:
                group.position.z,
              rotationY:
                group.rotation.y,
            },
            true,
          );
        },
        PRESENCE_HEARTBEAT_MS,
      );

    void presenceEngine
      .connect(
        builderId,
        displayName,
      )
      .then(() => {
        if (!active) {
          return;
        }

        connectedRef.current =
          true;

        const group =
          characterRef.current;

        if (group) {
          void presenceEngine.updateTransform(
            {
              x:
                group.position.x,
              y:
                group.position.y,
              z:
                group.position.z,
              rotationY:
                group.rotation.y,
            },
            true,
          );
        }
      })
      .catch((error) => {
        console.error(
          "Failed to connect Ares multiplayer presence",
          error,
        );
      });

    return () => {
      active = false;
      connectedRef.current =
        false;

      window.clearInterval(
        heartbeatTimer,
      );

      window.clearInterval(
        remotePruneTimer,
      );

      unsubscribe();

      void presenceEngine.disconnect();
    };
  }, [
    builderId,
    displayName,
    characterRef,
    onOnlineCountChange,
  ]);

  useFrame(() => {
    if (
      !connectedRef.current ||
      sendingRef.current
    ) {
      return;
    }

    const group =
      characterRef.current;

    if (!group) {
      return;
    }

    sendingRef.current = true;

    void presenceEngine
      .updateTransform({
        x: group.position.x,
        y: group.position.y,
        z: group.position.z,
        rotationY:
          group.rotation.y,
      })
      .finally(() => {
        sendingRef.current =
          false;
      });
  });

  return (
    <>
      {remoteBuilders.map(
        (builder) => (
          <RemoteBuilderVisual
            key={
              builder.builderId
            }
            builder={builder}
          />
        ),
      )}
    </>
  );
}
