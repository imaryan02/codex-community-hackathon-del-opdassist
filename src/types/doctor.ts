export type Specialty = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Doctor = {
  id: string;
  full_name: string;
  specialty_id: string;
  experience_years: number | null;
  qualification: string | null;
  hospital_name: string | null;
  available_today: boolean;
  created_at: string;
};

export type DoctorWithSpecialty = Doctor & {
  specialty_name: string;
};

export type DoctorQueueItem = {
  booking_id: string;
  booking_code: string;
  token_number: number | null;
  consultation_status: string;
  booking_status: string;
  patient_name: string;
  patient_code: string;
  symptom_summary: string;
  urgency_level: string | null;
  slot_date: string;
  slot_start_time: string;
  slot_end_time: string;
  doctor_name: string;
};

export type ConsultationDetail = DoctorQueueItem & {
  patient_id: string;
  doctor_id: string;
  ai_report_id: string | null;
  patient_age: number;
  patient_gender: string | null;
  patient_phone: string | null;
  original_symptom_input: string;
  ai_reasoning: string | null;
  recommended_specialty_name: string;
  doctor_qualification: string | null;
};
