export type PatientDocument = {
  id: string;
  patient_id: string | null;
  account_mobile: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  document_type: string | null;
  title: string;
  uploaded_at: string;
  signed_url: string | null;
};

export type DocumentType =
  | "Prescription"
  | "Lab Report"
  | "Scan"
  | "Discharge Summary"
  | "Other";
