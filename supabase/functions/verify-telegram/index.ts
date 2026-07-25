import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type VerifyTelegramRequest = {
  telegram_user_id?: number | string;
};

type TelegramMemberResponse = {
  ok: boolean;
  result?: {
    status?: string;
  };
  description?: string;
};

const memberStatuses = new Set([
  "creator",
  "administrator",
  "member",
  "restricted",
]);

export default {
  fetch: withSupabase(
    { auth: ["publishable", "secret"] },
    async (req) => {
      if (req.method !== "POST") {
        return Response.json(
          { error: "Method not allowed." },
          { status: 405 },
        );
      }

      let body: VerifyTelegramRequest;

      try {
        body = await req.json();
      } catch {
        return Response.json(
          { error: "Invalid JSON body." },
          { status: 400 },
        );
      }

      const telegramUserId = String(body.telegram_user_id ?? "").trim();

      if (!/^\d+$/.test(telegramUserId)) {
        return Response.json(
          { error: "A valid Telegram user ID is required." },
          { status: 400 },
        );
      }

      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

      if (!botToken || !chatId) {
        console.error("Telegram secrets are missing.");

        return Response.json(
          { error: "Telegram verification is not configured." },
          { status: 500 },
        );
      }

      const telegramUrl = new URL(
        `https://api.telegram.org/bot${botToken}/getChatMember`,
      );

      telegramUrl.searchParams.set("chat_id", chatId);
      telegramUrl.searchParams.set("user_id", telegramUserId);

      try {
        const telegramResponse = await fetch(telegramUrl);
        const telegramData =
          await telegramResponse.json() as TelegramMemberResponse;

        if (!telegramResponse.ok || !telegramData.ok) {
          console.error(
            "Telegram API error:",
            telegramData.description ?? telegramResponse.statusText,
          );

          return Response.json(
            {
              verified: false,
              error: "Telegram membership could not be verified.",
            },
            { status: 502 },
          );
        }

        const status = telegramData.result?.status ?? "unknown";
        const verified = memberStatuses.has(status);

        return Response.json({
          verified,
          status,
        });
      } catch (error) {
        console.error("Telegram verification request failed:", error);

        return Response.json(
          {
            verified: false,
            error: "Telegram verification service is temporarily unavailable.",
          },
          { status: 503 },
        );
      }
    },
  ),
};
