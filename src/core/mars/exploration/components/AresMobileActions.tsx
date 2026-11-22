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
    window.dispatchEvent(new CustomEvent("bobu:ares-attack", { detail: "punch" }));
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
          aria-label="Punch"
          onPointerDown={handleLeftArm}
          onClick={(event) => {
            if (event.detail === 0) window.dispatchEvent(new CustomEvent("bobu:ares-attack", { detail: "punch" }));
          }}
        >
          <span className="ares-mobile-action__icon" aria-hidden="true">↖</span>
          <span className="ares-mobile-action__label">PUNCH</span>
        </button>
      )}
      <style>{`
        /* V20.1: show existing combat controls on desktop walking mode. */
        @media (hover: hover) and (pointer: fine) {
          .mars-explore-world .ares-mobile-actions {
            display: flex !important;
            position: fixed !important;
            top: auto !important;
            left: auto !important;
            right: 20px !important;
            bottom: 85px !important;
            z-index: 210 !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 8px !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }

          .mars-explore-world .ares-mobile-action {
            display: flex !important;
            position: relative !important;
            width: 60px !important;
            min-height: 54px !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            background: rgba(9, 15, 32, 0.92) !important;
            border: 1px solid rgba(120, 230, 255, 0.7) !important;
            border-radius: 14px !important;
            color: white !important;
            cursor: pointer !important;
            pointer-events: auto !important;
            visibility: visible !important;
          }

          .mars-explore-world .ares-mobile-action__label {
            display: block !important;
            color: white !important;
            font: 800 9px/12px system-ui !important;
          }
        }
      `}</style>
    </div>
  );
}
