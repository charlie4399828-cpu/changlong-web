import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

async function verifyPassword(
  supabase: ReturnType<typeof createClient>,
  password: string,
  legacyPassword: string
) {
  const { data: row } = await supabase
    .from("site_content")
    .select("edit_password")
    .eq("id", 1)
    .maybeSingle();

  if (row?.edit_password) {
    return row.edit_password === password;
  }

  return legacyPassword && password === legacyPassword;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = String(body.action || "save");
    const password = String(body.password || "");
    const legacyPassword = Deno.env.get("SITE_EDIT_PASSWORD") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "verify") {
      const ok = await verifyPassword(supabase, password, legacyPassword);
      if (!ok) {
        return jsonResponse({ error: "密码错误" }, 401);
      }
      return jsonResponse({ ok: true });
    }

    const data = body.data;
    if (!data || typeof data !== "object") {
      return jsonResponse({ error: "缺少站点数据" }, 400);
    }

    const ok = await verifyPassword(supabase, password, legacyPassword);
    if (!ok) {
      return jsonResponse({ error: "密码错误" }, 401);
    }

    const { data: existing } = await supabase
      .from("site_content")
      .select("id")
      .eq("id", 1)
      .maybeSingle();

    const payload = {
      content: data,
      edit_password: password,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase.from("site_content").update(payload).eq("id", 1);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("site_content").insert({ id: 1, ...payload });
      if (error) throw error;
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
