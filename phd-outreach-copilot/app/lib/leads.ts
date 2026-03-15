export type LeadStatus =
  | "draft"
  | "sent"
  | "replied"
  | "interview"
  | "rejected"
  | "offer";

export type EmailType = "initial" | "followup1" | "followup2";

export type EmailThreadItem = {
  id: string;
  type: EmailType;
  subject: string;
  body: string;
  createdAt: string;
};

export type Lead = {
  id: string;
  professorName: string;
  school: string;
  researchSummary?: string;
  url?: string;
  keywords?: string[];
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  nextFollowUpAt?: string;
  matchScore?: number;
  emails: EmailThreadItem[];
};

const STORAGE_KEY = "outreach_leads_v1";

export function loadLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Lead[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLeads(leads: Lead[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export function upsertLead(next: Lead) {
  const leads = loadLeads();
  const idx = leads.findIndex((x) => x.id === next.id);
  if (idx === -1) {
    leads.unshift(next);
  } else {
    leads[idx] = next;
  }
  saveLeads(leads);
}

export function makeLeadId(professorName: string, school: string) {
  const base = `${professorName}-${school}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${base}-${Date.now().toString(36)}`;
}

export function formatStatusLabel(s: LeadStatus) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
