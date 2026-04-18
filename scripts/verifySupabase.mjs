import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data: specialties, error: specialtiesError } = await supabase
  .from("specialties")
  .select("id,name")
  .order("name", { ascending: true });

if (specialtiesError) {
  console.error("Failed to read specialties:", specialtiesError.message);
  process.exit(1);
}

const { data: doctors, error: doctorsError } = await supabase
  .from("doctors")
  .select("id,full_name,available_today")
  .eq("available_today", true);

if (doctorsError) {
  console.error("Failed to read doctors:", doctorsError.message);
  process.exit(1);
}

const { data: slots, error: slotsError } = await supabase
  .from("doctor_slots")
  .select("id,slot_date,start_time,end_time,is_booked")
  .eq("slot_date", new Date().toISOString().slice(0, 10))
  .eq("is_booked", false);

if (slotsError) {
  console.error("Failed to read doctor slots:", slotsError.message);
  process.exit(1);
}

console.log("Supabase read verification passed.");
console.log(`Specialties: ${specialties.length}`);
console.log(`Available doctors: ${doctors.length}`);
console.log(`Available slots today: ${slots.length}`);
