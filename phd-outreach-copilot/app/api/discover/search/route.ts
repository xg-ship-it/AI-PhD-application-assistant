import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const Schema = z.object({
  query: z.string().min(2),
});

type SearchItem = { title: string; url: string; snippet?: string };

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function duckSearch(query: string): Promise<SearchItem[]> {
  const u = `https://duckduckgo.com/html/?q=${encodeURIComponent(query + " professor research")}`;
  const html = await fetch(u, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  }).then((r) => r.text());

  const items: SearchItem[] = [];
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && items.length < 6) {
    const raw = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    const uddgMatch = raw.match(/uddg=([^&]+)/);
    const realUrl = uddgMatch ? decodeURIComponent(uddgMatch[1]) : raw;
    if (/duckduckgo\.com/.test(realUrl)) continue;
    items.push({ title, url: realUrl });
  }
  return items;
}

async function extractText(url: string) {
  const jina = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
  return fetch(jina, { cache: "no-store" })
    .then((r) => r.text())
    .then((t) => t.slice(0, 8000))
    .catch(() => "");
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }

    const body = await req.json();
    const { query } = Schema.parse(body);
    const results = await duckSearch(query);
    const top = results.slice(0, 3);

    const withText = await Promise.all(
      top.map(async (r) => ({ ...r, text: await extractText(r.url) }))
    );

    const prompt = `
From the following webpages, extract up to 5 potential supervisors/professors relevant to this applicant query: "${query}".
Return strict JSON array only. Each item:
{
  "name": "",
  "school": "",
  "department": "",
  "url": "",
  "researchSummary": "max 80 words",
  "keywords": ["", "", ""]
}
If data is weak, still return best-effort candidates.

Sources:
${JSON.stringify(withText, null, 2)}
`;

    const client = getClient();
    const out = await client.chat.completions.create({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return JSON only with key candidates as array." },
        { role: "user", content: prompt },
      ],
    });

    const text = out.choices[0]?.message?.content || '{"candidates":[]}';
    const parsed = JSON.parse(text);
    return NextResponse.json({ candidates: parsed.candidates || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "discover failed" }, { status: 400 });
  }
}
