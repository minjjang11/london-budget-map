import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseModerators(): Set<string> {
  const raw = Deno.env.get("MODERATOR_EMAILS") ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authz = req.headers.get("Authorization");
  if (!authz?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ moderator: false }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authz } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user?.email) {
    return new Response(JSON.stringify({ moderator: false }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const mods = parseModerators();
  const moderator = mods.has(user.email.trim().toLowerCase());
  return new Response(JSON.stringify({ moderator }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
