import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const InputSchema = z.object({
  followupType: z.enum(["followup1", "followup2"]),
  status: z.enum(["draft", "sent", "replied", "interview", "offer", "rejected"]),
  applicantBackground: z.string().min(20),
  professor: z.object({
    name: z.string().min(1),
    school: z.string().min(1),
    researchSummary: z.string().min(10),
  }),
  previousEmails: z.array(
    z.object({
      type: z.string(),
      subject: z.string(),
      body: z.string(),
      createdAt: z.string().optional(),
    })
  ).default([]),
});

function buildPrompt(input: z.infer<typeof InputSchema>) {
  return `
You are an expert PhD outreach assistant.
Write ONE highly personalized follow-up email.

Rules:
- Keep 120-180 words
- Professional and polite
- Mention concrete alignment with professor research
- Reference previous thread naturally (no repetition)
- If status is "replied", be warmer and specific to moving conversation forward
- If status is "sent" or "draft", use gentle reminder tone
- Output strict JSON only

Return JSON:
{
  "subject": "...",
  "emailBody": "...",
  "suggestedWaitDays": 7 | 14
}

Input:
${JSON.stringify(input, null, 2)}
`;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY && !process.env.LLM_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY or LLM_API_KEY" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const input = InputSchema.parse(body);
    const prompt = buildPrompt(input);

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL || undefined,
    });

    const r = await client.chat.completions.create({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Output strict JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const parsed = JSON.parse(r.choices[0]?.message?.content || "{}");
    return NextResponse.json({
      subject: parsed.subject || "Follow-up on PhD Application Inquiry",
      emailBody: parsed.emailBody || "",
      suggestedWaitDays:
        parsed.suggestedWaitDays === 14 || input.followupType === "followup2" ? 14 : 7,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate follow-up" },
      { status: 400 }
    );
  }
}
