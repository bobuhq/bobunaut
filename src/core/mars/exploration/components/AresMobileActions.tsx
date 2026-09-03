import {
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";

function dispatchKeyboardEvent(
  type: "keydown" | "keyup",
  code: "KeyE" | "Space",
  key: "e" | " ",
) {
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
};

export function AresMobileActions({
  interactionTarget = null,
}: AresMobileActionsProps) {
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
    </div>
  );
}
