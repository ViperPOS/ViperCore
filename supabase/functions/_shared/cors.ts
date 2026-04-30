const allowedOrigin = Deno.env.get("SB_PROJECT_URL") || Deno.env.get("SUPABASE_URL") || "";

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
