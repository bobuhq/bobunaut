import { supabase } from "../../../lib/supabase";

const REFERRAL_KEY = "bobu_referral_code";

export const referralService = {
  captureReferralFromUrl() {
    const params = new URLSearchParams(
      window.location.search,
    );

    const code = params.get("ref");

    if (!code) {
      return null;
    }

    sessionStorage.setItem(
      REFERRAL_KEY,
      code,
    );

    return code;
  },


  getStoredReferralCode() {
    return sessionStorage.getItem(
      REFERRAL_KEY,
    );
  },


  clearReferralCode() {
    sessionStorage.removeItem(
      REFERRAL_KEY,
    );
  },


  async connectReferral(
    builderId: string,
  ) {
    const inviteCode =
      this.getStoredReferralCode();

    if (!inviteCode) {
      return null;
    }


    const { data: referrer, error } =
      await supabase
        .from("builder_profiles")
        .select("builder_id")
        .eq("invite_code", inviteCode)
        .single();


    if (error || !referrer) {
      console.error(
        "Referral owner not found",
        error,
      );

      return null;
    }


    if (referrer.builder_id === builderId) {
      return null;
    }


    await supabase
      .from("builder_referrals")
      .upsert(
        {
          referrer_id:
            referrer.builder_id,

          referred_id:
            builderId,
        },
        {
          onConflict:
            "referrer_id,referred_id",
        },
      );


    await supabase
      .rpc(
        "increment_referral_count",
        {
          target_builder_id:
            referrer.builder_id,
        },
      );


    this.clearReferralCode();

    return true;
  },
};
