import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
  is_bot?: boolean;
};

type TelegramChat = {
  id: number;
  type?: "private" | "group" | "supergroup" | "channel";
};

type TelegramPhotoSize = {
  file_id: string;
  file_unique_id?: string;
  width?: number;
  height?: number;
  file_size?: number;
};

type TelegramMessage = {
  message_id?: number;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
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

type TelegramInlineKeyboard = {
  inline_keyboard: Array<
    Array<{
      text: string;
      url: string;
    }>
  >;
};

async function telegramApiCall(
  botToken: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `Telegram ${method} failed:`,
      errorText,
    );
    throw new Error(
      `Telegram moderation action ${method} failed.`,
    );
  }
}

type TelegramChatMemberResult = {
  ok?: boolean;
  result?: {
    status?: string;
  };
};

async function isTelegramAdmin(
  botToken: string,
  chatId: number,
  userId: number,
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          user_id: userId,
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "Telegram getChatMember failed:",
        await response.text(),
      );

      /*
       * Safety rule:
       * if Telegram cannot confirm membership status,
       * never auto-moderate the sender.
       */
      return true;
    }

    const data =
      await response.json() as TelegramChatMemberResult;

    return (
      data.result?.status === "creator" ||
      data.result?.status === "administrator"
    );
  } catch (error) {
    console.error(
      "Telegram admin check failed:",
      error,
    );

    /*
     * Fail closed for moderation:
     * if admin status cannot be established, do not
     * automatically punish the account.
     */
    return true;
  }
}

function normalizeModerationText(
  value: string,
): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function containsHighConfidenceSpam(
  value: string,
): boolean {
  if (!value) {
    return false;
  }

  const text = normalizeModerationText(value);

  /*
   * High-confidence adult/spam combinations only.
   * Avoid broad single-word rules that could punish
   * legitimate community discussion.
   */
  const adultSignals = [
    /\bonlyfans\b/i,
    /\bfree\s+nudes?\b/i,
    /\b(?:nude|nudes|porn|xxx)\s+(?:video|videos|photo|photos|pics?|content|channel|group|link)\b/i,
    /\b(?:watch|join|click|open)\b.{0,35}\b(?:porn|xxx|nudes?)\b/i,
    /\b(?:porn|xxx|nudes?)\b.{0,35}\b(?:t\.me|telegram|http:\/\/|https:\/\/)/i,
  ];

  const scamSignals = [
    /\b(?:guaranteed|instant)\s+(?:crypto\s+)?profit\b/i,
    /\b(?:double|triple)\s+your\s+(?:crypto|btc|eth|money)\b/i,
    /\b(?:send|deposit)\s+(?:btc|eth|usdt|crypto).{0,35}\b(?:receive|get|return)\b/i,
    /\b(?:wallet|airdrop)\s+(?:validation|verification).{0,35}\b(?:seed|phrase|private\s+key)\b/i,
    /\b(?:seed\s+phrase|private\s+key)\b.{0,35}\b(?:send|enter|verify|connect)\b/i,
  ];

  return [...adultSignals, ...scamSignals]
    .some((pattern) => pattern.test(text));
}

type TelegramFileResult = {
  ok?: boolean;
  result?: {
    file_path?: string;
  };
};

type ImageModerationDecision = {
  unsafe: boolean;
  confidence: number;
  reason: string;
};

function extractOpenAIOutputText(
  data: Record<string, unknown>,
): string {
  const output = data.output;

  if (!Array.isArray(output)) {
    return "";
  }

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content =
      (item as Record<string, unknown>).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const value =
        part as Record<string, unknown>;

      if (
        value.type === "output_text" &&
        typeof value.text === "string"
      ) {
        return value.text;
      }
    }
  }

  return "";
}

async function getTelegramFileUrl(
  botToken: string,
  fileId: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_id: fileId,
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "Telegram getFile failed:",
        await response.text(),
      );
      return null;
    }

    const data =
      await response.json() as TelegramFileResult;

    const filePath = data.result?.file_path;

    if (!filePath) {
      return null;
    }

    return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  } catch (error) {
    console.error(
      "Telegram getFile request failed:",
      error,
    );
    return null;
  }
}

async function moderateTelegramImage(
  botToken: string,
  openAIKey: string,
  openAIModel: string,
  photo: TelegramPhotoSize[],
): Promise<ImageModerationDecision> {
  const safe: ImageModerationDecision = {
    unsafe: false,
    confidence: 0,
    reason: "not_classified",
  };

  if (!photo.length) {
    return safe;
  }

  /*
   * Telegram sends multiple sizes for the same photo.
   * The final entry is normally the largest version.
   */
  const largestPhoto = photo[photo.length - 1];

  if (!largestPhoto?.file_id) {
    return safe;
  }

  const fileUrl = await getTelegramFileUrl(
    botToken,
    largestPhoto.file_id,
  );

  if (!fileUrl) {
    return safe;
  }

  let imageDataUrl: string;

  try {
    const imageResponse = await fetch(fileUrl);

    if (!imageResponse.ok) {
      console.error(
        "Telegram image download failed:",
        imageResponse.status,
      );
      return safe;
    }

    const contentType =
      imageResponse.headers.get("content-type") ??
      "image/jpeg";

    if (!contentType.startsWith("image/")) {
      console.error(
        "Telegram media is not an image:",
        contentType,
      );
      return safe;
    }

    const imageBytes =
      new Uint8Array(
        await imageResponse.arrayBuffer(),
      );

    /*
     * Keep moderation bounded. Telegram photos are
     * compressed, but reject unexpectedly large files.
     */
    if (
      imageBytes.byteLength === 0 ||
      imageBytes.byteLength > 8 * 1024 * 1024
    ) {
      console.error(
        "Telegram image size rejected:",
        imageBytes.byteLength,
      );
      return safe;
    }

    let binary = "";

    for (
      let offset = 0;
      offset < imageBytes.length;
      offset += 0x8000
    ) {
      binary += String.fromCharCode(
        ...imageBytes.subarray(
          offset,
          offset + 0x8000,
        ),
      );
    }

    imageDataUrl =
      `data:${contentType};base64,${btoa(binary)}`;
  } catch (error) {
    console.error(
      "Telegram image download failed:",
      error,
    );
    return safe;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    15_000,
  );

  try {
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: openAIModel,
          reasoning: {
            effort: "low",
          },
          instructions: [
            "You are a strict Telegram community image moderation classifier.",
            "Determine whether the image is clearly pornographic or explicit adult sexual spam.",
            "Do not flag ordinary people, swimwear, fitness, art, memes, medical material, or ambiguous images.",
            "Only classify unsafe when explicit sexual content is visually clear.",
            "Return ONLY compact JSON with this exact shape:",
            '{"unsafe":boolean,"confidence":number,"reason":"short_reason"}',
            "confidence must be between 0 and 1.",
          ].join(" "),
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text:
                    "Classify this Telegram group image for explicit pornographic/adult sexual spam.",
                },
                {
                  type: "input_image",
                  image_url: imageDataUrl,
                },
              ],
            },
          ],
          max_output_tokens: 120,
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "Telegram image moderation OpenAI request failed:",
        response.status,
        await response.text(),
      );
      return safe;
    }

    const data =
      await response.json() as Record<string, unknown>;

    const outputText =
      extractOpenAIOutputText(data).trim();

    if (!outputText) {
      return safe;
    }

    const cleaned = outputText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error(
        "Telegram image moderation returned invalid JSON.",
      );
      return safe;
    }

    if (!parsed || typeof parsed !== "object") {
      return safe;
    }

    const result =
      parsed as Record<string, unknown>;

    const unsafe = result.unsafe === true;
    const confidence =
      typeof result.confidence === "number"
        ? Math.max(
            0,
            Math.min(1, result.confidence),
          )
        : 0;

    const reason =
      typeof result.reason === "string"
        ? result.reason.slice(0, 120)
        : "unknown";

    return {
      unsafe,
      confidence,
      reason,
    };
  } catch (error) {
    console.error(
      "Telegram image moderation failed:",
      error,
    );

    /*
     * Fail safe:
     * AI/network failure must never automatically
     * punish a legitimate community member.
     */
    return safe;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function removeHumanSpam(
  botToken: string,
  chatId: number,
  messageId: number,
  userId: number,
): Promise<void> {
  await telegramApiCall(
    botToken,
    "deleteMessage",
    {
      chat_id: chatId,
      message_id: messageId,
    },
  );

  await telegramApiCall(
    botToken,
    "banChatMember",
    {
      chat_id: chatId,
      user_id: userId,
      revoke_messages: true,
    },
  );
}

async function removeBotSpam(
  botToken: string,
  chatId: number,
  messageId: number,
  userId: number,
): Promise<void> {
  await telegramApiCall(
    botToken,
    "deleteMessage",
    {
      chat_id: chatId,
      message_id: messageId,
    },
  );

  await telegramApiCall(
    botToken,
    "banChatMember",
    {
      chat_id: chatId,
      user_id: userId,
      revoke_messages: true,
    },
  );
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: TelegramInlineKeyboard,
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
        ...(replyMarkup
          ? { reply_markup: replyMarkup }
          : {}),
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
    const protectedChatId =
      Deno.env.get("TELEGRAM_CHAT_ID");
    const openAIKey =
      Deno.env.get("OPENAI_API_KEY");
    const openAIModel =
      Deno.env.get("OPENAI_MODEL") ??
      "gpt-5.6";

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

    const isProtectedGroup =
      protectedChatId !== undefined &&
      String(chatId) === protectedChatId &&
      (
        message.chat?.type === "group" ||
        message.chat?.type === "supergroup"
      );

    if (
      isProtectedGroup &&
      message.message_id !== undefined
    ) {
      const isAdmin = await isTelegramAdmin(
        botToken,
        chatId,
        telegramUser.id,
      );

      if (isAdmin) {
        console.log(
          "BOBU Telegram Guard admin bypass:",
          {
            chat_id: String(chatId),
            telegram_user_id:
              String(telegramUser.id),
            username:
              telegramUser.username ?? null,
            message_id: message.message_id,
          },
        );

        return Response.json({ ok: true });
      }

      if (telegramUser.is_bot === true) {
        try {
          await removeBotSpam(
            botToken,
            chatId,
            message.message_id,
            telegramUser.id,
          );

          console.warn(
            "BOBU Telegram Guard removed bot message:",
            {
              chat_id: String(chatId),
              telegram_user_id:
                String(telegramUser.id),
              username:
                telegramUser.username ?? null,
              message_id: message.message_id,
              reason: "telegram_bot_account",
            },
          );
        } catch (error) {
          console.error(
            "BOBU Telegram Guard bot moderation failed:",
            error,
          );
        }

        return Response.json({ ok: true });
      }

      const moderationText = [
        message.text ?? "",
        message.caption ?? "",
      ]
        .filter(Boolean)
        .join("\n");

      if (
        !isAdmin &&
        containsHighConfidenceSpam(moderationText)
      ) {
        try {
          await removeHumanSpam(
            botToken,
            chatId,
            message.message_id,
            telegramUser.id,
          );

          console.warn(
            "BOBU Telegram Guard removed high-confidence spam:",
            {
              chat_id: String(chatId),
              telegram_user_id:
                String(telegramUser.id),
              username:
                telegramUser.username ?? null,
              message_id: message.message_id,
              reason: "high_confidence_spam",
            },
          );
        } catch (error) {
          console.error(
            "BOBU Telegram Guard spam moderation failed:",
            error,
          );
        }

        return Response.json({ ok: true });
      }


      if (
        !isAdmin &&
        openAIKey &&
        Array.isArray(message.photo) &&
        message.photo.length > 0
      ) {
        const decision =
          await moderateTelegramImage(
            botToken,
            openAIKey,
            openAIModel,
            message.photo,
          );

        console.log(
          "BOBU Telegram Guard image moderation:",
          {
            chat_id: String(chatId),
            telegram_user_id:
              String(telegramUser.id),
            message_id: message.message_id,
            unsafe: decision.unsafe,
            confidence: decision.confidence,
            reason: decision.reason,
          },
        );

        /*
         * Intentionally conservative.
         * Ban only on a very high-confidence result.
         */
        if (
          decision.unsafe &&
          decision.confidence >= 0.95
        ) {
          try {
            await removeHumanSpam(
              botToken,
              chatId,
              message.message_id,
              telegramUser.id,
            );

            console.warn(
              "BOBU Telegram Guard removed AI-confirmed explicit image:",
              {
                chat_id: String(chatId),
                telegram_user_id:
                  String(telegramUser.id),
                username:
                  telegramUser.username ?? null,
                message_id: message.message_id,
                confidence:
                  decision.confidence,
                reason: decision.reason,
              },
            );
          } catch (error) {
            console.error(
              "BOBU Telegram Guard image removal failed:",
              error,
            );
          }

          return Response.json({ ok: true });
        }
      }
    }

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
        "Join BOBU Official using the button below.",
        "",
        "After joining, return to the BOBU app to complete your Telegram verification and Genesis Checkpoint.",
        "",
        "See you in the Universe. 🌌",
      ].join("\n"),
      {
        inline_keyboard: [
          [
            {
              text: "Join BOBU Official",
              url: "https://t.me/+I0Q01kVMYw41YjA0",
            },
          ],
        ],
      },
    );

    return Response.json({ ok: true });
  },
};
