import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const Schema = z.object({
  applicantBackground: z.string().min(20),
  targetProgram: z.string().min(3),
  professor: z.object({
    name: z.string(),
    school: z.string().optional(),
    researchSummary: z.string().min(10),
    keywords: z.array(z.string()).optional(),
    url: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }

    const body = await req.json();
    const input = Schema.parse(body);

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `
You are a PhD admissions strategist.
Evaluate fit between applicant and professor.
Return JSON only:
{
  "overallScore": 0-100,
  "strengths": ["..."],
  "gaps": ["..."],
  "suggestedAngle": "one paragraph",
  "nextActions": ["..."]
}

Input:
${JSON.stringify(input, null, 2)}
`;

    const r = await client.chat.completions.create({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Output strict JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const parsed = JSON.parse(r.choices[0]?.message?.content || "{}");
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "match failed" }, { status: 400 });
  }
}
