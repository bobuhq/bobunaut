import {
import { marsAudio } from "../audio/MarsAudioEngine";
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

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
  }, [onMove]);

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
    void marsAudio.unlock();
    activePointerRef.current =
      event.pointerId;

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

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

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    reset();

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
