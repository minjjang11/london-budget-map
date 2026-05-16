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
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return new Response(JSON.stringify({ error: "Missing Supabase env" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authz = req.headers.get("Authorization");
  if (!authz?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const mods = parseModerators();
  if (!mods.has(user.email.trim().toLowerCase())) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: { submissionId?: string };
  try {
    body = (await req.json()) as { submissionId?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const submissionId = body.submissionId?.trim();
  if (!submissionId) {
    return new Response(JSON.stringify({ error: "submissionId required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: updated, error } = await admin
    .from("place_submissions")
    .update({ status: "approved" })
    .eq("id", submissionId)
    .in("status", ["pending", "needs_review"])
    .select("id");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!updated?.length) {
    const { data: placeId, error: syncErr } = await admin.rpc("sync_place_for_approved_submission", {
      p_submission_id: submissionId,
    });
    if (syncErr) {
      return new Response(JSON.stringify({ error: syncErr.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, placeId, note: "Already approved; ensured places row" }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: placeId, error: syncErr } = await admin.rpc("sync_place_for_approved_submission", {
    p_submission_id: submissionId,
  });
  if (syncErr || !placeId) {
    return new Response(
      JSON.stringify({
        error: syncErr?.message ?? "Approved but could not resolve places row (apply migration 021)",
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true, placeId }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
