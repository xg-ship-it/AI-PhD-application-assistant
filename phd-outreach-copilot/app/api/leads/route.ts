import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "../../lib/supabase-server";

const LeadSchema = z.object({
  id: z.string(),
  professorName: z.string(),
  school: z.string(),
  researchSummary: z.string().optional(),
  url: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  status: z.enum(["draft", "sent", "replied", "interview", "rejected", "offer"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  nextFollowUpAt: z.string().optional(),
  matchScore: z.number().optional(),
  emails: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["initial", "followup1", "followup2"]),
      subject: z.string(),
      body: z.string(),
      createdAt: z.string(),
    })
  ),
});

function toRow(input: z.infer<typeof LeadSchema>) {
  return {
    id: input.id,
    professor_name: input.professorName,
    school: input.school,
    research_summary: input.researchSummary || null,
    url: input.url || null,
    keywords: input.keywords || [],
    status: input.status,
    created_at: input.createdAt,
    updated_at: input.updatedAt,
    next_follow_up_at: input.nextFollowUpAt || null,
    match_score: input.matchScore ?? null,
    emails: input.emails,
  };
}

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

export async function GET() {
  const db = getSupabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase is not configured" }, { status: 400 });

  const { data, error } = await db.from("leads").select("*").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ leads: (data || []).map(fromRow) });
}

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase is not configured" }, { status: 400 });

  try {
    const body = await req.json();
    const lead = LeadSchema.parse(body);
    const row = toRow(lead);

    const { error } = await db.from("leads").upsert(row, { onConflict: "id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "bad request" }, { status: 400 });
  }
}
