-- AI Hospital Intake MVP - Supabase RLS policies
-- Run this after db/schema.sql and db/seed.sql.
--
-- This project intentionally uses a no-auth, frontend-direct Supabase flow for
-- the hackathon MVP. These policies allow the anon key to read demo data and
-- perform the minimum writes needed by the documented workflow.
--
-- Do not use these policies as-is for a production healthcare app.

grant usage on schema public to anon;

alter table specialties enable row level security;
alter table doctors enable row level security;
alter table doctor_slots enable row level security;
alter table patients enable row level security;
alter table ai_intake_reports enable row level security;
alter table bookings enable row level security;
alter table prescriptions enable row level security;

grant select on specialties to anon;
grant select, insert, update, delete on doctors to anon;
grant select, insert, update, delete on doctor_slots to anon;
grant select, insert, update on patients to anon;
grant select, insert on ai_intake_reports to anon;
grant select, insert, update on bookings to anon;
grant select, insert on prescriptions to anon;

drop policy if exists "mvp_read_specialties" on specialties;
create policy "mvp_read_specialties"
on specialties
for select
to anon
using (true);

drop policy if exists "mvp_read_doctors" on doctors;
create policy "mvp_read_doctors"
on doctors
for select
to anon
using (true);

drop policy if exists "mvp_insert_doctors" on doctors;
create policy "mvp_insert_doctors"
on doctors
for insert
to anon
with check (true);

drop policy if exists "mvp_update_doctors" on doctors;
create policy "mvp_update_doctors"
on doctors
for update
to anon
using (true)
with check (true);

drop policy if exists "mvp_delete_doctors" on doctors;
create policy "mvp_delete_doctors"
on doctors
for delete
to anon
using (true);

drop policy if exists "mvp_read_doctor_slots" on doctor_slots;
create policy "mvp_read_doctor_slots"
on doctor_slots
for select
to anon
using (true);

drop policy if exists "mvp_update_doctor_slots" on doctor_slots;
create policy "mvp_update_doctor_slots"
on doctor_slots
for update
to anon
using (true)
with check (true);

drop policy if exists "mvp_insert_doctor_slots" on doctor_slots;
create policy "mvp_insert_doctor_slots"
on doctor_slots
for insert
to anon
with check (true);

drop policy if exists "mvp_delete_doctor_slots" on doctor_slots;
create policy "mvp_delete_doctor_slots"
on doctor_slots
for delete
to anon
using (true);

drop policy if exists "mvp_read_patients" on patients;
create policy "mvp_read_patients"
on patients
for select
to anon
using (true);

drop policy if exists "mvp_insert_patients" on patients;
create policy "mvp_insert_patients"
on patients
for insert
to anon
with check (true);

drop policy if exists "mvp_update_patients" on patients;
create policy "mvp_update_patients"
on patients
for update
to anon
using (true)
with check (true);

drop policy if exists "mvp_read_ai_intake_reports" on ai_intake_reports;
create policy "mvp_read_ai_intake_reports"
on ai_intake_reports
for select
to anon
using (true);

drop policy if exists "mvp_insert_ai_intake_reports" on ai_intake_reports;
create policy "mvp_insert_ai_intake_reports"
on ai_intake_reports
for insert
to anon
with check (true);

drop policy if exists "mvp_read_bookings" on bookings;
create policy "mvp_read_bookings"
on bookings
for select
to anon
using (true);

drop policy if exists "mvp_insert_bookings" on bookings;
create policy "mvp_insert_bookings"
on bookings
for insert
to anon
with check (true);

drop policy if exists "mvp_update_bookings" on bookings;
create policy "mvp_update_bookings"
on bookings
for update
to anon
using (true)
with check (true);

drop policy if exists "mvp_read_prescriptions" on prescriptions;
create policy "mvp_read_prescriptions"
on prescriptions
for select
to anon
using (true);

drop policy if exists "mvp_insert_prescriptions" on prescriptions;
create policy "mvp_insert_prescriptions"
on prescriptions
for insert
to anon
with check (true);
