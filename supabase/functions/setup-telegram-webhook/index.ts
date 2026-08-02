import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type TelegramWebhookResponse = {
  ok: boolean;
  result?: boolean;
  description?: string;
};

export default {
  fetch: withSupabase(
    { auth: ["secret"] },
    async (req) => {
      if (req.method !== "POST") {
        return Response.json(
          { error: "Method not allowed." },
          { status: 405 },
        );
      }

      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const projectRef = Deno.env.get("SB_PROJECT_REF");
      const webhookSecret = Deno.env.get(
        "TELEGRAM_WEBHOOK_SECRET",
      );

      if (
        !botToken ||
        !projectRef ||
        !webhookSecret
      ) {
        console.error("Required environment variables are missing.");

        return Response.json(
          { error: "Webhook setup is not configured." },
          { status: 500 },
        );
      }

      const webhookUrl =
        `https://${projectRef}.supabase.co/functions/v1/telegram-webhook`;

      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: webhookSecret,
            allowed_updates: ["message"],
            drop_pending_updates: true,
          }),
        },
      );

      const telegramData =
        await telegramResponse.json() as TelegramWebhookResponse;

      if (!telegramResponse.ok || !telegramData.ok) {
        console.error(
          "Telegram setWebhook failed:",
          telegramData.description,
        );

        return Response.json(
          {
            success: false,
            error: telegramData.description ??
              "Telegram webhook could not be configured.",
          },
          { status: 502 },
        );
      }

      return Response.json({
        success: true,
        message: telegramData.description,
        webhook_url: webhookUrl,
      });
    },
  ),
};
