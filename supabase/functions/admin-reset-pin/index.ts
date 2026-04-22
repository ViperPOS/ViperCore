import { corsHeaders } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { hashSecret, isValidPin, verifySecret } from "../_shared/security.ts";

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
    const adminPassword = String(body.adminPassword || "");
    const adminPin = String(body.adminPin || "").trim();
    const targetUsername = String(body.targetUsername || "").trim().toLowerCase();
    const newPin = String(body.newPin || "").trim();

    if (!tenantId || !adminUsername || (!adminPassword && !adminPin)) {
      return new Response(JSON.stringify({ success: false, message: "Admin authentication details are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!targetUsername || !isValidPin(newPin)) {
      return new Response(JSON.stringify({ success: false, message: "Target username and valid PIN are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id")
      .eq("tenant_id", tenantId)
      .single();

    if (tenantErr || !tenant) {
      return new Response(JSON.stringify({ success: false, message: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: admin, error: adminErr } = await supabase
      .from("tenant_users")
      .select("id,password_hash,pin_hash")
      .eq("tenant_id", tenant.id)
      .eq("username", adminUsername)
      .eq("user_type", "master_admin")
      .eq("active", true)
      .maybeSingle();

    if (adminErr || !admin) {
      return new Response(JSON.stringify({ success: false, message: "Admin authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let verified = false;
    if (adminPassword) verified = await verifySecret(adminPassword, String(admin.password_hash || ""));
    else if (adminPin) verified = await verifySecret(adminPin, String(admin.pin_hash || ""));

    if (!verified) {
      return new Response(JSON.stringify({ success: false, message: "Admin authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pinHash = await hashSecret(newPin);
    const { data: updated, error: updateErr } = await supabase
      .from("tenant_users")
      .update({ pin_hash: pinHash })
      .eq("tenant_id", tenant.id)
      .eq("username", targetUsername)
      .select("id");

    if (updateErr) {
      return new Response(JSON.stringify({ success: false, message: updateErr.message || "Failed to reset PIN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updated || updated.length === 0) {
      return new Response(JSON.stringify({ success: false, message: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
