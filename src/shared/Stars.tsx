import type { CSSProperties } from "react";

type Star = {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

function seeded(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const stars: Star[] = Array.from({ length: 170 }, (_, index) => ({
  left: seeded(index + 11) * 100,
  top: seeded(index + 101) * 100,
  size: 0.8 + seeded(index + 211) * 2.2,
  delay: seeded(index + 307) * 7,
  duration: 2.6 + seeded(index + 401) * 5.4,
  opacity: 0.3 + seeded(index + 503) * 0.7,
}));

export function Stars() {
  return (
    <div
      className="stars"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <div className="nebula nebula-one" />
      <div className="nebula nebula-two" />

      {stars.map((star, index) => {
        const style = {
          left: `${star.left}%`,
          top: `${star.top}%`,
          width: `${star.size}px`,
          height: `${star.size}px`,
          opacity: star.opacity,
          animationDelay: `${star.delay}s`,
          animationDuration: `${star.duration}s`,
        } satisfies CSSProperties;

        return <i key={index} style={style} />;
      })}

      <span className="shooting shooting-one" />
      <span className="shooting shooting-two" />
      <span className="shooting shooting-three" />
    </div>
  );
}