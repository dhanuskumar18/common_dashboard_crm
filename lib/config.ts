export type CompanyKey = "gst_webnox" | "gst_pvt" | "nongst";
export type DbKey = "gst" | "nongst";

export interface Company {
  key: CompanyKey;
  label: string;
  group: "GST" | "Non-GST";
  db: DbKey;
  tenantId: string;
  color: string;
}

export const POOL_KEY = "unassigned" as const;

export function getCompanies(): Company[] {
  return [
    {
      key: "gst_webnox",
      label: "Webnox Technologies",
      group: "GST",
      db: "gst",
      tenantId: process.env.GST_TENANT_WEBNOX_ID || "6e66fd13-2abb-4407-ab35-9412a1589985",
      color: "#6366f1",
    },
    {
      key: "gst_pvt",
      label: "Webnox Technologies PVT Limited",
      group: "GST",
      db: "gst",
      tenantId: process.env.GST_TENANT_PVT_ID || "3fda6cd8-d044-4461-ab09-3c9649b124b5",
      color: "#06b6d4",
    },
    {
      key: "nongst",
      label: "Webnox Non-GST",
      group: "Non-GST",
      db: "nongst",
      tenantId: process.env.NONGST_TENANT_ID || "default-tenant-id",
      color: "#f59e0b",
    },
  ];
}

export function getCompany(key: string): Company | undefined {
  return getCompanies().find((c) => c.key === key);
}

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "UNQUALIFIED",
  "CONVERTED",
  "LOST",
] as const;

export const LEAD_SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "ADVERTISEMENT",
  "EMAIL",
  "PHONE",
  "COLD_OUTREACH",
  "PARTNER",
  "EXISTING_CUSTOMER",
  "OTHER",
] as const;

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
