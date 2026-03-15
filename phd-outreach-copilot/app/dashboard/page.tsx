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

  useEffect(() => {
    setItems(loadLeads());
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
  }

  const grouped = useMemo(() => {
    return STATUS_ORDER.reduce<Record<LeadStatus, Lead[]>>((acc, status) => {
      acc[status] = items.filter((x) => x.status === status);
      return acc;
    }, {
      draft: [],
      sent: [],
      replied: [],
      interview: [],
      offer: [],
      rejected: [],
    });
  }, [items]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex gap-3 text-sm">
          <a href="/" className="underline">Compose</a>
          <a href="/discover" className="underline">Discover</a>
          <a href="/dashboard" className="underline font-semibold">Dashboard</a>
        </div>
        <h1 className="text-2xl font-bold">Outreach Pipeline Dashboard</h1>
        <p className="text-sm text-gray-600">支持状态流转、导师详情、下一次跟进提醒。</p>

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
                    <a className="underline text-xs" href={`/professor/${it.id}`}>Open detail</a>
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
