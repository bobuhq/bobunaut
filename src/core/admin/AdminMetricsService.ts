import { supabase } from "../../lib/supabase";

export interface AdminDashboardMetrics {
  totalBuilders: number;
  activeToday: number;
  totalGp: number;
  activeMiners: number;
}

interface AdminDashboardMetricsRow {
  total_builders: number;
  active_today: number;
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
      totalBuilders: normalizeMetric(
        metrics.total_builders,
      ),
      activeToday: normalizeMetric(
        metrics.active_today,
      ),
      totalGp: normalizeMetric(metrics.total_gp),
      activeMiners: normalizeMetric(
        metrics.active_miners,
      ),
    };
  },
};
