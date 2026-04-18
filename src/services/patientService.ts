import { getSupabaseClient } from "../lib/supabase";
import type { AIIntakeResult } from "../types/ai";
import type {
  Patient,
  PatientRegistrationInput,
  SavedPatientIntake,
} from "../types/patient";

function generatePatientCode() {
  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 90 + 10);
  return `PAT-${timestampPart}${randomPart}`;
}

function getSupabaseErrorMessage(action: string, error: { message: string }) {
  return `${action}: ${error.message}`;
}

export async function createPatient(
  input: PatientRegistrationInput,
): Promise<Patient> {
  const supabase = getSupabaseClient();
  const patientCode = generatePatientCode();

  const { data, error } = await supabase
    .from("patients")
    .insert({
      patient_code: patientCode,
      full_name: input.full_name,
      age: input.age,
      gender: input.gender,
      phone: input.phone,
      symptom_input: input.symptom_input,
      input_mode: input.input_mode,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(getSupabaseErrorMessage("Could not save patient", error));
  }

  return data;
}

export async function savePatientIntake(
  patientInput: PatientRegistrationInput,
  aiResult: AIIntakeResult,
): Promise<SavedPatientIntake> {
  const supabase = getSupabaseClient();

  const patient = await createPatient(patientInput);

  const { data: specialty, error: specialtyError } = await supabase
    .from("specialties")
    .select("id,name")
    .eq("name", aiResult.recommended_specialty)
    .single();

  if (specialtyError) {
    throw new Error(
      getSupabaseErrorMessage("Could not find recommended specialty", specialtyError),
    );
  }

  const { data: aiReport, error: aiReportError } = await supabase
    .from("ai_intake_reports")
    .insert({
      patient_id: patient.id,
      symptom_summary: aiResult.symptom_summary,
      recommended_specialty_id: specialty.id,
      urgency_level: aiResult.urgency_level,
      reasoning: aiResult.reasoning,
      raw_input: patientInput.symptom_input,
    })
    .select("id")
    .single();

  if (aiReportError) {
    throw new Error(
      getSupabaseErrorMessage("Could not save AI intake report", aiReportError),
    );
  }

  return {
    patient_id: patient.id,
    patient_code: patient.patient_code,
    ai_report_id: aiReport.id,
    recommended_specialty_id: specialty.id,
    recommended_specialty_name: aiResult.recommended_specialty,
    symptom_summary: aiResult.symptom_summary,
    urgency_level: aiResult.urgency_level,
    reasoning: aiResult.reasoning,
  };
}
