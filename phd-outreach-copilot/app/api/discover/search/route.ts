import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const Schema = z.object({
  query: z.string().min(2),
});

type SearchItem = { title: string; url: string; snippet?: string; source?: string };

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function duckSearch(query: string): Promise<SearchItem[]> {
  const u = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetch(u, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  }).then((r) => r.text());

  const items: SearchItem[] = [];
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && items.length < 8) {
    const raw = m[1];
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    const uddgMatch = raw.match(/uddg=([^&]+)/);
    const realUrl = uddgMatch ? decodeURIComponent(uddgMatch[1]) : raw;
    if (/duckduckgo\.com/.test(realUrl)) continue;
    items.push({ title, url: realUrl, source: "duck" });
  }
  return items;
}

async function braveSearch(query: string): Promise<SearchItem[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];

  const u = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`;
  const data = await fetch(u, {
    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": key,
    },
    cache: "no-store",
  }).then((r) => r.json());

  const items: SearchItem[] = (data?.web?.results || []).map((x: any) => ({
    title: x.title,
    url: x.url,
    snippet: x.description,
    source: "brave",
  }));

  return items;
}

async function extractText(url: string) {
  const jina = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
  return fetch(jina, { cache: "no-store" })
    .then((r) => r.text())
    .then((t) => t.slice(0, 7000))
    .catch(() => "");
}

function uniqueByUrl(items: SearchItem[]) {
  const seen = new Set<string>();
  const out: SearchItem[] = [];
  for (const item of items) {
    if (!item.url) continue;
    const normalized = item.url.replace(/\/#.*$/, "");
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(item);
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }

    const body = await req.json();
    const { query } = Schema.parse(body);

    const queryVariants = [
      `${query} professor`,
      `${query} faculty profile`,
      `${query} google scholar`,
      `${query} lab`,
    ];

    const searches = await Promise.all(
      queryVariants.map(async (q) => {
        const [b, d] = await Promise.all([braveSearch(q), duckSearch(q)]);
        return [...b, ...d];
      })
    );

    const merged = uniqueByUrl(searches.flat()).slice(0, 10);

    const withText = await Promise.all(
      merged.map(async (r) => ({ ...r, text: await extractText(r.url) }))
    );

    const prompt = `
From the following webpages, extract up to 10 potential supervisors/professors relevant to query: "${query}".
Prioritize real faculty profile pages.
Return strict JSON object with key candidates as array.
Each candidate:
{
  "name": "",
  "school": "",
  "department": "",
  "url": "",
  "researchSummary": "max 100 words",
  "keywords": ["", "", ""]
}

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

    return NextResponse.json({
      candidates: parsed.candidates || [],
      sourcesUsed: withText.map((x) => ({ title: x.title, url: x.url, source: x.source })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "discover failed" }, { status: 400 });
  }
}
