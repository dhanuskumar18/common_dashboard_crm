export type SourceKey = "gst_webnox" | "gst_pvt" | "nongst" | "unassigned";

export interface Lead {
  id: string;
  sourceKey: SourceKey;
  sourceLabel: string;
  leadCode: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  leadSource: string;
  industry: string | null;
  interest: string | null;
  description: string | null;
  estimatedValue: number | null;
  currency: string;
  status: string;
  priority: string;
  notes: string | null;
  createdAt: string;
}

export interface CompanyMeta {
  key: SourceKey;
  label: string;
  group: string;
  color: string;
}

export interface ListResp {
  data: Lead[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  errors: string[];
  companies: CompanyMeta[];
  enums: { statuses: string[]; sources: string[]; priorities: string[] };
}

export interface CompanyStats extends CompanyMeta {
  total: number;
  value: number;
  byStatus: Record<string, number>;
}

export interface Transfer {
  id: string;
  leadName: string;
  from: string;
  to: string;
  movedBy: string;
  movedAt: string;
}

export interface StatsResp {
  companies: CompanyStats[];
  unassigned: number;
  errors: string[];
  transfers: Transfer[];
}

export type ApiFn = (url: string, init?: RequestInit) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
