import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

type AnimatedCounterProps = {
  value: number;
  duration?: number;
  suffix?: string;
  live?: boolean;
  liveStep?: number;
  liveInterval?: number;
};

export function AnimatedCounter({
  value,
  duration = 1200,
  suffix = "",
  live = false,
  liveStep = 1,
  liveInterval = 3000,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!isInView) return;

    if (reduceMotion) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    const start = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [duration, isInView, reduceMotion, value]);

  useEffect(() => {
    if (!live || !isInView || reduceMotion) return;

    const intervalId = window.setInterval(() => {
      setDisplayValue((current) => current + liveStep);
    }, liveInterval);

    return () => window.clearInterval(intervalId);
  }, [isInView, live, liveInterval, liveStep, reduceMotion]);

  return (
    <span ref={ref}>
      {displayValue.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
