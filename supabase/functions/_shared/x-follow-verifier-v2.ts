export type XFollowVerdict =
  | "following"
  | "not_following"
  | "unknown";

export interface XFollowVerification {
  verdict: XFollowVerdict;
  reason: string;
}

interface XFollowingResponse {
  data?: Array<{ id: string }>;
  meta?: { next_token?: string };
  errors?: unknown[];
}

export async function verifyXFollowV2(
  xUserId: string,
  targetUserId: string,
  bearerToken: string,
  fetcher: typeof fetch = fetch,
): Promise<XFollowVerification> {
  if (!xUserId || !targetUserId || !bearerToken) {
    return {
      verdict: "unknown",
      reason: "missing_configuration",
    };
  }

  let nextToken: string | undefined;
  const seenTokens = new Set<string>();
  const maxPages = 20;
  let pagesChecked = 0;

  try {
    do {
      if (pagesChecked >= maxPages) {
        return {
          verdict: "unknown",
          reason: "pagination_limit_reached",
        };
      }

      pagesChecked++;

      const url = new URL(
        `https://api.x.com/2/users/${encodeURIComponent(xUserId)}/following`,
      );

      url.searchParams.set("max_results", "1000");

      if (nextToken) {
        url.searchParams.set("pagination_token", nextToken);
      }

      const response = await fetcher(url, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return {
          verdict: "unknown",
          reason: `x_api_${response.status}`,
        };
      }

      const payload =
        (await response.json()) as XFollowingResponse;

      if (
        !payload ||
        typeof payload !== "object" ||
        !Array.isArray(payload.data) ||
        (payload.errors?.length ?? 0) > 0 ||
        payload.data.some(
          (user) =>
            !user ||
            typeof user.id !== "string" ||
            user.id.length === 0
        ) ||
        (payload.meta !== undefined &&
          (!payload.meta ||
            typeof payload.meta !== "object" ||
            (payload.meta.next_token !== undefined &&
              (typeof payload.meta.next_token !== "string" ||
                payload.meta.next_token.length === 0))))
      ) {
        return {
          verdict: "unknown",
          reason: "incomplete_api_response",
        };
      }

      if (payload.data.some((user) => user.id === targetUserId)) {
        return {
          verdict: "following",
          reason: "confirmed_by_x_api",
        };
      }

      nextToken = payload.meta?.next_token;

      if (nextToken) {
        if (seenTokens.has(nextToken)) {
          return {
            verdict: "unknown",
            reason: "pagination_loop",
          };
        }

        seenTokens.add(nextToken);
      }
    } while (nextToken);

    return {
      verdict: "not_following",
      reason: "complete_following_list_checked",
    };
  } catch {
    return {
      verdict: "unknown",
      reason: "x_api_request_failed",
    };
  }
}
