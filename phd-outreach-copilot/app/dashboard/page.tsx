"use client";

import { useEffect, useMemo, useState } from "react";
import { Lead, LeadStatus, formatStatusLabel, loadLeads, saveLeads } from "../lib/leads";

const STATUS_ORDER: LeadStatus[] = [
  "draft",
  "sent",
  "replied",
  "interview",
  "offer",
  "rejected",
];

export default function DashboardPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");
  const [keywordFilter, setKeywordFilter] = useState("");

  useEffect(() => {
    setItems(loadLeads());
    fetch("/api/leads")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.leads)) {
          setItems(d.leads);
          saveLeads(d.leads);
        }
      })
      .catch(() => {});
  }, []);

  function save(next: Lead[]) {
    setItems(next);
    saveLeads(next);
  }

  function move(id: string, status: LeadStatus) {
    const next = items.map((it) =>
      it.id === id ? { ...it, status, updatedAt: new Date().toISOString() } : it
    );
    save(next);
    fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }

  function removeLead(id: string, professorName: string) {
    const ok = confirm(`Delete lead for ${professorName}? This cannot be undone.`);
    if (!ok) return;

    const next = items.filter((x) => x.id !== id);
    save(next);
    fetch(`/api/leads/${id}`, { method: "DELETE" }).catch(() => {});
  }

  const filtered = useMemo(() => {
    return items.filter((x) => {
      const byStatus = statusFilter === "all" ? true : x.status === statusFilter;
      const q = keywordFilter.trim().toLowerCase();
      const joined = `${x.professorName} ${x.school} ${(x.keywords || []).join(" ")} ${x.researchSummary || ""}`.toLowerCase();
      const byKeyword = q ? joined.includes(q) : true;
      return byStatus && byKeyword;
    });
  }, [items, statusFilter, keywordFilter]);

  const grouped = useMemo(() => {
    return STATUS_ORDER.reduce<Record<LeadStatus, Lead[]>>(
      (acc, status) => {
        acc[status] = filtered.filter((x) => x.status === status);
        return acc;
      },
      {
        draft: [],
        sent: [],
        replied: [],
        interview: [],
        offer: [],
        rejected: [],
      }
    );
  }, [filtered]);

  const stats = useMemo(() => {
    const total = items.length || 1;
    const sent = items.filter((x) => ["sent", "replied", "interview", "offer"].includes(x.status)).length;
    const replied = items.filter((x) => ["replied", "interview", "offer"].includes(x.status)).length;
    const offers = items.filter((x) => x.status === "offer").length;
    return {
      total: items.length,
      sent,
      replied,
      offers,
      replyRate: Math.round((replied / Math.max(sent, 1)) * 100),
      offerRate: Math.round((offers / total) * 100),
    };
  }, [items]);

  const now = Date.now();
  const dueLeads = useMemo(() => {
    return items
      .filter((x) => x.nextFollowUpAt && new Date(x.nextFollowUpAt).getTime() <= now)
      .sort((a, b) => new Date(a.nextFollowUpAt || 0).getTime() - new Date(b.nextFollowUpAt || 0).getTime());
  }, [items, now]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex gap-3 text-sm">
          <a href="/" className="underline">Compose</a>
          <a href="/discover" className="underline">Discover</a>
          <a href="/dashboard" className="underline font-semibold">Dashboard</a>
        </div>
        <h1 className="text-2xl font-bold">Outreach Pipeline Dashboard</h1>
        <p className="text-sm text-gray-600">支持状态流转、导师详情、自动提醒、筛选统计。</p>

        <section className="bg-white rounded-xl shadow p-4 grid md:grid-cols-5 gap-3 text-sm">
          <div>Total: <b>{stats.total}</b></div>
          <div>Sent+: <b>{stats.sent}</b></div>
          <div>Replied+: <b>{stats.replied}</b></div>
          <div>Reply Rate: <b>{stats.replyRate}%</b></div>
          <div>Offer Rate: <b>{stats.offerRate}%</b></div>
        </section>

        {!!dueLeads.length && (
          <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h2 className="font-semibold mb-2">🔔 Follow-up Due Now ({dueLeads.length})</h2>
            <div className="space-y-1 text-sm">
              {dueLeads.slice(0, 8).map((x) => (
                <div key={x.id} className="flex items-center justify-between gap-3">
                  <span>{x.professorName} · {x.school}</span>
                  <a className="underline" href={`/professor/${x.id}`}>open</a>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
          <select
            className="border rounded px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{formatStatusLabel(s)}</option>
            ))}
          </select>
          <input
            className="border rounded px-2 py-1 min-w-72"
            placeholder="Filter by professor/school/keyword"
            value={keywordFilter}
            onChange={(e) => setKeywordFilter(e.target.value)}
          />
        </section>

        <div className="grid md:grid-cols-3 gap-4">
          {STATUS_ORDER.map((k) => (
            <div key={k} className="bg-white rounded-xl shadow p-3">
              <h2 className="font-semibold mb-2">{formatStatusLabel(k)} ({grouped[k].length})</h2>
              <div className="space-y-2">
                {grouped[k].map((it) => (
                  <div key={it.id} className="border rounded p-2 text-sm space-y-1">
                    <div className="font-medium">{it.professorName} · {it.school}</div>
                    <div className="text-gray-600 line-clamp-2">{it.emails[0]?.subject || "No subject"}</div>
                    <div className="text-xs text-gray-500">
                      Next follow-up: {it.nextFollowUpAt ? new Date(it.nextFollowUpAt).toLocaleString() : "Not set"}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {STATUS_ORDER.map((s) => (
                        <button key={s} className="border rounded px-2" onClick={() => move(it.id, s)}>
                          {formatStatusLabel(s)}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <a className="underline text-xs" href={`/professor/${it.id}`}>Open detail</a>
                      <button
                        className="text-xs border border-red-300 text-red-600 rounded px-2 py-0.5"
                        onClick={() => removeLead(it.id, it.professorName)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
