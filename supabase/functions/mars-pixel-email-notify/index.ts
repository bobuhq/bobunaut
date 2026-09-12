import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

type NotifyBody = {
  type?: "submitted" | "approved" | "rejected";
  creativeId?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get(
      "MARS_PIXEL_ADMIN_EMAIL",
    );
    const fromEmail = Deno.env.get(
      "MARS_PIXEL_FROM_EMAIL",
    );

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !resendApiKey ||
      !adminEmail ||
      !fromEmail
    ) {
      return jsonResponse(
        { error: "Server configuration error." },
        500,
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Authentication required." },
        401,
      );
    }

    const accessToken = authorization
      .slice("Bearer ".length)
      .trim();

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonResponse(
        { error: "Invalid or expired session." },
        401,
      );
    }

    let body: NotifyBody;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON body." },
        400,
      );
    }

    const type = body.type;
    const creativeId =
      typeof body.creativeId === "string"
        ? body.creativeId.trim()
        : "";

    if (
      !creativeId ||
      !["submitted", "approved", "rejected"].includes(
        type ?? "",
      )
    ) {
      return jsonResponse(
        { error: "Invalid notification request." },
        400,
      );
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

    const { data: creative, error: creativeError } =
      await adminClient
        .from("mars_ad_creatives")
        .select(`
          id,
          allocation_id,
          title,
          status,
          mars_pixel_allocations!inner (
            id,
            advertiser_id,
            mars_advertisers!inner (
              id,
              owner_builder_id,
              display_name
            )
          )
        `)
        .eq("id", creativeId)
        .single();

    if (creativeError || !creative) {
      return jsonResponse(
        { error: "Creative not found." },
        404,
      );
    }

    const allocationRaw =
      creative.mars_pixel_allocations;
    const allocation = Array.isArray(allocationRaw)
      ? allocationRaw[0]
      : allocationRaw;

    const advertiserRaw =
      allocation?.mars_advertisers;
    const advertiser = Array.isArray(advertiserRaw)
      ? advertiserRaw[0]
      : advertiserRaw;

    const ownerBuilderId =
      advertiser?.owner_builder_id;

    if (!ownerBuilderId) {
      return jsonResponse(
        { error: "Advertiser owner not found." },
        404,
      );
    }

    /*
     * Security:
     * - submitted: creative owner may request notification.
     * - approved/rejected: only an active admin may request it.
     */

    if (type === "submitted") {
      if (user.id !== ownerBuilderId) {
        return jsonResponse(
          { error: "Creative ownership required." },
          403,
        );
      }

      if (creative.status !== "under_review") {
        return jsonResponse(
          { error: "Creative is not under review." },
          409,
        );
      }
    } else {
      const { data: adminUser } = await adminClient
        .from("admin_users")
        .select("user_id, active")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (!adminUser) {
        return jsonResponse(
          { error: "Admin access required." },
          403,
        );
      }

      const expectedStatus =
        type === "approved" ? "active" : "suspended";

      if (creative.status !== expectedStatus) {
        return jsonResponse(
          {
            error:
              "Creative moderation status does not match notification.",
          },
          409,
        );
      }
    }

    let recipient = adminEmail;
    let subject = "";
    let heading = "";
    let message = "";
    let buttonLabel = "";
    let buttonUrl = "";

    if (type === "submitted") {
      subject =
        "New Mars Pixel Ad Awaiting Approval";
      heading = "New Mars Pixel Submission";
      message =
        `${advertiser?.display_name ?? "An advertiser"} ` +
        `submitted "${creative.title}" for review.`;
      buttonLabel = "OPEN ADMIN CONSOLE";
      buttonUrl = "https://bobunaut.com/admin";
    } else {
      const {
        data: ownerUser,
        error: ownerError,
      } = await adminClient.auth.admin.getUserById(
        ownerBuilderId,
      );

      if (
        ownerError ||
        !ownerUser?.user?.email
      ) {
        return jsonResponse(
          { error: "Advertiser email not found." },
          404,
        );
      }

      recipient = ownerUser.user.email;

      if (type === "approved") {
        subject =
          "Your Mars Pixel Ad Has Been Approved";
        heading = "Your Mars Pixel Ad Is Live 🚀";
        message =
          `Your advertisement "${creative.title}" ` +
          "has been approved by the BOBU team and is ready on Mars Pixel.";
      } else {
        subject =
          "Your Mars Pixel Ad Needs Changes";
        heading = "Mars Pixel Review Update";
        message =
          `Your advertisement "${creative.title}" ` +
          "was not approved in its current form. Please review your creative and submit an updated version.";
      }

      buttonLabel = "OPEN MARS PIXEL";
      buttonUrl = "https://bobunaut.com/mars";
    }

    const safeHeading = escapeHtml(heading);
    const safeMessage = escapeHtml(message);

    const html = `
<!doctype html>
<html>
<body style="margin:0;background:#07040d;font-family:Arial,sans-serif;color:#fff">
  <div style="max-width:620px;margin:0 auto;padding:42px 22px">
    <div style="border:1px solid #6d36ff;border-radius:22px;padding:34px;background:#10091c">
      <div style="font-size:13px;letter-spacing:3px;color:#a987ff;font-weight:700">
        BOBU UNIVERSE · MARS PIXEL
      </div>

      <h1 style="font-size:28px;margin:18px 0 16px">
        ${safeHeading}
      </h1>

      <p style="font-size:16px;line-height:1.7;color:#d8d1e8">
        ${safeMessage}
      </p>

      <a
        href="${buttonUrl}"
        style="display:inline-block;margin-top:20px;padding:14px 22px;border-radius:12px;background:#7c3cff;color:#fff;text-decoration:none;font-weight:700"
      >
        ${buttonLabel}
      </a>

      <p style="margin-top:34px;font-size:12px;color:#817990">
        Mars Pixel · BOBU Universe · bobunaut.com
      </p>
    </div>
  </div>
</body>
</html>`;

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient],
          subject,
          html,
        }),
      },
    );

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error(
        "Mars Pixel Resend failure:",
        resendResult,
      );

      return jsonResponse(
        {
          sent: false,
          error: "Email provider rejected request.",
        },
        502,
      );
    }

    return jsonResponse({
      sent: true,
      type,
      creativeId,
    });
  } catch (error) {
    console.error("Mars Pixel email notify error:", error);

    return jsonResponse(
      { error: "Unexpected notification error." },
      500,
    );
  }
});
