import {
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { marsAudio } from "../audio/MarsAudioEngine";

function dispatchKeyboardEvent(
  type: "keydown" | "keyup",
  code: "KeyE" | "Space",
  key: "e" | " ",
) {
  if (
    type === "keydown" &&
    code === "Space"
  ) {
    void marsAudio
      .unlock()
      .then(() => {
        marsAudio.jump();
      });
  }

  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key,
      bubbles: true,
      cancelable: true,
    }),
  );
}

export type AresMobileInteractionTarget =
  | "MISSION"
  | "RESEARCH"
  | "COMMAND"
  | null;

type AresMobileActionsProps = {
  interactionTarget?: AresMobileInteractionTarget;
  canSpin?: boolean;
  canMoveLeftArm?: boolean;
};

export function AresMobileActions({
  interactionTarget = null,
  canSpin = false,
  canMoveLeftArm = false,
}: AresMobileActionsProps) {
  function handleSpin(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent("bobu:ares-attack", { detail: "spin" }));
  }

  function handleLeftArm(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new Event("bobu:ares-left-arm"));
  }

  const handleInteractionDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      event.currentTarget.setPointerCapture(
        event.pointerId,
      );

      dispatchKeyboardEvent(
        "keydown",
        "KeyE",
        "e",
      );
    },
    [],
  );

  const handleInteractionUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (
        event.currentTarget.hasPointerCapture(
          event.pointerId,
        )
      ) {
        event.currentTarget.releasePointerCapture(
          event.pointerId,
        );
      }

      dispatchKeyboardEvent(
        "keyup",
        "KeyE",
        "e",
      );
    },
    [],
  );

  const handleJump = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      dispatchKeyboardEvent(
        "keydown",
        "Space",
        " ",
      );

      window.setTimeout(() => {
        dispatchKeyboardEvent(
          "keyup",
          "Space",
          " ",
        );
      }, 40);
    },
    [],
  );

  return (
    <div
      className="ares-mobile-actions"
      aria-label="Ares mobile controls"
    >
      <button
        type="button"
        className="ares-mobile-action ares-mobile-action--jump"
        aria-label="Jump"
        onPointerDown={handleJump}
      >
        <span className="ares-mobile-action__icon">
          ↑
        </span>
        <span className="ares-mobile-action__label">
          JUMP
        </span>
      </button>

      <button
        type="button"
        className={[
          "ares-mobile-action",
          "ares-mobile-action--interact",
          interactionTarget
            ? "is-active"
            : "is-inactive",
        ].join(" ")}
        aria-label={
          interactionTarget
            ? `Interact with ${interactionTarget}`
            : "No interaction available"
        }
        onPointerDown={handleInteractionDown}
        onPointerUp={handleInteractionUp}
        onPointerCancel={handleInteractionUp}
      >
        <span className="ares-mobile-action__key">
          E
        </span>
        <span className="ares-mobile-action__label">
          {interactionTarget ?? "INTERACT"}
        </span>
      </button>

      {canSpin && (
        <button
          type="button"
          className="ares-mobile-action ares-mobile-action--spin"
          aria-label="Spin"
          onPointerDown={handleSpin}
        >
          <span className="ares-mobile-action__icon">↻</span>
          <span className="ares-mobile-action__label">SPIN</span>
        </button>
      )}
      {canMoveLeftArm && (
        <button
          type="button"
          className="ares-mobile-action ares-mobile-action--left-arm"
          aria-label="Left arm"
          onPointerDown={handleLeftArm}
          onClick={(event) => {
            if (event.detail === 0) window.dispatchEvent(new Event("bobu:ares-left-arm"));
          }}
        >
          <span className="ares-mobile-action__icon" aria-hidden="true">↖</span>
          <span className="ares-mobile-action__label">LEFT ARM</span>
        </button>
      )}
    </div>
  );
}
