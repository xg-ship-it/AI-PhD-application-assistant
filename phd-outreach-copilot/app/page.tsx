"use client";

import { useState } from "react";

type Result = {
  subject: string;
  emailBody: string;
  personalizationScore: number;
};

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [form, setForm] = useState({
    professorName: "Prof. John Smith",
    school: "University of Example",
    researchSummary:
      "The lab focuses on multimodal machine learning, medical imaging, and trustworthy AI for clinical decision support.",
    applicantName: "Xiangyu Guo",
    applicantBackground:
      "I am a final-year MSc student in Computer Science. My recent project built a multimodal model for chest X-ray report generation, improving BLEU by 8.7% over baseline. I have experience with PyTorch, transformers, and uncertainty estimation.",
    targetProgram: "PhD in Computer Science (Fall 2027)",
    language: "en",
    tone: "formal",
  });

  const onChange = (k: string, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  async function onGenerate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 md:p-10 bg-gray-50 text-black">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl shadow p-5 space-y-4">
          <h1 className="text-2xl font-bold">PhD Outreach Copilot (MVP)</h1>
          <p className="text-sm text-gray-600">
            输入你的背景和导师信息，生成可直接发送的套磁邮件。
          </p>

          {[
            ["professorName", "Professor Name"],
            ["school", "School"],
            ["targetProgram", "Target Program"],
            ["applicantName", "Applicant Name"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="text-sm font-medium">{label}</label>
              <input
                className="w-full mt-1 border rounded-lg p-2"
                value={(form as any)[k]}
                onChange={(e) => onChange(k, e.target.value)}
              />
            </div>
          ))}

          <div>
            <label className="text-sm font-medium">Professor Research Summary</label>
            <textarea
              className="w-full mt-1 border rounded-lg p-2 h-28"
              value={form.researchSummary}
              onChange={(e) => onChange("researchSummary", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Applicant Background</label>
            <textarea
              className="w-full mt-1 border rounded-lg p-2 h-32"
              value={form.applicantBackground}
              onChange={(e) => onChange("applicantBackground", e.target.value)}
            />
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
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 border rounded-lg p-3">
                  {result.emailBody}
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
