import { supabase } from "../../lib/supabase";
import type {
  BobuAIRequestMessage,
  BobuAIResponse,
} from "./types";

interface AskBobuAIOptions {
  messages: BobuAIRequestMessage[];
  language: string;
  pathname: string;
}

export type BobuAIServiceErrorCode =
  | "session_failed"
  | "sign_in_required"
  | "request_failed"
  | "response_unavailable";

export class BobuAIServiceError extends Error {
  readonly code: BobuAIServiceErrorCode;

  constructor(code: BobuAIServiceErrorCode) {
    super(code);
    this.name = "BobuAIServiceError";
    this.code = code;
  }
}

const MAX_CLIENT_MESSAGES = 12;

export const bobuAIService = {
  async ask({
    messages,
    language,
    pathname,
  }: AskBobuAIOptions): Promise<string> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        "BOBU AI session load failed:",
        sessionError.message,
      );

      throw new BobuAIServiceError("session_failed");
    }

    if (!session?.access_token) {
      throw new BobuAIServiceError(
        "sign_in_required",
      );
    }

    const safeMessages = messages
      .slice(-MAX_CLIENT_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))
      .filter(
        (message) => message.content.length > 0,
      );

    const { data, error } =
      await supabase.functions.invoke<BobuAIResponse>(
        "bobu-ai",
        {
          body: {
            messages: safeMessages,
            language,
            pathname,
          },
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        },
      );

    if (error) {
      console.error(
        "BOBU AI function invocation failed:",
        error.message,
      );

      throw new BobuAIServiceError(
        "request_failed",
      );
    }

    if (!data?.ok || !data.message) {
      console.error(
        "BOBU AI response unavailable:",
        data?.error ?? "Unknown response error",
      );

      throw new BobuAIServiceError(
        "response_unavailable",
      );
    }

    return data.message;
  },
};
