import { supabase } from "../../lib/supabase";

export type AdminLiveOperationType =
  | "reward"
  | "mining_started"
  | "mining_claimed"
  | "builder_joined"
  | "referral_created"
  | "identity_verified";

export type AdminLiveOperationEntryType =
  | "credit"
  | "debit"
  | null;

export interface AdminLiveOperationsMetrics {
  newBuildersToday: number;
  activeMiners: number;
  gpCreditsToday: number;
  gpDebitsToday: number;
  verificationsToday: number;
  referralsToday: number;
}

export interface AdminLiveOperationEvent {
  eventId: string;
  eventType: AdminLiveOperationType;
  builderId: string;
  username: string | null;
  displayName: string | null;
  title: string;
  description: string;
  amount: number | null;
  entryType: AdminLiveOperationEntryType;
  provider: string | null;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface AdminLiveOperations {
  generatedAt: string;
  metrics: AdminLiveOperationsMetrics;
  events: AdminLiveOperationEvent[];
}

interface AdminLiveOperationsRpcResponse {
  generatedAt?: unknown;
  metrics?: {
    newBuildersToday?: unknown;
    activeMiners?: unknown;
    gpCreditsToday?: unknown;
    gpDebitsToday?: unknown;
    verificationsToday?: unknown;
    referralsToday?: unknown;
  };
  events?: Array<{
    eventId?: unknown;
    eventType?: unknown;
    builderId?: unknown;
    username?: unknown;
    displayName?: unknown;
    title?: unknown;
    description?: unknown;
    amount?: unknown;
    entryType?: unknown;
    provider?: unknown;
    occurredAt?: unknown;
    metadata?: unknown;
  }>;
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? Math.max(0, parsed)
    : 0;
}

function normalizeNullableNumber(
  value: unknown,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
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
  return typeof value === "string" && value.length > 0
    ? value
    : null;
}

function normalizeEventType(
  value: unknown,
): AdminLiveOperationType {
  switch (value) {
    case "mining_started":
    case "mining_claimed":
    case "builder_joined":
    case "referral_created":
    case "identity_verified":
      return value;

    default:
      return "reward";
  }
}

function normalizeEntryType(
  value: unknown,
): AdminLiveOperationEntryType {
  if (value === "credit" || value === "debit") {
    return value;
  }

  return null;
}

export const AdminLiveOperationsService = {
  async getLiveOperations(
    eventLimit = 20,
  ): Promise<AdminLiveOperations> {
    const normalizedLimit = Math.min(
      Math.max(Math.trunc(eventLimit), 1),
      100,
    );

    const { data, error } = await supabase.rpc(
      "get_admin_live_operations",
      {
        p_event_limit: normalizedLimit,
      },
    );

    if (error) {
      throw new Error(
        `Unable to load Live Operations: ${error.message}`,
      );
    }

    if (!data || typeof data !== "object") {
      throw new Error(
        "Live Operations returned an invalid response.",
      );
    }

    const response =
      data as AdminLiveOperationsRpcResponse;

    const metrics = response.metrics ?? {};

    const events = Array.isArray(response.events)
      ? response.events
      : [];

    return {
      generatedAt: normalizeString(
        response.generatedAt,
        new Date().toISOString(),
      ),

      metrics: {
        newBuildersToday: normalizeNumber(
          metrics.newBuildersToday,
        ),
        activeMiners: normalizeNumber(
          metrics.activeMiners,
        ),
        gpCreditsToday: normalizeNumber(
          metrics.gpCreditsToday,
        ),
        gpDebitsToday: normalizeNumber(
          metrics.gpDebitsToday,
        ),
        verificationsToday: normalizeNumber(
          metrics.verificationsToday,
        ),
        referralsToday: normalizeNumber(
          metrics.referralsToday,
        ),
      },

      events: events.map((event, index) => ({
        eventId: normalizeString(
          event.eventId,
          `operation-${index}`,
        ),
        eventType: normalizeEventType(
          event.eventType,
        ),
        builderId: normalizeString(
          event.builderId,
        ),
        username: normalizeNullableString(
          event.username,
        ),
        displayName: normalizeNullableString(
          event.displayName,
        ),
        title: normalizeString(
          event.title,
          "Operational event",
        ),
        description: normalizeString(
          event.description,
        ),
        amount: normalizeNullableNumber(
          event.amount,
        ),
        entryType: normalizeEntryType(
          event.entryType,
        ),
        provider: normalizeNullableString(
          event.provider,
        ),
        occurredAt: normalizeString(
          event.occurredAt,
          new Date().toISOString(),
        ),
        metadata:
          event.metadata &&
          typeof event.metadata === "object" &&
          !Array.isArray(event.metadata)
            ? event.metadata as Record<string, unknown>
            : {},
      })),
    };
  },
};
