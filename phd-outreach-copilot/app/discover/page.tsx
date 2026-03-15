"use client";

import { useMemo, useState } from "react";
import { Lead, makeLeadId, upsertLead } from "../lib/leads";

type Candidate = {
  name: string;
  school?: string;
  department?: string;
  url?: string;
  researchSummary: string;
  keywords?: string[];
};

type MatchScore = {
  overallScore?: number;
  strengths?: string[];
  gaps?: string[];
  suggestedAngle?: string;
  nextActions?: string[];
};

const QUICK_QUERIES = [
  "NLP large language models UK",
  "Computer vision medical imaging UK",
  "Robotics and reinforcement learning Europe",
  "Human computer interaction HCI UK",
  "Cyber security privacy PhD supervisor UK",
];

const AREA_OPTIONS = [
  "Natural Language Processing",
  "Computer Vision",
  "Medical AI",
  "Robotics",
  "HCI",
  "Security",
  "Data Science",
];

const REGION_OPTIONS = ["UK", "Europe", "US", "Canada", "Australia"];

function parseCsvText(csv: string): Candidate[] {
  const lines = csv
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((x) => x.trim().toLowerCase());
  const rows = lines.slice(1);

  return rows
    .map((line) => {
      const cols = line.split(",").map((x) => x.trim());
      const get = (keys: string[]) => {
        const idx = headers.findIndex((h) => keys.includes(h));
        return idx >= 0 ? cols[idx] || "" : "";
      };
      return {
        name: get(["name", "professor", "professorname"]),
        school: get(["school", "university"]),
        department: get(["department", "dept"]),
        url: get(["url", "homepage", "link"]),
        researchSummary: get(["researchsummary", "summary", "research", "interests"]),
        keywords: get(["keywords", "tags"])
          .split(";")
          .map((x) => x.trim())
          .filter(Boolean),
      };
    })
    .filter((x) => x.name && x.researchSummary);
}

function ScoreCard({ score }: { score: MatchScore }) {
  const v = Math.max(0, Math.min(100, score.overallScore || 0));
  return (
    <div className="text-sm bg-gray-50 border rounded p-3 space-y-2">
      <div>
        <div className="flex items-center justify-between">
          <span className="font-medium">Match Score</span>
          <span className="font-semibold">{v}/100</span>
        </div>
        <div className="h-2 rounded bg-gray-200 mt-1 overflow-hidden">
          <div className="h-full bg-black" style={{ width: `${v}%` }} />
        </div>
      </div>

      {!!score.strengths?.length && (
        <div>
          <div className="font-medium">Strengths</div>
          <ul className="list-disc ml-5">
            {score.strengths.slice(0, 3).map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {!!score.gaps?.length && (
        <div>
          <div className="font-medium">Potential Gaps</div>
          <ul className="list-disc ml-5">
            {score.gaps.slice(0, 3).map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {score.suggestedAngle && (
        <div>
          <div className="font-medium">Recommended Angle</div>
          <p className="text-gray-700">{score.suggestedAngle}</p>
        </div>
      )}

      {!!score.nextActions?.length && (
        <div>
          <div className="font-medium">Next Actions</div>
          <ul className="list-disc ml-5">
            {score.nextActions.slice(0, 3).map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("multimodal medical imaging phd supervisor uk");
  const [selectedArea, setSelectedArea] = useState(AREA_OPTIONS[0]);
  const [selectedRegion, setSelectedRegion] = useState(REGION_OPTIONS[0]);

  const [applicantBackground, setApplicantBackground] = useState(
    "I built multimodal models for chest X-ray report generation and have strong transformer/PyTorch experience."
  );
  const [targetProgram, setTargetProgram] = useState("PhD in Computer Science");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<number, MatchScore>>({});
  const [sources, setSources] = useState<Array<{ title: string; url: string; source?: string }>>([]);

  const queryHint = useMemo(
    () => `Example: ${selectedArea} ${selectedRegion} PhD supervisor`,
    [selectedArea, selectedRegion]
  );

  function applyTemplateQuery() {
    setQuery(`${selectedArea} ${selectedRegion} PhD supervisor`);
  }

  async function onSearch() {
    setLoading(true);
    try {
      const r = await fetch("/api/discover/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "search failed");
      setCandidates(data.candidates || []);
      setSources(data.sourcesUsed || []);
      setScoreMap({});
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function scoreOne(c: Candidate, idx: number) {
    const r = await fetch("/api/match/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicantBackground, targetProgram, professor: c }),
    });
    const data = await r.json();
    if (!r.ok) return alert(data.error || "score failed");
    setScoreMap((s) => ({ ...s, [idx]: data }));
  }

  function saveCandidate(c: Candidate, idx: number) {
    const leadId = makeLeadId(c.name, c.school || "Unknown");
    const now = new Date().toISOString();
    const lead: Lead = {
      id: leadId,
      professorName: c.name,
      school: c.school || "Unknown",
      researchSummary: c.researchSummary,
      url: c.url,
      keywords: c.keywords,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      nextFollowUpAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      matchScore: scoreMap[idx]?.overallScore,
      emails: [],
    };
    upsertLead(lead);
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    }).catch(() => {});
    alert("Saved as lead");
  }

  async function onUploadCsv(file: File) {
    const text = await file.text();
    const parsed = parseCsvText(text);
    if (!parsed.length) {
      alert("CSV parse failed. Need at least name + researchSummary columns.");
      return;
    }
    setCandidates((prev) => [...parsed, ...prev]);
    alert(`Imported ${parsed.length} candidates from CSV`);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex gap-3 text-sm">
          <a href="/" className="underline">Compose</a>
          <a href="/discover" className="underline font-semibold">Discover</a>
          <a href="/dashboard" className="underline">Dashboard</a>
        </div>

        <h1 className="text-2xl font-bold">Professor Discover + Match</h1>

        <section className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="text-sm font-medium">1) What do you want to search?</div>

          <div className="grid md:grid-cols-3 gap-2">
            <select className="border rounded p-2" value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
              {AREA_OPTIONS.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
            <select className="border rounded p-2" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
              {REGION_OPTIONS.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
            <button className="border rounded px-3 py-2" onClick={applyTemplateQuery}>Use template</button>
          </div>

          <input
            className="w-full border rounded p-2"
            placeholder={queryHint}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="text-xs text-gray-500">Tip: 研究方向 + 国家/地区 + supervisor/faculty，例如 “NLP UK PhD supervisor”.</div>

          <div className="flex gap-2 flex-wrap">
            {QUICK_QUERIES.map((x) => (
              <button key={x} className="text-xs border rounded px-2 py-1" onClick={() => setQuery(x)}>
                {x}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-4 space-y-2">
          <div className="text-sm font-medium">2) Your profile for match scoring</div>
          <textarea
            className="w-full border rounded p-2 h-24"
            placeholder="Write your background (projects, methods, results, publications)..."
            value={applicantBackground}
            onChange={(e) => setApplicantBackground(e.target.value)}
          />
          <input
            className="w-full border rounded p-2"
            placeholder="Target program, e.g. PhD in Computer Science"
            value={targetProgram}
            onChange={(e) => setTargetProgram(e.target.value)}
          />

          <div className="flex gap-3 items-center">
            <button onClick={onSearch} disabled={loading} className="bg-black text-white rounded px-4 py-2">
              {loading ? "Searching..." : "Search Professors"}
            </button>
            <label className="text-sm border rounded px-3 py-2 cursor-pointer">
              Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadCsv(f);
                }}
              />
            </label>
          </div>
        </section>

        {!!sources.length && (
          <section className="bg-white rounded-xl shadow p-3 text-xs">
            <div className="font-semibold mb-1">Search sources used</div>
            <div className="space-y-1 max-h-44 overflow-auto">
              {sources.map((s, i) => (
                <div key={i}>
                  [{s.source || "web"}] <a className="underline" href={s.url} target="_blank">{s.title || s.url}</a>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="space-y-3">
          {candidates.map((c, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow p-4 space-y-2">
              <div className="font-semibold">{c.name} {c.school ? `· ${c.school}` : ""}</div>
              <div className="text-sm text-gray-700">{c.researchSummary}</div>
              {c.url && <a className="text-sm underline" href={c.url} target="_blank">{c.url}</a>}
              <div className="text-xs text-gray-500">{(c.keywords || []).join(", ")}</div>

              <div className="flex gap-2">
                <button onClick={() => scoreOne(c, idx)} className="border rounded px-3 py-1 text-sm">Score Match</button>
                <button onClick={() => saveCandidate(c, idx)} className="border rounded px-3 py-1 text-sm">Save Lead</button>
              </div>

              {scoreMap[idx] && <ScoreCard score={scoreMap[idx]} />}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
