import { corsHeaders } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { isValidPin, verifySecret } from "../_shared/security.ts";

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
    const method = String(body.method || "password").toLowerCase();

    if (!tenantId) {
      return new Response(JSON.stringify({ success: false, message: "tenantId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();
    const { data: tenant, error: tenantErr } = await supabase
      .from("tenants")
      .select("id,tenant_id,tenant_name,activation_status")
      .eq("tenant_id", tenantId)
      .single();

    if (tenantErr || !tenant || tenant.activation_status !== "active") {
      return new Response(JSON.stringify({ success: false, message: "Tenant not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "pin") {
      const pin = String(body.pin || "").trim();
      if (!isValidPin(pin)) {
        return new Response(JSON.stringify({ success: false, message: "Invalid PIN format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: users, error: usersErr } = await supabase
        .from("tenant_users")
        .select("id,full_name,username,user_type,pin_hash,active")
        .eq("tenant_id", tenant.id)
        .eq("active", true);

      if (usersErr || !users) {
        return new Response(JSON.stringify({ success: false, message: usersErr?.message || "Failed to query users" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const user of users) {
        const valid = await verifySecret(pin, String(user.pin_hash || ""));
        if (valid) {
          await supabase.from("tenant_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
          return new Response(JSON.stringify({
            success: true,
            tenant: {
              id: tenant.id,
              tenantId: tenant.tenant_id,
              tenantName: tenant.tenant_name,
            },
            user: {
              id: user.id,
              name: user.full_name,
              username: user.username,
              isAdmin: user.user_type === "master_admin",
            },
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ success: false, message: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: "Username and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: user, error: userErr } = await supabase
      .from("tenant_users")
      .select("id,full_name,username,user_type,password_hash,active")
      .eq("tenant_id", tenant.id)
      .eq("username", username)
      .eq("active", true)
      .maybeSingle();

    if (userErr || !user) {
      return new Response(JSON.stringify({ success: false, message: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await verifySecret(password, String(user.password_hash || ""));
    if (!valid) {
      return new Response(JSON.stringify({ success: false, message: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("tenant_users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);

    return new Response(JSON.stringify({
      success: true,
      tenant: {
        id: tenant.id,
        tenantId: tenant.tenant_id,
        tenantName: tenant.tenant_name,
      },
      user: {
        id: user.id,
        name: user.full_name,
        username: user.username,
        isAdmin: user.user_type === "master_admin",
      },
    }), {
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
