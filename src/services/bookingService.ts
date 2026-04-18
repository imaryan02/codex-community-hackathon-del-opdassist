import { getSupabaseClient } from "../lib/supabase";
import type {
  Booking,
  BookingConfirmation,
  BookingDraft,
  DoctorSlot,
} from "../types/booking";

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function getAvailableSlots(
  doctorId: string,
): Promise<DoctorSlot[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("doctor_slots")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("slot_date", getTodayDateString())
    .eq("is_booked", false)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Could not fetch slots: ${error.message}`);
  }

  return data ?? [];
}

function generateBookingCode() {
  const timestampPart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 90 + 10);
  return `BKG-${timestampPart}${randomPart}`;
}

function generateTokenNumber() {
  return Math.floor(Date.now() / 1000) % 900 + 100;
}

export async function createBooking(
  draft: BookingDraft,
): Promise<BookingConfirmation> {
  const supabase = getSupabaseClient();
  const bookingCode = generateBookingCode();
  const tokenNumber = generateTokenNumber();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      booking_code: bookingCode,
      patient_id: draft.patient_id,
      doctor_id: draft.doctor_id,
      slot_id: draft.slot_id,
      ai_report_id: draft.ai_report_id,
      booking_status: "confirmed",
      consultation_status: "waiting",
      token_number: tokenNumber,
    })
    .select("*")
    .single();

  if (bookingError) {
    throw new Error(`Could not create booking: ${bookingError.message}`);
  }

  const { error: slotError } = await supabase
    .from("doctor_slots")
    .update({ is_booked: true })
    .eq("id", draft.slot_id);

  if (slotError) {
    throw new Error(`Booking was created, but slot update failed: ${slotError.message}`);
  }

  return {
    ...draft,
    booking_id: booking.id,
    booking_code: booking.booking_code,
    token_number: booking.token_number ?? tokenNumber,
    booking_status: booking.booking_status,
    consultation_status: booking.consultation_status,
  };
}
