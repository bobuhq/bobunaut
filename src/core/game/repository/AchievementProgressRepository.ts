import { supabase } from "../../../lib/supabase";
import type { AchievementProgress } from "../models";

export class AchievementProgressRepository {
  async loadByBuilder(): Promise<AchievementProgress[]> {
    const { data, error } = await supabase
      .from("achievement_progress")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data ?? []) as AchievementProgress[];
  }

  async loadOne(
    achievementId: string
  ): Promise<AchievementProgress | null> {
    const { data, error } = await supabase
      .from("achievement_progress")
      .select("*")
      .eq("achievement_id", achievementId)
      .maybeSingle();

    if (error) throw error;

    return data as AchievementProgress | null;
  }

  async saveMine(
    progress: AchievementProgress
  ): Promise<AchievementProgress> {
    const { data, error } = await supabase.rpc(
      "save_my_achievement_progress",
      {
        p_achievement_id: progress.achievementId,
        p_status: progress.status,
        p_progress: progress.progress,
        p_version: progress.version,
        p_last_event_at: progress.lastEventAt ?? null,
        p_unlocked_at: progress.unlockedAt ?? null,
        p_claimed_at: progress.claimedAt ?? null,
      }
    );

    if (error) throw error;

    return data as AchievementProgress;
  }
}

export const achievementProgressRepository =
  new AchievementProgressRepository();
