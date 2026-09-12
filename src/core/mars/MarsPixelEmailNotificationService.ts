import { supabase } from "../../lib/supabase";

export type MarsPixelEmailNotificationType =
  | "submitted"
  | "approved"
  | "rejected";

export async function notifyMarsPixelEmail(
  type: MarsPixelEmailNotificationType,
  creativeId: string,
): Promise<void> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      console.warn(
        "Mars Pixel email notification skipped: no authenticated session.",
      );
      return;
    }

    const { error } = await supabase.functions.invoke(
      "mars-pixel-email-notify",
      {
        body: {
          type,
          creativeId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    );

    if (error) {
      console.warn(
        `Mars Pixel ${type} email notification failed:`,
        error,
      );
    }
  } catch (error) {
    /*
     * Email delivery is best-effort.
     * Never fail creative submission or moderation
     * because the notification provider is unavailable.
     */
    console.warn(
      `Mars Pixel ${type} email notification failed:`,
      error,
    );
  }
}
