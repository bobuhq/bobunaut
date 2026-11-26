import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { marsAudio } from "../audio/MarsAudioEngine";

export type AresJoystickVector = {
  x: number;
  y: number;
};

type AresMobileJoystickProps = {
  onMove: (vector: AresJoystickVector) => void;
};

const MAX_RADIUS = 42;
const DEAD_ZONE = 0.16;

export function AresMobileJoystick({
  onMove,
}: AresMobileJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerRef = useRef<number | null>(null);

  const [knob, setKnob] = useState({
    x: 0,
    y: 0,
  });

  const reset = useCallback(() => {
    activePointerRef.current = null;
    setKnob({
      x: 0,
      y: 0,
    });
    onMove({
      x: 0,
      y: 0,
    });

    marsAudio.step(false);
  }, [onMove]);

  useEffect(() => {
    const stop = () => {
      const pointerId = activePointerRef.current;
      if (pointerId === null) return;
      reset();
      const base = baseRef.current;
      if (base?.hasPointerCapture(pointerId)) base.releasePointerCapture(pointerId);
    };
    const onVisibilityChange = () => {
      if (document.hidden) stop();
    };
    const endPointer = (event: PointerEvent) => {
      if (activePointerRef.current === event.pointerId) stop();
    };

    const endTouch = (event: TouchEvent) => {
      if (event.touches.length === 0) stop();
    };

    window.addEventListener("pointerup", endPointer, true);
    window.addEventListener("pointercancel", endPointer, true);
    window.addEventListener("touchend", endTouch, true);
    window.addEventListener("touchcancel", endTouch, true);
    window.addEventListener("pagehide", stop);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pointerup", endPointer, true);
      window.removeEventListener("pointercancel", endPointer, true);
      window.removeEventListener("touchend", endTouch, true);
      window.removeEventListener("touchcancel", endTouch, true);
      window.removeEventListener("pagehide", stop);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, [reset]);

  const updateFromPointer = useCallback(
    (
      clientX: number,
      clientY: number,
    ) => {
      const base = baseRef.current;

      if (!base) {
        return;
      }

      const rect =
        base.getBoundingClientRect();

      const centerX =
        rect.left + rect.width / 2;

      const centerY =
        rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const distance =
        Math.hypot(dx, dy);

      if (distance > MAX_RADIUS) {
        const scale =
          MAX_RADIUS / distance;

        dx *= scale;
        dy *= scale;
      }

      setKnob({
        x: dx,
        y: dy,
      });

      let x = dx / MAX_RADIUS;
      let y = dy / MAX_RADIUS;

      const magnitude =
        Math.hypot(x, y);

      if (magnitude < DEAD_ZONE) {
        x = 0;
        y = 0;
      } else if (magnitude > 1) {
        x /= magnitude;
        y /= magnitude;
      }

      onMove({
        x,
        y,
      });
    },
    [onMove],
  );

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;

    const previous = activePointerRef.current;
    if (previous !== null) {
      if (event.currentTarget.hasPointerCapture(previous)) return;
      reset();
      try {
        if (event.currentTarget.hasPointerCapture(previous)) {
          event.currentTarget.releasePointerCapture(previous);
        }
      } catch {}
    }

    activePointerRef.current = event.pointerId;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}

    updateFromPointer(
      event.clientX,
      event.clientY,
    );

    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (
      activePointerRef.current !==
      event.pointerId
    ) {
      return;
    }

    updateFromPointer(
      event.clientX,
      event.clientY,
    );

    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (
      activePointerRef.current !==
      event.pointerId
    ) {
      return;
    }

    reset();

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="ares-mobile-joystick"
      aria-label="Move BOBU"
    >
      <div
        ref={baseRef}
        className="ares-mobile-joystick__base"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
      >
        <div className="ares-mobile-joystick__ring" />

        <div
          className="ares-mobile-joystick__knob"
          style={{
            transform: `translate3d(${knob.x}px, ${knob.y}px, 0)`,
          }}
        />
      </div>
    </div>
  );
}
