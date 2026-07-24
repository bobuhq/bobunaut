import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import "./CinematicBackground.css";

type Star = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
  pulse: number;
};

export function CinematicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const canvasElement: HTMLCanvasElement = canvas;
    const drawingContext: CanvasRenderingContext2D = context;

    let animationFrame = 0;
    let stars: Star[] = [];
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    function createStars() {
      const starCount = Math.min(
        320,
        Math.max(120, Math.floor((width * height) / 6500)),
      );

      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.25 + 0.2,
        speed: Math.random() * 0.12 + 0.025,
        opacity: Math.random() * 0.65 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      }));
    }

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvasElement.width = Math.floor(width * pixelRatio);
      canvasElement.height = Math.floor(height * pixelRatio);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;

      drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createStars();
    }

    function draw(time: number) {
      drawingContext.clearRect(0, 0, width, height);

      for (const star of stars) {
        const pulse = reduceMotion
          ? 1
          : 0.72 + Math.sin(time * 0.0012 + star.pulse) * 0.28;

        drawingContext.beginPath();
        drawingContext.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        drawingContext.fillStyle = `rgba(220, 230, 255, ${
          star.opacity * pulse
        })`;
        drawingContext.fill();

        if (!reduceMotion) {
          star.y += star.speed;

          if (star.y > height + 4) {
            star.y = -4;
            star.x = Math.random() * width;
          }
        }
      }

      animationFrame = requestAnimationFrame(draw);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animationFrame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, [reduceMotion]);

  return (
    <div className="cinematic-background" aria-hidden="true">
      <div className="cinematic-nebula cinematic-nebula-one" />
      <div className="cinematic-nebula cinematic-nebula-two" />
      <div className="cinematic-nebula cinematic-nebula-three" />

      <canvas
        ref={canvasRef}
        className="cinematic-starfield"
      />

      <div className="cinematic-vignette" />
      <div className="cinematic-noise" />
    </div>
  );
}
