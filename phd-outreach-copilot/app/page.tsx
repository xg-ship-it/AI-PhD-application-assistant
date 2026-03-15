"use client";

import { useEffect, useState } from "react";
import { Lead, makeLeadId, upsertLead } from "./lib/leads";

type Result = {
  subject: string;
  emailBody: string;
  personalizationScore: number;
};

const DISCIPLINE_PRESETS: Record<string, { researchSummary: string; applicantBackground: string }> = {
  "Computer Science": {
    researchSummary:
      "The lab focuses on machine learning, large language models, and reliable AI systems with strong empirical evaluation.",
    applicantBackground:
      "I have research and project experience in ML, model development, evaluation, and reproducible experimentation.",
  },
  Economics: {
    researchSummary:
      "The group studies applied microeconomics, policy evaluation, and quantitative causal inference methods.",
    applicantBackground:
      "I have quantitative training and project experience in econometrics, data analysis, and empirical research design.",
  },
  Psychology: {
    researchSummary:
      "The lab studies cognitive processes using experimental design, behavioral methods, and statistical modeling.",
    applicantBackground:
      "I have experience in experimental study design, data collection/analysis, and translating findings into research questions.",
  },
  "Public Health": {
    researchSummary:
      "The group works on population health, intervention evaluation, and evidence-based health policy research.",
    applicantBackground:
      "I have research experience in health data analysis, evidence synthesis, and policy-relevant interpretation.",
  },
};

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    professorName: "Prof. John Smith",
    school: "University of Example",
    researchSummary: "",
    applicantName: "Xiangyu Guo",
    applicantBackground: "",
    targetProgram: "PhD in Computer Science (Fall 2027)",
    language: "en",
    tone: "formal",
    discipline: "Computer Science",
  });

  useEffect(() => {
    const p = DISCIPLINE_PRESETS[form.discipline];
    if (!form.researchSummary) {
      setForm((s) => ({ ...s, researchSummary: p?.researchSummary || s.researchSummary }));
    }
    if (!form.applicantBackground) {
      setForm((s) => ({ ...s, applicantBackground: p?.applicantBackground || s.applicantBackground }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const onChange = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  function applyDisciplinePreset(v: string) {
    const p = DISCIPLINE_PRESETS[v];
    setForm((s) => ({
      ...s,
      discipline: v,
      researchSummary: p?.researchSummary || s.researchSummary,
      applicantBackground: p?.applicantBackground || s.applicantBackground,
      targetProgram: `PhD in ${v}`,
    }));
    setToast(`Applied ${v} preset`);
  }

  async function onGenerate() {
    setLoading(true);
    setResult(null);
    setSavedLeadId(null);
    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data);
      localStorage.setItem(
        "applicant_profile_defaults",
        JSON.stringify({
          applicantBackground: form.applicantBackground,
          targetProgram: form.targetProgram,
          applicantName: form.applicantName,
        })
      );
      setToast("Email generated");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  function saveToDashboard() {
    if (!result) return;

    const leadId = makeLeadId(form.professorName, form.school);
    const now = new Date().toISOString();

    const lead: Lead = {
      id: leadId,
      professorName: form.professorName,
      school: form.school,
      researchSummary: form.researchSummary,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      nextFollowUpAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      matchScore: result.personalizationScore,
      emails: [
        {
          id: `${leadId}-initial`,
          type: "initial",
          subject: result.subject,
          body: result.emailBody,
          createdAt: now,
        },
      ],
    };

    upsertLead(lead);

    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    }).catch(() => {});

    setSavedLeadId(leadId);
    setToast("Saved to dashboard");
  }

  return (
    <main className="min-h-screen p-6 md:p-10 bg-gray-50 text-black">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex gap-3 text-sm">
          <a href="/" className="underline font-semibold">Compose</a>
          <a href="/discover" className="underline">Discover</a>
          <a href="/dashboard" className="underline">Dashboard</a>
        </div>

        {toast && <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded">{toast}</div>}

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl shadow p-5 space-y-4">
            <h1 className="text-2xl font-bold">PhD Outreach Copilot (v0.3)</h1>
            <p className="text-sm text-gray-600">用模板先起草，再按导师具体信息微调即可。</p>

            <div>
              <label className="text-sm font-medium">Discipline preset</label>
              <div className="flex gap-2 mt-1">
                <select
                  className="w-full border rounded-lg p-2"
                  value={form.discipline}
                  onChange={(e) => onChange("discipline", e.target.value)}
                >
                  {Object.keys(DISCIPLINE_PRESETS).map((x) => (
                    <option key={x} value={x}>{x}</option>
                  ))}
                </select>
                <button className="border rounded px-3" onClick={() => applyDisciplinePreset(form.discipline)}>
                  Apply
                </button>
              </div>
            </div>

            {[
              ["professorName", "Professor Name", "e.g. Prof. Emily Carter"],
              ["school", "School", "e.g. University of Warwick"],
              ["targetProgram", "Target Program", "e.g. PhD in Economics (Fall 2027)"],
              ["applicantName", "Applicant Name", "Your full name"],
            ].map(([k, label, placeholder]) => (
              <div key={k}>
                <label className="text-sm font-medium">{label}</label>
                <input
                  className="w-full mt-1 border rounded-lg p-2"
                  placeholder={placeholder}
                  value={(form as any)[k]}
                  onChange={(e) => onChange(k, e.target.value)}
                />
              </div>
            ))}

            <div>
              <label className="text-sm font-medium">Professor Research Summary</label>
              <textarea
                className="w-full mt-1 border rounded-lg p-2 h-28"
                placeholder="What does this professor/lab focus on? Mention methods/topics."
                value={form.researchSummary}
                onChange={(e) => onChange("researchSummary", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Applicant Background</label>
              <textarea
                className="w-full mt-1 border rounded-lg p-2 h-32"
                placeholder="Briefly mention your strongest project, method, and measurable result."
                value={form.applicantBackground}
                onChange={(e) => onChange("applicantBackground", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Language</label>
                <select className="w-full mt-1 border rounded-lg p-2" value={form.language} onChange={(e) => onChange("language", e.target.value)}>
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Tone</label>
                <select className="w-full mt-1 border rounded-lg p-2" value={form.tone} onChange={(e) => onChange("tone", e.target.value)}>
                  <option value="formal">Formal</option>
                  <option value="warm">Warm</option>
                </select>
              </div>
            </div>

            <button
              onClick={onGenerate}
              disabled={loading}
              className="w-full bg-black text-white rounded-lg p-3 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Email"}
            </button>
          </section>

          <section className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-xl font-semibold mb-3">Result</h2>
            {!result ? (
              <p className="text-gray-500 text-sm">点击 Generate 后在这里展示结果</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Subject</div>
                  <div className="font-medium">{result.subject}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Personalization Score</div>
                  <div className="font-medium">{result.personalizationScore}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Email Body</div>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 border rounded-lg p-3">{result.emailBody}</pre>
                </div>
                <div className="flex items-center gap-3">
                  <button className="border rounded px-3 py-2" onClick={saveToDashboard}>Save to Dashboard</button>
                  {savedLeadId && (
                    <a className="underline text-sm" href={`/professor/${savedLeadId}`}>
                      Open Detail
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
