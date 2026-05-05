import { corsHeaders } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { hashSecret, verifySecret } from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const tenantId = String(body.tenantId || "").trim();
    const adminUsername = String(body.adminUsername || "").trim().toLowerCase();
    const masterPin = String(body.masterPin || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!tenantId || !adminUsername || !masterPin) {
      return new Response(JSON.stringify({ success: false, message: "Tenant ID, admin username, and master PIN are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ success: false, message: "New password must be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    // Get tenant and verify master PIN
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id,master_pin_hash")
      .eq("tenant_id", tenantId)
      .single();

    if (tenantErr || !tenant) {
      return new Response(JSON.stringify({ success: false, message: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify master PIN
    const masterPinVerified = await verifySecret(masterPin, String(tenant.master_pin_hash || ""));
    if (!masterPinVerified) {
      return new Response(JSON.stringify({ success: false, message: "Master PIN is incorrect" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the admin user
    const { data: admin, error: adminErr } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("username", adminUsername)
      .eq("user_type", "master_admin")
      .eq("active", true)
      .maybeSingle();

    if (adminErr || !admin) {
      return new Response(JSON.stringify({ success: false, message: "Admin user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reset admin's password
    const passwordHash = await hashSecret(newPassword);
    const { error: updateErr } = await supabase
      .from("tenant_users")
      .update({ password_hash: passwordHash })
      .eq("id", admin.id);

    if (updateErr) {
      return new Response(JSON.stringify({ success: false, message: updateErr.message || "Failed to reset password" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Password reset successfully. Please log in with your new password." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
