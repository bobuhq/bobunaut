import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
};

type TelegramMessage = {
  text?: string;
  from?: TelegramUser;
  chat?: TelegramChat;
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
};

async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
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
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Telegram sendMessage failed:", errorText);
    throw new Error("Telegram message could not be sent.");
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

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const webhookSecret = Deno.env.get(
      "TELEGRAM_WEBHOOK_SECRET",
    );

    if (
      !botToken ||
      !supabaseUrl ||
      !serviceRoleKey ||
      !webhookSecret
    ) {
      console.error("Required environment variables are missing.");

      return Response.json(
        { error: "Server configuration is incomplete." },
        { status: 500 },
      );
    }

    const telegramSecret =
      req.headers.get(
        "X-Telegram-Bot-Api-Secret-Token",
      );

    if (telegramSecret !== webhookSecret) {
      console.error(
        "Telegram webhook secret validation failed.",
      );

      return Response.json(
        { error: "Unauthorized webhook request." },
        { status: 401 },
      );
    }

    let update: TelegramUpdate;

    try {
      update = await req.json();
    } catch {
      return Response.json(
        { error: "Invalid Telegram update." },
        { status: 400 },
      );
    }

    const message = update.message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;
    const telegramUser = message?.from;

    if (!message || chatId === undefined || !telegramUser) {
      return Response.json({ ok: true });
    }

    console.log("Telegram update received:", {
      update_id: update.update_id,
      telegram_user_id: String(telegramUser.id),
      username: telegramUser.username ?? null,
      command: text ?? null,
    });

    if (!text?.startsWith("/start")) {
      return Response.json({ ok: true });
    }

    const firstName = telegramUser.first_name?.trim() || "Builder";
    const startToken = text.split(/\s+/)[1]?.trim();

    if (!startToken) {
      await sendTelegramMessage(
        botToken,
        chatId,
        [
          `🚀 Welcome Builder ${firstName}!`,
          "",
          "Open Telegram from the Verify Telegram button on bobunaut.com.",
          "",
          "This will securely connect your Builder account.",
        ].join("\n"),
      );

      return Response.json({ ok: true });
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const tokenHash = await sha256(startToken);
    const telegramUserId = String(telegramUser.id);

    const {
      data: linkResult,
      error: linkError,
    } = await adminClient.rpc(
      "link_telegram_identity",
      {
        p_token_hash: tokenHash,
        p_provider_user_id: telegramUserId,
        p_username:
          telegramUser.username ?? null,
      },
    );

    if (linkError) {
      console.error(
        "Atomic Telegram identity link failed:",
        linkError.message,
      );

      await sendTelegramMessage(
        botToken,
        chatId,
        "Your Telegram account could not be linked. Please try again.",
      );

      return Response.json({ ok: true });
    }

    const linkRow = Array.isArray(linkResult)
      ? linkResult[0]
      : linkResult;

    const linked = linkRow?.linked === true;
    const reason =
      typeof linkRow?.reason === "string"
        ? linkRow.reason
        : "unknown";

    if (!linked) {
      if (reason === "identity_already_linked") {
        await sendTelegramMessage(
          botToken,
          chatId,
          [
            "This Telegram account is already connected to another Builder account.",
            "",
            "Only one Builder account can use each Telegram identity.",
          ].join("\n"),
        );

        return Response.json({ ok: true });
      }

      if (
        reason === "token_expired" ||
        reason === "token_already_used" ||
        reason === "token_not_found"
      ) {
        await sendTelegramMessage(
          botToken,
          chatId,
          [
            "This verification link is invalid or has expired.",
            "",
            "Return to bobunaut.com and create a new Telegram verification link.",
          ].join("\n"),
        );

        return Response.json({ ok: true });
      }

      console.error(
        "Telegram identity link rejected:",
        reason,
      );

      await sendTelegramMessage(
        botToken,
        chatId,
        "Verification could not be completed. Please try again later.",
      );

      return Response.json({ ok: true });
    }

    await sendTelegramMessage(
      botToken,
      chatId,
      [
        `🚀 Welcome Builder ${firstName}!`,
        "",
        "Your Telegram account has been linked successfully.",
        "",
        "Return to bobunaut.com and click “Verify Telegram” to complete your Genesis Checkpoint.",
        "",
        "See you in the Universe. 🌌",
      ].join("\n"),
    );

    return Response.json({ ok: true });
  },
};
