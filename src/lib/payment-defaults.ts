// Reasonable starting set of preset charges for a small clinic. Used by
// the "Add starter charges" empty-state button on the Preset Charges tab
// and by the dev seed script. Amounts are integer paise.

export type DefaultPreset = {
  title: string;
  amount: number; // paise
};

export const DEFAULT_PRESET_CHARGES: ReadonlyArray<DefaultPreset> = [
  { title: "Consultation", amount: 50000 },
  { title: "Follow-up", amount: 30000 },
  { title: "Injection", amount: 15000 },
  { title: "Dressing", amount: 20000 },
  { title: "Dental Cleaning", amount: 120000 },
  { title: "X-Ray", amount: 80000 },
];
