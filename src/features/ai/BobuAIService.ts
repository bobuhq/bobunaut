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
      throw new Error(
        `Session could not be loaded: ${sessionError.message}`,
      );
    }

    if (!session?.access_token) {
      throw new Error(
        "Please sign in before using BOBU AI.",
      );
    }

    const safeMessages = messages
      .slice(-MAX_CLIENT_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))
      .filter((message) => message.content.length > 0);

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
      throw new Error(error.message);
    }

    if (!data?.ok || !data.message) {
      throw new Error(
        data?.error ??
          "BOBU AI could not generate a response.",
      );
    }

    return data.message;
  },
};
