import type { PointerEvent as ReactPointerEvent } from "react";

function triggerAttack(
  event: ReactPointerEvent<HTMLButtonElement>,
  action: "punch" | "spin",
) {
  event.preventDefault();
  event.stopPropagation();

  window.dispatchEvent(
    new CustomEvent("bobu:ares-attack", {
      detail: action,
    }),
  );
}

export function AresMobileCombat() {
  return (
    <div className="ares-mobile-combat" aria-label="Combat controls">
      <button
        type="button"
        aria-label="Punch"
        onPointerDown={(event) => triggerAttack(event, "punch")}
      >
        <strong>✊</strong>
        <small>PUNCH</small>
      </button>
      <button
        type="button"
        aria-label="Spinning sword attack"
        onPointerDown={(event) => triggerAttack(event, "spin")}
      >
        <strong>⚔</strong>
        <small>SWORD</small>
      </button>
    </div>
  );
}
