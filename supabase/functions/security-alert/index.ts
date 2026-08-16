import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type SecuritySeverity =
  | "info"
  | "warning"
  | "critical";

type SecurityAlertPayload = {
  eventType?: string;
  severity?: SecuritySeverity;
  source?: string;
  actorUserId?: string | null;
  sourceIp?: string | null;
  count?: number;
  window?: string;
  action?: string;
  metadata?: Record<string, unknown>;
};

function cleanText(
  value: unknown,
  fallback: string,
  maxLength = 120,
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

function safeCount(value: unknown): number {
  const parsed = Number(value ?? 1);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(
    Math.max(Math.trunc(parsed), 1),
    1000000,
  );
}

async function sha256(
  value: string,
): Promise<string> {
  const encoded =
    new TextEncoder().encode(value);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      encoded,
    );

  return Array.from(
    new Uint8Array(digest),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    },
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Security Telegram alert failed:",
      errorText,
    );

    throw new Error(
      "Security alert could not be delivered.",
    );
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Method not allowed." },
        { status: 405 },
      );
    }

    const botToken =
      Deno.env.get("TELEGRAM_BOT_TOKEN");

    const securityChatId =
      Deno.env.get(
        "BOBU_SECURITY_TELEGRAM_CHAT_ID",
      );

    const alertSecret =
      Deno.env.get(
        "BOBU_SECURITY_ALERT_SECRET",
      );

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    if (
      !botToken ||
      !securityChatId ||
      !alertSecret ||
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "Security alert environment is incomplete.",
      );

      return Response.json(
        {
          error:
            "Server configuration incomplete.",
        },
        { status: 500 },
      );
    }

    const suppliedSecret =
      req.headers.get(
        "X-BOBU-Security-Secret",
      );

    if (suppliedSecret !== alertSecret) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    let rawPayload: SecurityAlertPayload;

    try {
      rawPayload =
        (await req.json()) as
          SecurityAlertPayload;
    } catch {
      return Response.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    const severity:
      SecuritySeverity =
      rawPayload.severity === "critical"
        ? "critical"
        : rawPayload.severity === "warning"
          ? "warning"
          : "info";

    const eventType =
      cleanText(
        rawPayload.eventType,
        "unknown_event",
      );

    const source =
      cleanText(
        rawPayload.source,
        "unknown_source",
      );

    const action =
      cleanText(
        rawPayload.action,
        "recorded",
      );

    const count =
      safeCount(rawPayload.count);

    const windowLabel =
      cleanText(
        rawPayload.window,
        "single event",
        80,
      );

    const actorUserId =
      typeof rawPayload.actorUserId ===
          "string" &&
        rawPayload.actorUserId.trim()
        ? rawPayload.actorUserId.trim()
        : null;

    const forwardedFor =
      req.headers.get("x-forwarded-for");

    const forwardedIp =
      forwardedFor
        ?.split(",")[0]
        ?.trim() ?? null;

    const connectingIp =
      req.headers.get("cf-connecting-ip")
        ?.trim() ?? null;

    const payloadIp =
      typeof rawPayload.sourceIp ===
          "string" &&
        rawPayload.sourceIp.trim()
        ? rawPayload.sourceIp.trim()
        : null;

    const sourceIp =
      connectingIp ||
      forwardedIp ||
      payloadIp;

    const metadata =
      rawPayload.metadata &&
      typeof rawPayload.metadata ===
        "object" &&
      !Array.isArray(rawPayload.metadata)
        ? rawPayload.metadata
        : {};

    const fingerprint =
      await sha256(
        [
          eventType,
          source,
          sourceIp ?? "no-ip",
          actorUserId ?? "anonymous",
        ].join("|"),
      );

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

    const {
      error: insertError,
    } = await adminClient
      .from("bobu_security_events")
      .insert({
        event_type: eventType,
        severity,
        source,
        actor_user_id: actorUserId,
        source_ip: sourceIp,
        metadata: {
          ...metadata,
          action,
          count,
          window: windowLabel,
          fingerprint,
        },
      });

    if (insertError) {
      console.error(
        "Security event insert failed:",
        insertError,
      );

      return Response.json(
        {
          error:
            "Security event could not be recorded.",
        },
        { status: 500 },
      );
    }

    if (severity === "info") {
      return Response.json({
        accepted: true,
        recorded: true,
        delivered: false,
        reason:
          "severity_not_alertable",
      });
    }

    const {
      data: alertReserved,
      error: reservationError,
    } = await adminClient.rpc(
      "reserve_bobu_security_alert",
      {
        p_fingerprint: fingerprint,
        p_cooldown_seconds: 300,
      },
    );

    if (reservationError) {
      console.error(
        "Security alert reservation failed:",
        reservationError,
      );

      return Response.json(
        {
          error:
            "Security alert cooldown could not be evaluated.",
        },
        { status: 500 },
      );
    }

    if (alertReserved !== true) {
      return Response.json({
        accepted: true,
        recorded: true,
        delivered: false,
        reason: "cooldown_active",
      });
    }

    const text = [
      "🚨 BOBU SECURITY ALERT",
      "",
      `Severity: ${severity.toUpperCase()}`,
      `Event: ${eventType}`,
      `Source: ${source}`,
      `Actor: ${
        actorUserId ?? "anonymous"
      }`,
      `Source IP: ${
        sourceIp ?? "unknown"
      }`,
      `Count: ${count}`,
      `Window: ${windowLabel}`,
      `Action: ${action}`,
      `Time: ${
        new Date().toISOString()
      }`,
      "",
      "BOBU Security Engine",
    ].join("\n");

    await sendTelegramMessage(
      botToken,
      securityChatId,
      text,
    );

    return Response.json({
      accepted: true,
      recorded: true,
      delivered: true,
    });
  },
};
