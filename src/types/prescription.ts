export type Prescription = {
  id: string;
  patient_id: string;
  booking_id: string;
  doctor_id: string;
  diagnosis: string | null;
  prescription_text: string | null;
  notes: string | null;
  follow_up_advice: string | null;
  created_at: string;
};

export type PrescriptionInput = {
  patient_id: string;
  booking_id: string;
  doctor_id: string;
  diagnosis: string;
  prescription_text: string;
  notes: string;
  follow_up_advice: string;
};
