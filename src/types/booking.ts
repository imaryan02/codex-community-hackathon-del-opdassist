export type DoctorSlot = {
  id: string;
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  created_at: string;
};

export type BookingStatus = "confirmed" | "cancelled" | "completed";
export type ConsultationStatus = "waiting" | "in_consultation" | "completed";

export type Booking = {
  id: string;
  booking_code: string;
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  ai_report_id: string | null;
  booking_status: BookingStatus;
  consultation_status: ConsultationStatus;
  token_number: number | null;
  created_at: string;
};

export type BookingDraft = {
  patient_id: string;
  patient_code: string;
  ai_report_id: string;
  recommended_specialty_id: string;
  recommended_specialty_name: string;
  symptom_summary: string;
  urgency_level: "low" | "medium" | "high";
  reasoning: string;
  doctor_id: string;
  doctor_name: string;
  doctor_qualification: string | null;
  slot_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
};

export type BookingConfirmation = BookingDraft & {
  booking_id: string;
  booking_code: string;
  token_number: number;
  booking_status: BookingStatus;
  consultation_status: ConsultationStatus;
};
