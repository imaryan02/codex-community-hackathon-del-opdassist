import { getSupabaseClient } from "../lib/supabase";
import type { Prescription, PrescriptionInput } from "../types/prescription";

export async function savePrescription(
  input: PrescriptionInput,
): Promise<Prescription> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("prescriptions")
    .insert({
      patient_id: input.patient_id,
      booking_id: input.booking_id,
      doctor_id: input.doctor_id,
      diagnosis: input.diagnosis,
      prescription_text: input.prescription_text,
      notes: input.notes,
      follow_up_advice: input.follow_up_advice,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Could not save consultation: ${error.message}`);
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      consultation_status: "completed",
      booking_status: "completed",
    })
    .eq("id", input.booking_id);

  if (updateError) {
    throw new Error(
      `Consultation was saved, but status update failed: ${updateError.message}`,
    );
  }

  return data;
}
