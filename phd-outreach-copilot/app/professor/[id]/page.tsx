"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Lead, LeadStatus, EmailType, formatStatusLabel, loadLeads, saveLeads } from "../../lib/leads";

const STATUS_ORDER: LeadStatus[] = ["draft", "sent", "replied", "interview", "offer", "rejected"];

export default function ProfessorDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = typeof params?.id === "string" ? params.id : "";
  const [lead, setLead] = useState<Lead | null>(null);
  const [loadingFollowup, setLoadingFollowup] = useState<EmailType | null>(null);
  const [applicantBackground, setApplicantBackground] = useState(
    "I have relevant projects and publications aligned with this professor's recent work."
  );

  useEffect(() => {
    if (!leadId) return;
    const leads = loadLeads();
    setLead(leads.find((x) => x.id === leadId) || null);

    fetch(`/api/leads/${leadId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.lead) setLead(d.lead);
      })
      .catch(() => {});
  }, [leadId]);

  function persist(next: Lead) {
    const leads = loadLeads();
    const idx = leads.findIndex((x) => x.id === next.id);
    if (idx >= 0) leads[idx] = next;
    else leads.unshift(next);
    saveLeads(leads);
    setLead(next);

    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  function updateStatus(status: LeadStatus) {
    if (!lead) return;
    persist({ ...lead, status, updatedAt: new Date().toISOString() });
  }

  function updateReminder(days: number) {
    if (!lead) return;
    const nextTime = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    persist({ ...lead, nextFollowUpAt: nextTime, updatedAt: new Date().toISOString() });
  }

  async function generateFollowup(type: EmailType) {
    if (!lead || type === "initial") return;
    setLoadingFollowup(type);
    try {
      const r = await fetch("/api/email/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followupType: type,
          status: lead.status,
          applicantBackground,
          professor: {
            name: lead.professorName,
            school: lead.school,
            researchSummary: lead.researchSummary || "",
          },
          previousEmails: lead.emails,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "follow-up failed");

      const now = new Date().toISOString();
      const nextLead: Lead = {
        ...lead,
        emails: [
          ...lead.emails,
          {
            id: `${lead.id}-${type}-${Date.now()}`,
            type,
            subject: data.subject,
            body: data.emailBody,
            createdAt: now,
          },
        ],
        nextFollowUpAt: new Date(Date.now() + (data.suggestedWaitDays || 7) * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now,
      };
      persist(nextLead);
      fetch(`/api/leads/${lead.id}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `${lead.id}-${type}-${Date.now()}`,
          type,
          subject: data.subject,
          body: data.emailBody,
          createdAt: now,
          suggestedWaitDays: data.suggestedWaitDays,
        }),
      }).catch(() => {});
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingFollowup(null);
    }
  }

  const sortedEmails = useMemo(() => {
    if (!lead) return [];
    return [...lead.emails].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [lead]);

  if (!lead) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 text-black">
        <div className="max-w-4xl mx-auto">
          <a className="underline text-sm" href="/dashboard">← Back to dashboard</a>
          <p className="mt-4">Lead not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex gap-3 text-sm">
          <a href="/" className="underline">Compose</a>
          <a href="/discover" className="underline">Discover</a>
          <a href="/dashboard" className="underline">Dashboard</a>
        </div>

        <section className="bg-white rounded-xl shadow p-4 space-y-2">
          <h1 className="text-2xl font-bold">{lead.professorName}</h1>
          <div>{lead.school}</div>
          {lead.url && <a className="underline text-sm" href={lead.url} target="_blank">{lead.url}</a>}
          <p className="text-sm text-gray-700">{lead.researchSummary || "No summary"}</p>
          <div className="text-sm">Match Score: {lead.matchScore ?? "N/A"}</div>

          <div className="flex flex-wrap gap-2 pt-2">
            {STATUS_ORDER.map((s) => (
              <button key={s} className="border rounded px-2" onClick={() => updateStatus(s)}>
                {formatStatusLabel(s)}
              </button>
            ))}
            <span className="text-sm text-gray-600">Current: {formatStatusLabel(lead.status)}</span>
          </div>

          <div className="flex gap-2 items-center pt-2">
            <span className="text-sm">Reminder:</span>
            <button className="border rounded px-2" onClick={() => updateReminder(7)}>+7d</button>
            <button className="border rounded px-2" onClick={() => updateReminder(14)}>+14d</button>
            <span className="text-sm text-gray-600">
              Next: {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString() : "Not set"}
            </span>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="text-lg font-semibold">Generate Follow-up</h2>
          <textarea
            className="w-full border rounded p-2 h-24"
            value={applicantBackground}
            onChange={(e) => setApplicantBackground(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="border rounded px-3 py-2"
              disabled={loadingFollowup === "followup1"}
              onClick={() => generateFollowup("followup1")}
            >
              {loadingFollowup === "followup1" ? "Generating..." : "Generate Follow-up #1"}
            </button>
            <button
              className="border rounded px-3 py-2"
              disabled={loadingFollowup === "followup2"}
              onClick={() => generateFollowup("followup2")}
            >
              {loadingFollowup === "followup2" ? "Generating..." : "Generate Follow-up #2"}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="text-lg font-semibold">Email Thread</h2>
          {!sortedEmails.length && <p className="text-sm text-gray-500">No emails yet.</p>}
          {sortedEmails.map((item) => (
            <div key={item.id} className="border rounded p-3 space-y-1">
              <div className="text-xs text-gray-500">
                {item.type} · {new Date(item.createdAt).toLocaleString()}
              </div>
              <div className="font-medium">{item.subject}</div>
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 border rounded p-2">{item.body}</pre>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
