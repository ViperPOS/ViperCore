import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getServiceClient() {
  const supabaseUrl = Deno.env.get("SB_PROJECT_URL") || Deno.env.get("SUPABASE_URL");
  const serviceRole =
    Deno.env.get("SB_SERVICE_ROLE_KEY") ||
    Deno.env.get("SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing project URL or service role key env vars");
  }

  return createClient(supabaseUrl, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
