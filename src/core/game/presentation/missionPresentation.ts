import type { LucideIcon } from "lucide-react";
import {
  RadioTower,
  Users,
  Sparkles,
  Gamepad2,
} from "lucide-react";

export interface MissionPresentation {
  categoryKey: string;
  difficultyKey: string;
  durationKey: string;
  actionKey?: string;
  icon: LucideIcon;
}

export const missionPresentation: Record<
  string,
  MissionPresentation
> = {
  "start-mining": {
    categoryKey:
      "missions.presentation.category.daily",
    difficultyKey:
      "missions.presentation.difficulty.easy",
    durationKey:
      "missions.presentation.duration.oneMinute",
    actionKey:
      "missions.presentation.action.startMining",
    icon: RadioTower,
  },

  "join-community": {
    categoryKey:
      "missions.presentation.category.community",
    difficultyKey:
      "missions.presentation.difficulty.easy",
    durationKey:
      "missions.presentation.duration.threeMinutes",
    actionKey:
      "missions.presentation.action.openChannels",
    icon: Users,
  },

  "create-meme": {
    categoryKey:
      "missions.presentation.category.creator",
    difficultyKey:
      "missions.presentation.difficulty.medium",
    durationKey:
      "missions.presentation.duration.tenMinutes",
    actionKey:
      "missions.presentation.action.startCreating",
    icon: Sparkles,
  },

  "arcade-coming-soon": {
    categoryKey:
      "missions.presentation.category.arcade",
    difficultyKey:
      "missions.presentation.difficulty.unknown",
    durationKey:
      "missions.presentation.duration.comingSoon",
    icon: Gamepad2,
  },
};
