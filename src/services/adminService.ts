import { getSupabaseClient } from "../lib/supabase";
import type { DoctorWithSpecialty } from "../types/doctor";
import type { Specialty } from "../types/doctor";

export type AdminBookingRow = {
  id: string;
  booking_code: string;
  token_number: number | null;
  booking_status: string;
  consultation_status: string;
  patient_name: string;
  patient_code: string;
  doctor_name: string;
  slot_time: string;
};

export type AdminDashboardSummary = {
  totalDoctors: number;
  availableDoctors: number;
  totalSlotsToday: number;
  availableSlotsToday: number;
  bookedSlotsToday: number;
  bookingsToday: number;
  completedConsultations: number;
  doctors: DoctorWithSpecialty[];
  bookings: AdminBookingRow[];
};

export type CreateDoctorInput = {
  full_name: string;
  specialty_id: string;
  experience_years: number | null;
  qualification: string | null;
  hospital_name: string | null;
};

export type CreateSlotInput = {
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
};

type RelationOne<T> = T | T[] | null;

type DoctorRow = {
  id: string;
  full_name: string;
  specialty_id: string;
  experience_years: number | null;
  qualification: string | null;
  hospital_name: string | null;
  available_today: boolean;
  created_at: string;
  specialties: RelationOne<{ name: string }>;
};

type SlotRow = {
  id: string;
  is_booked: boolean;
};

type BookingRow = {
  id: string;
  booking_code: string;
  token_number: number | null;
  booking_status: string;
  consultation_status: string;
  patients: RelationOne<{
    full_name: string;
    patient_code: string;
  }>;
  doctors: RelationOne<{
    full_name: string;
  }>;
  doctor_slots: RelationOne<{
    start_time: string;
    end_time: string;
  }>;
};

type BookingStatusRow = {
  id: string;
  booking_status: string;
  consultation_status: string;
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

function formatTimeRange(start?: string, end?: string) {
  if (!start || !end) {
    return "No slot";
  }

  return `${start.slice(0, 5)} to ${end.slice(0, 5)}`;
}

function mapDoctorRow(doctor: DoctorRow): DoctorWithSpecialty {
  const specialty = one(doctor.specialties);

  return {
    id: doctor.id,
    full_name: doctor.full_name,
    specialty_id: doctor.specialty_id,
    experience_years: doctor.experience_years,
    qualification: doctor.qualification,
    hospital_name: doctor.hospital_name,
    available_today: doctor.available_today,
    created_at: doctor.created_at,
    specialty_name: specialty?.name ?? "Specialty",
  };
}

function mapBookingRow(row: BookingRow): AdminBookingRow {
  const patient = one(row.patients);
  const doctor = one(row.doctors);
  const slot = one(row.doctor_slots);

  return {
    id: row.id,
    booking_code: row.booking_code,
    token_number: row.token_number,
    booking_status: row.booking_status,
    consultation_status: row.consultation_status,
    patient_name: patient?.full_name ?? "Unknown patient",
    patient_code: patient?.patient_code ?? "Unknown",
    doctor_name: doctor?.full_name ?? "Unknown doctor",
    slot_time: formatTimeRange(slot?.start_time, slot?.end_time),
  };
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const supabase = getSupabaseClient();
  const today = getTodayDateString();

  const [{ data: doctors, error: doctorsError }, { data: slots, error: slotsError }] =
    await Promise.all([
      supabase
        .from("doctors")
        .select(
          "id,full_name,specialty_id,experience_years,qualification,hospital_name,available_today,created_at,specialties(name)",
        )
        .order("full_name", { ascending: true }),
      supabase
        .from("doctor_slots")
        .select("id,is_booked")
        .eq("slot_date", today),
    ]);

  if (doctorsError) {
    throw new Error(`Could not load doctors: ${doctorsError.message}`);
  }

  if (slotsError) {
    throw new Error(`Could not load slots: ${slotsError.message}`);
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      "id,booking_code,token_number,booking_status,consultation_status,patients(full_name,patient_code),doctors(full_name),doctor_slots!inner(start_time,end_time,slot_date)",
    )
    .eq("doctor_slots.slot_date", today)
    .order("token_number", { ascending: true, nullsFirst: false });

  if (bookingsError) {
    throw new Error(`Could not load today's bookings: ${bookingsError.message}`);
  }

  const doctorRows = ((doctors ?? []) as unknown as DoctorRow[]).map(
    mapDoctorRow,
  );
  const slotRows = (slots ?? []) as SlotRow[];
  const bookingRows = ((bookings ?? []) as unknown as BookingRow[]).map(
    mapBookingRow,
  );

  return {
    totalDoctors: doctorRows.length,
    availableDoctors: doctorRows.filter((doctor) => doctor.available_today).length,
    totalSlotsToday: slotRows.length,
    availableSlotsToday: slotRows.filter((slot) => !slot.is_booked).length,
    bookedSlotsToday: slotRows.filter((slot) => slot.is_booked).length,
    bookingsToday: bookingRows.length,
    completedConsultations: bookingRows.filter(
      (booking) => booking.consultation_status === "completed",
    ).length,
    doctors: doctorRows,
    bookings: bookingRows,
  };
}

export async function getPendingTokenApprovals(): Promise<AdminBookingRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,booking_code,token_number,booking_status,consultation_status,patients(full_name,patient_code),doctors(full_name),doctor_slots(start_time,end_time,slot_date)",
    )
    .eq("booking_status", "pending_approval")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load pending OPD tokens: ${error.message}`);
  }

  return ((data ?? []) as unknown as BookingRow[]).map(mapBookingRow);
}

export async function approveOpdToken(bookingId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      booking_status: "confirmed",
      consultation_status: "waiting",
    })
    .eq("id", bookingId)
    .select("id,booking_status,consultation_status")
    .single();

  if (error) {
    throw new Error(`Could not approve OPD token: ${error.message}`);
  }

  const updated = data as BookingStatusRow;

  if (
    updated.booking_status !== "confirmed" ||
    updated.consultation_status !== "waiting"
  ) {
    throw new Error("OPD token approval did not update the booking status.");
  }

  return updated;
}

export async function cancelOpdToken(bookingId: string) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("bookings")
    .update({
      booking_status: "cancelled",
      consultation_status: "cancelled",
    })
    .eq("id", bookingId)
    .select("id,booking_status,consultation_status")
    .single();

  if (error) {
    throw new Error(`Could not cancel OPD token: ${error.message}`);
  }

  const updated = data as BookingStatusRow;

  if (
    updated.booking_status !== "cancelled" ||
    updated.consultation_status !== "cancelled"
  ) {
    throw new Error("OPD token cancellation did not update the booking status.");
  }

  return updated;
}

export async function getSpecialties(): Promise<Specialty[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("specialties")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Could not load departments: ${error.message}`);
  }

  return data ?? [];
}

export async function createDoctor(input: CreateDoctorInput) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("doctors").insert({
    full_name: input.full_name,
    specialty_id: input.specialty_id,
    experience_years: input.experience_years,
    qualification: input.qualification,
    hospital_name: input.hospital_name,
    available_today: true,
  });

  if (error) {
    throw new Error(`Could not add doctor: ${error.message}`);
  }
}

export async function updateDoctorAvailability(
  doctorId: string,
  availableToday: boolean,
) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("doctors")
    .update({ available_today: availableToday })
    .eq("id", doctorId);

  if (error) {
    throw new Error(`Could not update doctor availability: ${error.message}`);
  }
}

export async function deleteDoctor(doctorId: string) {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("doctors")
    .update({ available_today: false })
    .eq("id", doctorId);

  if (error) {
    throw new Error(`Could not remove doctor from today's roster: ${error.message}`);
  }
}

export async function createDoctorSlot(input: CreateSlotInput) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("doctor_slots").insert({
    doctor_id: input.doctor_id,
    slot_date: input.slot_date,
    start_time: input.start_time,
    end_time: input.end_time,
    is_booked: false,
  });

  if (error) {
    throw new Error(`Could not add OPD time: ${error.message}`);
  }
}
