import { useEffect } from "react";
import { gameEngine } from "./engine";

export function useGameEngine(): void {
  useEffect(() => {
    gameEngine.start();

    return () => {
      gameEngine.stop();
    };
  }, []);
}
