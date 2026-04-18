import type { KnownSpecialty } from "../lib/openai";
import type { UrgencyLevel } from "./ai";

export type InputMode = "text" | "voice";

export type Patient = {
  id: string;
  patient_code: string;
  full_name: string;
  age: number;
  gender: string | null;
  phone: string | null;
  symptom_input: string;
  input_mode: InputMode;
  created_at: string;
};

export type PatientRegistrationInput = {
  full_name: string;
  age: number;
  gender: string | null;
  phone: string | null;
  symptom_input: string;
  input_mode: InputMode;
};

export type SavedPatientIntake = {
  patient_id: string;
  patient_code: string;
  ai_report_id: string;
  recommended_specialty_id: string;
  recommended_specialty_name: KnownSpecialty;
  symptom_summary: string;
  urgency_level: UrgencyLevel;
  reasoning: string;
};
