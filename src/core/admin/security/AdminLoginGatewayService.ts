import { supabase } from "../../../lib/supabase";

type AdminLoginGatewayResponse = {
  accepted?: boolean;
  session?: {
    access_token?: string;
    refresh_token?: string;
  };
  error?: string;
  code?: string;
};

async function extractFunctionError(
  error: unknown,
): Promise<Error> {
  const context =
    (
      error as {
        context?: {
          json?: () => Promise<unknown>;
        };
      }
    )?.context;

  if (context?.json) {
    try {
      const payload =
        (await context.json()) as
          AdminLoginGatewayResponse;

      if (payload?.error) {
        const gatewayError =
          new Error(payload.error) as Error & {
            code?: string;
          };

        gatewayError.code = payload.code;

        return gatewayError;
      }
    } catch {
      // Fall through to generic error.
    }
  }

  return new Error(
    error instanceof Error
      ? error.message
      : "Administrator authentication failed.",
  );
}

export const AdminLoginGatewayService = {
  async signIn(
    identifier: string,
    password: string,
  ): Promise<void> {
    const { data, error } =
      await supabase.functions.invoke(
        "admin-login-gateway",
        {
          body: {
            identifier,
            password,
          },
        },
      );

    if (error) {
      throw await extractFunctionError(error);
    }

    const payload =
      (data ?? {}) as AdminLoginGatewayResponse;

    const accessToken =
      payload.session?.access_token;

    const refreshToken =
      payload.session?.refresh_token;

    if (
      !payload.accepted ||
      !accessToken ||
      !refreshToken
    ) {
      throw new Error(
        payload.error ??
          "Administrator authentication failed.",
      );
    }

    const {
      error: sessionError,
    } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      throw new Error(
        "Administrator session could not be established.",
      );
    }
  },
};
