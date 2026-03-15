import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

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

function buildPrompt(input: z.infer<typeof InputSchema>) {
  return `
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
}

async function generateWithMinimax(prompt: string) {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "MiniMax-M2.5";
  const groupId = process.env.MINIMAX_GROUP_ID;

  if (!apiKey) throw new Error("Missing LLM_API_KEY");
  if (!groupId) {
    throw new Error(
      "MiniMax requires MINIMAX_GROUP_ID in .env.local (from your MiniMax console)."
    );
  }

  const url = `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${encodeURIComponent(
    groupId
  )}`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      tokens_to_generate: 800,
      messages: [
        { role: "system", content: "You output strict JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error(data?.base_resp?.status_msg || data?.error || `MiniMax HTTP ${r.status}`);
  }
  if (data?.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax error ${data.base_resp.status_code}: ${data?.base_resp?.status_msg || "unknown error"}`);
  }

  const content =
    data?.choices?.[0]?.message?.content ||
    data?.reply ||
    data?.output_text ||
    "{}";

  return JSON.parse(content);
}

async function generateWithOpenAICompat(prompt: string) {
  const client = new OpenAI({
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.LLM_BASE_URL || undefined,
  });

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
  return JSON.parse(content);
}

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

    const prompt = buildPrompt(input);
    const provider = (process.env.LLM_PROVIDER || "openai_compat").toLowerCase();

    const parsed =
      provider === "minimax"
        ? await generateWithMinimax(prompt)
        : await generateWithOpenAICompat(prompt);

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to generate email" },
      { status: 400 }
    );
  }
}
