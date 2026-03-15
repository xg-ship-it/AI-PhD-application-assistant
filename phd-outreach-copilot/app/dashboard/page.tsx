"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  professorName: string;
  school: string;
  subject: string;
  status: "draft" | "sent" | "replied";
  createdAt: string;
};

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("outreach_items");
    setItems(raw ? JSON.parse(raw) : []);
  }, []);

  function save(next: Item[]) {
    setItems(next);
    localStorage.setItem("outreach_items", JSON.stringify(next));
  }

  function move(i: number, status: Item["status"]) {
    const next = [...items];
    next[i] = { ...next[i], status };
    save(next);
  }

  const grouped = useMemo(() => {
    return {
      draft: items.filter((x) => x.status === "draft"),
      sent: items.filter((x) => x.status === "sent"),
      replied: items.filter((x) => x.status === "replied"),
    };
  }, [items]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-black">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex gap-3 text-sm">
          <a href="/" className="underline">Compose</a>
          <a href="/discover" className="underline">Discover</a>
          <a href="/dashboard" className="underline font-semibold">Dashboard</a>
        </div>
        <h1 className="text-2xl font-bold">Outreach Pipeline Dashboard</h1>
        <p className="text-sm text-gray-600">来自 Compose 页面保存的邮件会出现在这里。</p>

        <div className="grid md:grid-cols-3 gap-4">
          {(["draft", "sent", "replied"] as const).map((k) => (
            <div key={k} className="bg-white rounded-xl shadow p-3">
              <h2 className="font-semibold capitalize mb-2">{k} ({grouped[k].length})</h2>
              <div className="space-y-2">
                {grouped[k].map((it, idx) => {
                  const absoluteIndex = items.findIndex((x) => x === it);
                  return (
                    <div key={idx} className="border rounded p-2 text-sm">
                      <div className="font-medium">{it.professorName} · {it.school}</div>
                      <div className="text-gray-600 line-clamp-2">{it.subject}</div>
                      <div className="text-xs text-gray-500">{new Date(it.createdAt).toLocaleString()}</div>
                      <div className="flex gap-2 mt-2">
                        <button className="border rounded px-2" onClick={() => move(absoluteIndex, "draft")}>Draft</button>
                        <button className="border rounded px-2" onClick={() => move(absoluteIndex, "sent")}>Sent</button>
                        <button className="border rounded px-2" onClick={() => move(absoluteIndex, "replied")}>Replied</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
