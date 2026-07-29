import { supabase } from "../../lib/supabase";

import type {
  AdminAuditSeverity,
  AdminSecurityEvent,
} from "./AdminSecurityService";

export interface AdminAuditLogsQuery {
  limit?: number;
  offset?: number;
  search?: string;
  action?: string;
  severity?: AdminAuditSeverity | "";
}

interface AdminAuditLogRow {
  audit_id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  severity: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function normalizeSeverity(
  value: string,
): AdminAuditSeverity {
  if (value === "warning" || value === "critical") {
    return value;
  }

  return "info";
}

export const AdminAuditLogsService = {
  async getAuditLogs(
    query: AdminAuditLogsQuery = {},
  ): Promise<AdminSecurityEvent[]> {
    const limit = Math.min(
      Math.max(Math.trunc(query.limit ?? 25), 1),
      100,
    );

    const offset = Math.max(
      Math.trunc(query.offset ?? 0),
      0,
    );

    const { data, error } = await supabase.rpc(
      "get_admin_audit_logs",
      {
        p_limit: limit,
        p_offset: offset,
        p_search: query.search?.trim() || null,
        p_action: query.action?.trim() || null,
        p_severity: query.severity || null,
      },
    );

    if (error) {
      throw new Error(
        `Unable to load Audit Logs: ${error.message}`,
      );
    }

    const rows = (data ?? []) as AdminAuditLogRow[];

    return rows.map((row) => ({
      auditId: row.audit_id,
      actorUserId: row.actor_user_id,
      actorEmail: row.actor_email,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      severity: normalizeSeverity(row.severity),
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    }));
  },
};
