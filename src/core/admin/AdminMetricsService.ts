import { supabase } from "../../lib/supabase";

export interface AdminDashboardMetrics {
  totalRegisteredUsers: number;
  usersSinceLaunch: number;
  totalGp: number;
  activeMiners: number;
}

interface AdminDashboardMetricsRow {
  total_registered_users: number;
  users_since_launch: number;
  total_gp: number;
  active_miners: number;
}

function normalizeMetric(value: number | null | undefined): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(0, value);
}

export const AdminMetricsService = {
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const { data, error } = await supabase.rpc(
      "get_admin_dashboard_metrics",
    );

    if (error) {
      throw new Error(
        `Unable to load admin dashboard metrics: ${error.message}`,
      );
    }

    const rows = (data ?? []) as AdminDashboardMetricsRow[];
    const metrics = rows[0];

    if (!metrics) {
      throw new Error(
        "Admin dashboard metrics were not returned.",
      );
    }

    return {
      totalRegisteredUsers: normalizeMetric(
        metrics.total_registered_users,
      ),
      usersSinceLaunch: normalizeMetric(
        metrics.users_since_launch,
      ),
      totalGp: normalizeMetric(metrics.total_gp),
      activeMiners: normalizeMetric(metrics.active_miners),
    };
  },
};
