import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isNativeMarsWebView =
  typeof window !== "undefined" &&
  window.location.pathname.startsWith("/mars") &&
  new URLSearchParams(window.location.search).get(
    "nativeBridge",
  ) === "1" &&
  navigator.userAgent.includes("BOBU-Mobile");

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  isNativeMarsWebView
    ? {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    : undefined,
);
