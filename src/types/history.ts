export type PatientHistoryItem = {
  patient_id: string;
  patient_code: string;
  patient_name: string;
  visit_date: string;
  symptom_input: string;
  symptom_summary: string | null;
  urgency_level: string | null;
  reasoning: string | null;
  specialty_name: string | null;
  booking_code: string | null;
  token_number: number | null;
  booking_status: string | null;
  consultation_status: string | null;
  doctor_name: string | null;
  slot_date: string | null;
  slot_start_time: string | null;
  diagnosis: string | null;
  prescription_text: string | null;
  notes: string | null;
  follow_up_advice: string | null;
  prescription_date: string | null;
};

export type PatientAccountOverview = {
  lookup: string;
  latestProfile: {
    patient_id: string;
    patient_code: string;
    full_name: string;
    age: number;
    gender: string | null;
    phone: string | null;
    created_at: string;
  } | null;
  history: PatientHistoryItem[];
};
