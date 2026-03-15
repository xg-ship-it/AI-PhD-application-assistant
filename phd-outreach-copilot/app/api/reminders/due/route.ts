import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase-server";

export async function GET() {
  const db = getSupabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase is not configured" }, { status: 400 });

  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("leads")
    .select("id, professor_name, school, next_follow_up_at, status")
    .lte("next_follow_up_at", nowIso)
    .in("status", ["draft", "sent", "replied"]) 
    .order("next_follow_up_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    due: (data || []).map((x) => ({
      id: x.id,
      professorName: x.professor_name,
      school: x.school,
      status: x.status,
      nextFollowUpAt: x.next_follow_up_at,
    })),
  });
}
