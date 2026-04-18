import type { KnownSpecialty } from "../lib/openai";

export type UrgencyLevel = "low" | "medium" | "high";

export type AIIntakeResult = {
  symptom_summary: string;
  recommended_specialty: KnownSpecialty;
  urgency_level: UrgencyLevel;
  reasoning: string;
};

export type AnalyzeSymptomsInput = {
  symptomInput: string;
};

export type AIIntakeReport = {
  id: string;
  patient_id: string;
  symptom_summary: string;
  recommended_specialty_id: string;
  urgency_level: UrgencyLevel | null;
  reasoning: string | null;
  raw_input: string | null;
  created_at: string;
};
