import {
  isPatientCode,
  normalizePatientLookup,
  normalizePhone,
} from "../lib/phone";
import { getSupabaseClient } from "../lib/supabase";
import type { PatientAccountOverview, PatientHistoryItem } from "../types/history";

type RelationOne<T> = T | T[] | null;

type PatientRow = {
  id: string;
  patient_code: string;
  full_name: string;
  age: number;
  gender: string | null;
  phone: string | null;
  symptom_input: string;
  created_at: string;
};

type ReportRow = {
  patient_id: string;
  symptom_summary: string;
  urgency_level: string | null;
  reasoning: string | null;
  specialties: RelationOne<{ name: string }>;
};

type BookingRow = {
  id: string;
  patient_id: string;
  booking_code: string;
  token_number: number | null;
  booking_status: string;
  consultation_status: string;
  created_at: string;
  doctors: RelationOne<{ full_name: string }>;
  doctor_slots: RelationOne<{
    slot_date: string;
    start_time: string;
  }>;
};

type PrescriptionRow = {
  patient_id: string;
  booking_id: string;
  diagnosis: string | null;
  prescription_text: string | null;
  notes: string | null;
  follow_up_advice: string | null;
  created_at: string;
};

function one<T>(value: RelationOne<T>): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function hasSamePhone(left: string | null, right: string | null) {
  const leftPhone = normalizePhone(left);
  const rightPhone = normalizePhone(right);

  return Boolean(leftPhone && rightPhone && leftPhone === rightPhone);
}

export async function getPatientHistory(
  patientId: string,
): Promise<PatientHistoryItem[]> {
  const supabase = getSupabaseClient();

  const { data: currentPatient, error: currentPatientError } = await supabase
    .from("patients")
    .select("id,patient_code,full_name,age,gender,phone,symptom_input,created_at")
    .eq("id", patientId)
    .single();

  if (currentPatientError) {
    throw new Error(
      `Could not load current patient: ${currentPatientError.message}`,
    );
  }

  const current = currentPatient as PatientRow;
  const patientQuery = supabase
    .from("patients")
    .select("id,patient_code,full_name,age,gender,phone,symptom_input,created_at")
    .order("created_at", { ascending: false });

  const { data: patients, error: patientsError } = current.phone
    ? await patientQuery
    : await patientQuery.eq("id", patientId);

  if (patientsError) {
    throw new Error(`Could not load patient history: ${patientsError.message}`);
  }

  const patientRows = current.phone
    ? ((patients ?? []) as PatientRow[]).filter((patient) =>
        hasSamePhone(patient.phone, current.phone),
      )
    : ((patients ?? []) as PatientRow[]);
  const patientIds = patientRows.map((patient) => patient.id);

  if (patientIds.length === 0) {
    return [];
  }

  const [
    { data: reports, error: reportsError },
    { data: bookings, error: bookingsError },
    { data: prescriptions, error: prescriptionsError },
  ] = await Promise.all([
    supabase
      .from("ai_intake_reports")
      .select(
        "patient_id,symptom_summary,urgency_level,reasoning,specialties(name)",
      )
      .in("patient_id", patientIds),
    supabase
      .from("bookings")
      .select(
        "id,patient_id,booking_code,token_number,booking_status,consultation_status,created_at,doctors(full_name),doctor_slots(slot_date,start_time)",
      )
      .in("patient_id", patientIds),
    supabase
      .from("prescriptions")
      .select(
        "patient_id,booking_id,diagnosis,prescription_text,notes,follow_up_advice,created_at",
      )
      .in("patient_id", patientIds),
  ]);

  if (reportsError) {
    throw new Error(`Could not load AI reports: ${reportsError.message}`);
  }

  if (bookingsError) {
    throw new Error(`Could not load bookings: ${bookingsError.message}`);
  }

  if (prescriptionsError) {
    throw new Error(
      `Could not load prescriptions: ${prescriptionsError.message}`,
    );
  }

  const reportByPatientId = new Map(
    ((reports ?? []) as unknown as ReportRow[]).map((report) => [
      report.patient_id,
      report,
    ]),
  );
  const bookingByPatientId = new Map(
    ((bookings ?? []) as unknown as BookingRow[]).map((booking) => [
      booking.patient_id,
      booking,
    ]),
  );
  const prescriptionByBookingId = new Map(
    ((prescriptions ?? []) as PrescriptionRow[]).map((prescription) => [
      prescription.booking_id,
      prescription,
    ]),
  );

  return patientRows.map((patient) => {
    const report = reportByPatientId.get(patient.id) ?? null;
    const booking = bookingByPatientId.get(patient.id) ?? null;
    const prescription = booking
      ? prescriptionByBookingId.get(booking.id) ?? null
      : null;
    const specialty = one(report?.specialties ?? null);
    const doctor = one(booking?.doctors ?? null);
    const slot = one(booking?.doctor_slots ?? null);

    return {
      patient_id: patient.id,
      patient_code: patient.patient_code,
      patient_name: patient.full_name,
      visit_date: patient.created_at,
      symptom_input: patient.symptom_input,
      symptom_summary: report?.symptom_summary ?? null,
      urgency_level: report?.urgency_level ?? null,
      reasoning: report?.reasoning ?? null,
      specialty_name: specialty?.name ?? null,
      booking_code: booking?.booking_code ?? null,
      token_number: booking?.token_number ?? null,
      booking_status: booking?.booking_status ?? null,
      consultation_status: booking?.consultation_status ?? null,
      doctor_name: doctor?.full_name ?? null,
      slot_date: slot?.slot_date ?? null,
      slot_start_time: slot?.start_time ?? null,
      diagnosis: prescription?.diagnosis ?? null,
      prescription_text: prescription?.prescription_text ?? null,
      notes: prescription?.notes ?? null,
      follow_up_advice: prescription?.follow_up_advice ?? null,
      prescription_date: prescription?.created_at ?? null,
    };
  });
}

async function getHistoryForPatientRows(
  patientRows: PatientRow[],
): Promise<PatientHistoryItem[]> {
  const supabase = getSupabaseClient();
  const patientIds = patientRows.map((patient) => patient.id);

  if (patientIds.length === 0) {
    return [];
  }

  const [
    { data: reports, error: reportsError },
    { data: bookings, error: bookingsError },
    { data: prescriptions, error: prescriptionsError },
  ] = await Promise.all([
    supabase
      .from("ai_intake_reports")
      .select(
        "patient_id,symptom_summary,urgency_level,reasoning,specialties(name)",
      )
      .in("patient_id", patientIds),
    supabase
      .from("bookings")
      .select(
        "id,patient_id,booking_code,token_number,booking_status,consultation_status,created_at,doctors(full_name),doctor_slots(slot_date,start_time)",
      )
      .in("patient_id", patientIds),
    supabase
      .from("prescriptions")
      .select(
        "patient_id,booking_id,diagnosis,prescription_text,notes,follow_up_advice,created_at",
      )
      .in("patient_id", patientIds),
  ]);

  if (reportsError) {
    throw new Error(`Could not load AI reports: ${reportsError.message}`);
  }

  if (bookingsError) {
    throw new Error(`Could not load bookings: ${bookingsError.message}`);
  }

  if (prescriptionsError) {
    throw new Error(
      `Could not load prescriptions: ${prescriptionsError.message}`,
    );
  }

  const reportByPatientId = new Map(
    ((reports ?? []) as unknown as ReportRow[]).map((report) => [
      report.patient_id,
      report,
    ]),
  );
  const bookingByPatientId = new Map(
    ((bookings ?? []) as unknown as BookingRow[]).map((booking) => [
      booking.patient_id,
      booking,
    ]),
  );
  const prescriptionByBookingId = new Map(
    ((prescriptions ?? []) as PrescriptionRow[]).map((prescription) => [
      prescription.booking_id,
      prescription,
    ]),
  );

  return patientRows.map((patient) => {
    const report = reportByPatientId.get(patient.id) ?? null;
    const booking = bookingByPatientId.get(patient.id) ?? null;
    const prescription = booking
      ? prescriptionByBookingId.get(booking.id) ?? null
      : null;
    const specialty = one(report?.specialties ?? null);
    const doctor = one(booking?.doctors ?? null);
    const slot = one(booking?.doctor_slots ?? null);

    return {
      patient_id: patient.id,
      patient_code: patient.patient_code,
      patient_name: patient.full_name,
      visit_date: patient.created_at,
      symptom_input: patient.symptom_input,
      symptom_summary: report?.symptom_summary ?? null,
      urgency_level: report?.urgency_level ?? null,
      reasoning: report?.reasoning ?? null,
      specialty_name: specialty?.name ?? null,
      booking_code: booking?.booking_code ?? null,
      token_number: booking?.token_number ?? null,
      booking_status: booking?.booking_status ?? null,
      consultation_status: booking?.consultation_status ?? null,
      doctor_name: doctor?.full_name ?? null,
      slot_date: slot?.slot_date ?? null,
      slot_start_time: slot?.start_time ?? null,
      diagnosis: prescription?.diagnosis ?? null,
      prescription_text: prescription?.prescription_text ?? null,
      notes: prescription?.notes ?? null,
      follow_up_advice: prescription?.follow_up_advice ?? null,
      prescription_date: prescription?.created_at ?? null,
    };
  });
}

export async function getPatientAccountOverview(
  lookup: string,
): Promise<PatientAccountOverview> {
  const supabase = getSupabaseClient();
  const trimmedLookup = lookup.trim();
  const normalizedLookup = normalizePatientLookup(trimmedLookup);
  const query = supabase
    .from("patients")
    .select("id,patient_code,full_name,age,gender,phone,symptom_input,created_at")
    .order("created_at", { ascending: false });

  const { data: patients, error } = isPatientCode(trimmedLookup)
    ? await query.eq("patient_code", normalizedLookup)
    : await query;

  if (error) {
    throw new Error(`Could not load patient account: ${error.message}`);
  }

  const patientRows = isPatientCode(trimmedLookup)
    ? ((patients ?? []) as PatientRow[])
    : ((patients ?? []) as PatientRow[]).filter((patient) =>
        hasSamePhone(patient.phone, normalizedLookup),
      );
  const history = await getHistoryForPatientRows(patientRows);
  const latest = patientRows[0] ?? null;

  return {
    lookup: normalizedLookup || trimmedLookup,
    latestProfile: latest
      ? {
          patient_id: latest.id,
          patient_code: latest.patient_code,
          full_name: latest.full_name,
          age: latest.age,
          gender: latest.gender,
          phone: latest.phone,
          created_at: latest.created_at,
        }
      : null,
    history,
  };
}
