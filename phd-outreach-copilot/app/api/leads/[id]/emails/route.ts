import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "../../../../lib/supabase-server";

const EmailSchema = z.object({
  id: z.string(),
  type: z.enum(["initial", "followup1", "followup2"]),
  subject: z.string(),
  body: z.string(),
  createdAt: z.string(),
  suggestedWaitDays: z.number().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getSupabaseServer();
  if (!db) return NextResponse.json({ error: "Supabase is not configured" }, { status: 400 });

  try {
    const { id } = await params;
    const body = await req.json();
    const email = EmailSchema.parse(body);

    const { data, error: fetchError } = await db
      .from("leads")
      .select("emails")
      .eq("id", id)
      .single();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 });

    const existing = Array.isArray(data?.emails) ? data.emails : [];
    const nextFollowUpAt = email.suggestedWaitDays
      ? new Date(Date.now() + email.suggestedWaitDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await db
      .from("leads")
      .update({
        emails: [...existing, email],
        next_follow_up_at: nextFollowUpAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "bad request" }, { status: 400 });
  }
}
