import type { LucideIcon } from "lucide-react";
import {
  RadioTower,
  Users,
  Sparkles,
  Gamepad2,
} from "lucide-react";

export interface MissionPresentation {
  category: string;
  difficulty: string;
  duration: string;
  action?: string;
  icon: LucideIcon;
}

export const missionPresentation: Record<
  string,
  MissionPresentation
> = {
  "start-mining": {
    category: "DAILY",
    difficulty: "Easy",
    duration: "1 min",
    action: "Start Mining",
    icon: RadioTower,
  },

  "join-community": {
    category: "COMMUNITY",
    difficulty: "Easy",
    duration: "3 min",
    action: "Open Channels",
    icon: Users,
  },

  "create-meme": {
    category: "CREATOR",
    difficulty: "Medium",
    duration: "10 min",
    action: "Start Creating",
    icon: Sparkles,
  },

  "arcade-coming-soon": {
    category: "ARCADE",
    difficulty: "Unknown",
    duration: "Coming Soon",
    icon: Gamepad2,
  },
};
