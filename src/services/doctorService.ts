import { getSupabaseClient } from "../lib/supabase";
import type {
  ConsultationDetail,
  DoctorQueueItem,
  DoctorWithSpecialty,
} from "../types/doctor";

type DoctorRow = {
  id: string;
  full_name: string;
  specialty_id: string;
  experience_years: number | null;
  qualification: string | null;
  hospital_name: string | null;
  available_today: boolean;
  created_at: string;
  specialties:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

function getSpecialtyName(specialties: DoctorRow["specialties"]) {
  if (!specialties) {
    return "Specialty";
  }

  if (Array.isArray(specialties)) {
    return specialties[0]?.name ?? "Specialty";
  }

  return specialties.name;
}

function mapDoctorRow(doctor: DoctorRow): DoctorWithSpecialty {
  return {
    id: doctor.id,
    full_name: doctor.full_name,
    specialty_id: doctor.specialty_id,
    experience_years: doctor.experience_years,
    qualification: doctor.qualification,
    hospital_name: doctor.hospital_name,
    available_today: doctor.available_today,
    created_at: doctor.created_at,
    specialty_name: getSpecialtyName(doctor.specialties),
  };
}

type RelationOne<T> = T | T[] | null;

type QueueBookingRow = {
  id: string;
  booking_code: string;
  token_number: number | null;
  consultation_status: string;
  booking_status: string;
  created_at: string;
  patients: RelationOne<{
    id: string;
    full_name: string;
    patient_code: string;
    age: number;
    gender: string | null;
    phone: string | null;
    symptom_input: string;
  }>;
  ai_intake_reports: RelationOne<{
    id: string;
    symptom_summary: string;
    urgency_level: string | null;
    reasoning: string | null;
    recommended_specialty_id: string | null;
    specialties: RelationOne<{
      name: string;
    }>;
  }>;
  doctors: RelationOne<{
    id: string;
    full_name: string;
    qualification: string | null;
    specialties: RelationOne<{
      name: string;
    }>;
  }>;
  doctor_slots: RelationOne<{
    id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
  }>;
};

function one<T>(value: RelationOne<T>): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function mapQueueRow(row: QueueBookingRow): DoctorQueueItem {
  const patient = one(row.patients);
  const report = one(row.ai_intake_reports);
  const doctor = one(row.doctors);
  const slot = one(row.doctor_slots);

  return {
    booking_id: row.id,
    booking_code: row.booking_code,
    token_number: row.token_number,
    consultation_status: row.consultation_status,
    booking_status: row.booking_status,
    patient_name: patient?.full_name ?? "Unknown patient",
    patient_code: patient?.patient_code ?? "Unknown",
    symptom_summary: report?.symptom_summary ?? "No AI summary saved",
    urgency_level: report?.urgency_level ?? null,
    slot_date: slot?.slot_date ?? "",
    slot_start_time: slot?.start_time ?? "",
    slot_end_time: slot?.end_time ?? "",
    doctor_name: doctor?.full_name ?? "Unknown doctor",
  };
}

function mapConsultationRow(row: QueueBookingRow): ConsultationDetail {
  const patient = one(row.patients);
  const report = one(row.ai_intake_reports);
  const doctor = one(row.doctors);
  const slot = one(row.doctor_slots);
  const specialty = one(report?.specialties ?? null);

  return {
    ...mapQueueRow(row),
    patient_id: patient?.id ?? "",
    doctor_id: doctor?.id ?? "",
    ai_report_id: report?.id ?? null,
    patient_age: patient?.age ?? 0,
    patient_gender: patient?.gender ?? null,
    patient_phone: patient?.phone ?? null,
    original_symptom_input: patient?.symptom_input ?? "",
    ai_reasoning: report?.reasoning ?? null,
    recommended_specialty_name: specialty?.name ?? "Specialty",
    doctor_qualification: doctor?.qualification ?? null,
    slot_date: slot?.slot_date ?? "",
    slot_start_time: slot?.start_time ?? "",
    slot_end_time: slot?.end_time ?? "",
  };
}

export async function getDoctorsBySpecialty(
  specialtyId: string,
): Promise<DoctorWithSpecialty[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("doctors")
    .select(
      "id,full_name,specialty_id,experience_years,qualification,hospital_name,available_today,created_at,specialties(name)",
    )
    .eq("specialty_id", specialtyId)
    .eq("available_today", true)
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Could not fetch doctors: ${error.message}`);
  }

  return ((data ?? []) as unknown as DoctorRow[]).map(mapDoctorRow);
}

export async function getAllDoctors(): Promise<DoctorWithSpecialty[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("doctors")
    .select(
      "id,full_name,specialty_id,experience_years,qualification,hospital_name,available_today,created_at,specialties(name)",
    )
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(`Could not fetch doctors: ${error.message}`);
  }

  return ((data ?? []) as unknown as DoctorRow[]).map(mapDoctorRow);
}

export async function getTodayDoctorQueue(): Promise<DoctorQueueItem[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,booking_code,token_number,consultation_status,booking_status,created_at,patients!inner(id,full_name,patient_code,age,gender,phone,symptom_input),ai_intake_reports(id,symptom_summary,urgency_level,reasoning,recommended_specialty_id,specialties(name)),doctors!inner(id,full_name,qualification,specialties(name)),doctor_slots!inner(id,slot_date,start_time,end_time)",
    )
    .eq("doctor_slots.slot_date", getTodayDateString())
    .neq("booking_status", "cancelled")
    .order("token_number", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Could not fetch doctor queue: ${error.message}`);
  }

  return ((data ?? []) as unknown as QueueBookingRow[])
    .map(mapQueueRow)
    .sort((a, b) => {
      if (a.token_number !== null && b.token_number !== null) {
        return a.token_number - b.token_number;
      }

      return a.slot_start_time.localeCompare(b.slot_start_time);
    });
}

export async function getConsultationDetail(
  bookingId: string,
): Promise<ConsultationDetail> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,booking_code,token_number,consultation_status,booking_status,created_at,patients!inner(id,full_name,patient_code,age,gender,phone,symptom_input),ai_intake_reports(id,symptom_summary,urgency_level,reasoning,recommended_specialty_id,specialties(name)),doctors!inner(id,full_name,qualification,specialties(name)),doctor_slots!inner(id,slot_date,start_time,end_time)",
    )
    .eq("id", bookingId)
    .single();

  if (error) {
    throw new Error(`Could not fetch consultation detail: ${error.message}`);
  }

  return mapConsultationRow(data as unknown as QueueBookingRow);
}
