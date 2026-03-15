import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.LLM_BASE_URL || undefined,
});

const InputSchema = z.object({
  professorName: z.string().min(1),
  school: z.string().min(1),
  researchSummary: z.string().min(20),
  applicantName: z.string().min(1),
  applicantBackground: z.string().min(20),
  targetProgram: z.string().min(1),
  language: z.enum(["en", "zh"]).default("en"),
  tone: z.enum(["formal", "warm"]).default("formal"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = InputSchema.parse(body);

    if (!process.env.LLM_API_KEY && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing LLM_API_KEY (or OPENAI_API_KEY) in .env.local" },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert advisor for graduate application outreach emails.
Write ONE highly personalized outreach email.

Constraints:
- 180-240 words
- professional, concise, specific
- mention at least one concrete alignment point with professor research
- include applicant evidence (project/method/result)
- avoid generic flattery
- end with a soft CTA
- output JSON only

Return shape:
{
  "subject": "...",
  "emailBody": "...",
  "personalizationScore": 0-100
}

Input:
${JSON.stringify(input, null, 2)}
`;

    const resp = await client.chat.completions.create({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "You output strict JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = resp.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate email" },
      { status: 400 }
    );
  }
}
