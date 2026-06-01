// Demo row IDs are deterministic per tenant — `seed_demo_${clientId}_*`
// (see src/lib/onboarding/demo-seed.ts). This helper rebuilds the IDs
// client-side so tour steps can deep-link to specific rows (e.g.
// /patients/{leadId}) without an extra round-trip after start.

export type DemoIds = {
  lead1: string;
  lead2: string;
  lead3: string; // qualified → patient
  appt1: string; // scheduled tomorrow
  appt2: string; // first completed visit (oldest)
  appt3: string;
  appt4: string; // most recent completed
  payment1: string;
  payment2: string;
};

export const demoIdsFor = (clientId: string): DemoIds => ({
  lead1: `seed_demo_${clientId}_lead_1`,
  lead2: `seed_demo_${clientId}_lead_2`,
  lead3: `seed_demo_${clientId}_lead_3`,
  appt1: `seed_demo_${clientId}_appt_1`,
  appt2: `seed_demo_${clientId}_appt_2`,
  appt3: `seed_demo_${clientId}_appt_3`,
  appt4: `seed_demo_${clientId}_appt_4`,
  payment1: `seed_demo_${clientId}_payment_1`,
  payment2: `seed_demo_${clientId}_payment_2`,
});

// Tour steps embed `{leadId}` / `{apptId}` etc. as placeholders in
// route strings. TourController replaces them at navigation time so the
// definitions stay tenant-agnostic.
export const resolvePlaceholders = (
  route: string,
  ids: DemoIds | null,
): string => {
  if (!ids) return route;
  return route
    .replace("{leadId}", ids.lead3)
    .replace("{apptId}", ids.appt1)
    .replace("{completedApptId}", ids.appt4);
};
