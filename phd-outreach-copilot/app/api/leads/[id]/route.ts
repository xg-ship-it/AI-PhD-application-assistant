import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabase-server";

function fromRow(row: any) {
  return {
    id: row.id,
    professorName: row.professor_name,
    school: row.school,
    researchSummary: row.research_summary || undefined,
    url: row.url || undefined,
    keywords: row.keywords || [],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nextFollowUpAt: row.next_follow_up_at || undefined,
    matchScore: row.match_score ?? undefined,
    emails: row.emails || [],
  };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getSupabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase is not configured" }, { status: 400 });
  const { id } = await params;

  const { data, error } = await db.from("leads").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ lead: fromRow(data) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getSupabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase is not configured" }, { status: 400 });
  const { id } = await params;

  const patch = await req.json();
  const update: any = {
    updated_at: new Date().toISOString(),
  };

  if (patch.status) update.status = patch.status;
  if (patch.nextFollowUpAt !== undefined) update.next_follow_up_at = patch.nextFollowUpAt;
  if (patch.matchScore !== undefined) update.match_score = patch.matchScore;

  const { error } = await db.from("leads").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
