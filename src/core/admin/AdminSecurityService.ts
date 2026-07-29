import { supabase } from "../../lib/supabase";

import type { AdminRole } from "./AdminAccessService";

export type AdminAuditSeverity =
  | "info"
  | "warning"
  | "critical";

export interface AdminSecuritySummary {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  owners: number;
  criticalEvents: number;
}

export interface AdminSecurityUser {
  userId: string;
  email: string | null;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  authCreatedAt: string | null;
  lastSignInAt: string | null;
}

export interface AdminSecurityEvent {
  auditId: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  severity: AdminAuditSeverity;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminSecurityCenter {
  generatedAt: string;
  summary: AdminSecuritySummary;
  admins: AdminSecurityUser[];
  recentEvents: AdminSecurityEvent[];
}

interface AdminSecurityCenterRpc {
  generatedAt?: unknown;
  summary?: Record<string, unknown>;
  admins?: Record<string, unknown>[];
  recentEvents?: Record<string, unknown>[];
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? Math.max(0, parsed)
    : 0;
}

function normalizeString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function normalizeNullableString(
  value: unknown,
): string | null {
  return typeof value === "string" &&
    value.length > 0
    ? value
    : null;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeRole(value: unknown): AdminRole {
  switch (value) {
    case "owner":
    case "support":
    case "analyst":
      return value;

    default:
      return "admin";
  }
}

function normalizeSeverity(
  value: unknown,
): AdminAuditSeverity {
  if (value === "warning" || value === "critical") {
    return value;
  }

  return "info";
}

function normalizeMetadata(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

export const AdminSecurityService = {
  async getSecurityCenter(
    eventLimit = 10,
  ): Promise<AdminSecurityCenter> {
    const limit = Math.min(
      Math.max(Math.trunc(eventLimit), 1),
      50,
    );

    const { data, error } = await supabase.rpc(
      "get_admin_security_center",
      {
        p_event_limit: limit,
      },
    );

    if (error) {
      throw new Error(
        `Unable to load Security Center: ${error.message}`,
      );
    }

    if (!data || typeof data !== "object") {
      throw new Error(
        "Security Center returned an invalid response.",
      );
    }

    const response = data as AdminSecurityCenterRpc;
    const summary = response.summary ?? {};

    const admins = Array.isArray(response.admins)
      ? response.admins
      : [];

    const recentEvents = Array.isArray(
      response.recentEvents,
    )
      ? response.recentEvents
      : [];

    return {
      generatedAt: normalizeString(
        response.generatedAt,
        new Date().toISOString(),
      ),

      summary: {
        totalAdmins: normalizeNumber(
          summary.totalAdmins,
        ),
        activeAdmins: normalizeNumber(
          summary.activeAdmins,
        ),
        inactiveAdmins: normalizeNumber(
          summary.inactiveAdmins,
        ),
        owners: normalizeNumber(summary.owners),
        criticalEvents: normalizeNumber(
          summary.criticalEvents,
        ),
      },

      admins: admins.map((admin) => ({
        userId: normalizeString(admin.userId),
        email: normalizeNullableString(admin.email),
        role: normalizeRole(admin.role),
        active: normalizeBoolean(admin.active),
        createdAt: normalizeString(
          admin.createdAt,
          new Date().toISOString(),
        ),
        updatedAt: normalizeString(
          admin.updatedAt,
          new Date().toISOString(),
        ),
        createdBy: normalizeNullableString(
          admin.createdBy,
        ),
        authCreatedAt: normalizeNullableString(
          admin.authCreatedAt,
        ),
        lastSignInAt: normalizeNullableString(
          admin.lastSignInAt,
        ),
      })),

      recentEvents: recentEvents.map((event) => ({
        auditId: normalizeString(event.auditId),
        actorUserId: normalizeNullableString(
          event.actorUserId,
        ),
        actorEmail: normalizeNullableString(
          event.actorEmail,
        ),
        action: normalizeString(event.action),
        targetType: normalizeString(
          event.targetType,
        ),
        targetId: normalizeNullableString(
          event.targetId,
        ),
        severity: normalizeSeverity(
          event.severity,
        ),
        metadata: normalizeMetadata(
          event.metadata,
        ),
        createdAt: normalizeString(
          event.createdAt,
          new Date().toISOString(),
        ),
      })),
    };
  },
};
