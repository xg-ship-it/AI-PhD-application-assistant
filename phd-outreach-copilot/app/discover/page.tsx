"use client";

import { useState } from "react";

type Candidate = {
  name: string;
  school?: string;
  department?: string;
  url?: string;
  researchSummary: string;
  keywords?: string[];
};

export default function DiscoverPage() {
  const [query, setQuery] = useState("multimodal medical imaging phd supervisor uk");
  const [applicantBackground, setApplicantBackground] = useState(
    "I built multimodal models for chest X-ray report generation and have strong transformer/PyTorch experience."
  );
  const [targetProgram, setTargetProgram] = useState("PhD in Computer Science");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<number, any>>({});

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

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex gap-3 text-sm">
          <a href="/" className="underline">Compose</a>
          <a href="/discover" className="underline font-semibold">Discover</a>
          <a href="/dashboard" className="underline">Dashboard</a>
        </div>

        <h1 className="text-2xl font-bold">Professor Discover + Match</h1>
        <input className="w-full border rounded p-2" value={query} onChange={(e) => setQuery(e.target.value)} />
        <textarea className="w-full border rounded p-2 h-24" value={applicantBackground} onChange={(e) => setApplicantBackground(e.target.value)} />
        <input className="w-full border rounded p-2" value={targetProgram} onChange={(e) => setTargetProgram(e.target.value)} />

        <button onClick={onSearch} disabled={loading} className="bg-black text-white rounded px-4 py-2">
          {loading ? "Searching..." : "Search Professors"}
        </button>

        <div className="space-y-3">
          {candidates.map((c, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow p-4 space-y-2">
              <div className="font-semibold">{c.name} {c.school ? `· ${c.school}` : ""}</div>
              <div className="text-sm text-gray-700">{c.researchSummary}</div>
              {c.url && <a className="text-sm underline" href={c.url} target="_blank">{c.url}</a>}
              <div className="text-xs text-gray-500">{(c.keywords || []).join(", ")}</div>
              <button onClick={() => scoreOne(c, idx)} className="border rounded px-3 py-1 text-sm">Score Match</button>
              {scoreMap[idx] && (
                <pre className="text-xs bg-gray-50 border rounded p-2 whitespace-pre-wrap">{JSON.stringify(scoreMap[idx], null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
