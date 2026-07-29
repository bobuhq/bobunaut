import {
  useEffect,
  useRef,
  useState,
} from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

export function AnimatedNumber({
  value,
  duration = 1100,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const difference = value - startValue;
    const startedAt = performance.now();
    let animationFrame = 0;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startedAt;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress =
        1 - Math.pow(1 - progress, 3);

      setDisplayValue(
        Math.round(
          startValue + difference * easedProgress,
        ),
      );

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        previousValue.current = value;
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [duration, value]);

  return <>{displayValue.toLocaleString()}</>;
}
