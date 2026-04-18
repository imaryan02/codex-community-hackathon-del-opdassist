-- Supplemental demo seed: more doctors and more same-day consultation slots.
--
-- Run this after:
-- 1. db/schema.sql
-- 2. db/seed.sql
-- 3. db/rls_policies.sql
--
-- Purpose:
-- - Give patients multiple doctor choices for the same recommended specialty.
-- - Add extra General Medicine / physician options for common symptom routing.
-- - Keep the file idempotent so it can be safely re-run without duplicating
--   today's slots for the same doctor and time.

insert into doctors (
  id,
  full_name,
  specialty_id,
  experience_years,
  qualification,
  hospital_name,
  available_today
)
values
  -- Extra General Medicine doctors for common AI routing.
  ('30000000-0000-0000-0000-000000000001', 'Dr. Aisha Verma', '11111111-1111-1111-1111-111111111111', 9, 'MBBS, MD Internal Medicine', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000002', 'Dr. Neeraj Bansal', '11111111-1111-1111-1111-111111111111', 7, 'MBBS, DNB Family Medicine', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000003', 'Dr. Sara Thomas', '11111111-1111-1111-1111-111111111111', 12, 'MBBS, MD General Medicine', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000004', 'Dr. Devika Nair', '11111111-1111-1111-1111-111111111111', 6, 'MBBS, MD Internal Medicine', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000005', 'Dr. Imran Khan', '11111111-1111-1111-1111-111111111111', 14, 'MBBS, MD Medicine', 'CityCare Hospital', true),

  -- Additional doctors across specialties so the directory feels fuller.
  ('30000000-0000-0000-0000-000000000006', 'Dr. Tanish Gupta', '22222222-2222-2222-2222-222222222222', 10, 'MBBS, DM Gastroenterology', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000007', 'Dr. Shalini Menon', '33333333-3333-3333-3333-333333333333', 11, 'MBBS, MS Obstetrics and Gynecology', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000008', 'Dr. Esha Kulkarni', '44444444-4444-4444-4444-444444444444', 8, 'MBBS, MS Orthopedics', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000009', 'Dr. Reena Shah', '55555555-5555-5555-5555-555555555555', 9, 'MBBS, MD Dermatology', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000010', 'Dr. Kabir Ali', '66666666-6666-6666-6666-666666666666', 7, 'MBBS, MS ENT', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000011', 'Dr. Aditi Chawla', '77777777-7777-7777-7777-777777777777', 10, 'MBBS, MD Pediatrics', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000012', 'Dr. Mohnish Rao', '88888888-8888-8888-8888-888888888888', 15, 'MBBS, DM Cardiology', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000013', 'Dr. Pallavi Sethi', '99999999-9999-9999-9999-999999999999', 13, 'MBBS, DM Neurology', 'CityCare Hospital', true),
  ('30000000-0000-0000-0000-000000000014', 'Dr. Farah Qureshi', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 9, 'MBBS, MD Pulmonology', 'CityCare Hospital', true)
on conflict (id) do update set
  full_name = excluded.full_name,
  specialty_id = excluded.specialty_id,
  experience_years = excluded.experience_years,
  qualification = excluded.qualification,
  hospital_name = excluded.hospital_name,
  available_today = excluded.available_today;

with new_slots (doctor_id, start_time, end_time) as (
  values
    -- General Medicine: more consultation capacity and choice.
    ('30000000-0000-0000-0000-000000000001'::uuid, '08:30'::time, '08:50'::time),
    ('30000000-0000-0000-0000-000000000001'::uuid, '09:00'::time, '09:20'::time),
    ('30000000-0000-0000-0000-000000000001'::uuid, '09:30'::time, '09:50'::time),
    ('30000000-0000-0000-0000-000000000001'::uuid, '10:00'::time, '10:20'::time),
    ('30000000-0000-0000-0000-000000000001'::uuid, '10:30'::time, '10:50'::time),

    ('30000000-0000-0000-0000-000000000002'::uuid, '11:00'::time, '11:20'::time),
    ('30000000-0000-0000-0000-000000000002'::uuid, '11:30'::time, '11:50'::time),
    ('30000000-0000-0000-0000-000000000002'::uuid, '12:00'::time, '12:20'::time),
    ('30000000-0000-0000-0000-000000000002'::uuid, '12:30'::time, '12:50'::time),
    ('30000000-0000-0000-0000-000000000002'::uuid, '13:00'::time, '13:20'::time),

    ('30000000-0000-0000-0000-000000000003'::uuid, '14:00'::time, '14:20'::time),
    ('30000000-0000-0000-0000-000000000003'::uuid, '14:30'::time, '14:50'::time),
    ('30000000-0000-0000-0000-000000000003'::uuid, '15:00'::time, '15:20'::time),
    ('30000000-0000-0000-0000-000000000003'::uuid, '15:30'::time, '15:50'::time),
    ('30000000-0000-0000-0000-000000000003'::uuid, '16:00'::time, '16:20'::time),

    ('30000000-0000-0000-0000-000000000004'::uuid, '16:30'::time, '16:50'::time),
    ('30000000-0000-0000-0000-000000000004'::uuid, '17:00'::time, '17:20'::time),
    ('30000000-0000-0000-0000-000000000004'::uuid, '17:30'::time, '17:50'::time),
    ('30000000-0000-0000-0000-000000000004'::uuid, '18:00'::time, '18:20'::time),
    ('30000000-0000-0000-0000-000000000004'::uuid, '18:30'::time, '18:50'::time),

    ('30000000-0000-0000-0000-000000000005'::uuid, '09:15'::time, '09:35'::time),
    ('30000000-0000-0000-0000-000000000005'::uuid, '09:45'::time, '10:05'::time),
    ('30000000-0000-0000-0000-000000000005'::uuid, '10:15'::time, '10:35'::time),
    ('30000000-0000-0000-0000-000000000005'::uuid, '10:45'::time, '11:05'::time),
    ('30000000-0000-0000-0000-000000000005'::uuid, '11:15'::time, '11:35'::time),

    -- Other specialties: enough slots to make directory booking demos work.
    ('30000000-0000-0000-0000-000000000006'::uuid, '12:00'::time, '12:20'::time),
    ('30000000-0000-0000-0000-000000000006'::uuid, '12:30'::time, '12:50'::time),
    ('30000000-0000-0000-0000-000000000006'::uuid, '13:00'::time, '13:20'::time),

    ('30000000-0000-0000-0000-000000000007'::uuid, '12:00'::time, '12:20'::time),
    ('30000000-0000-0000-0000-000000000007'::uuid, '12:30'::time, '12:50'::time),
    ('30000000-0000-0000-0000-000000000007'::uuid, '13:00'::time, '13:20'::time),

    ('30000000-0000-0000-0000-000000000008'::uuid, '13:30'::time, '13:50'::time),
    ('30000000-0000-0000-0000-000000000008'::uuid, '14:00'::time, '14:20'::time),
    ('30000000-0000-0000-0000-000000000008'::uuid, '14:30'::time, '14:50'::time),

    ('30000000-0000-0000-0000-000000000009'::uuid, '13:30'::time, '13:50'::time),
    ('30000000-0000-0000-0000-000000000009'::uuid, '14:00'::time, '14:20'::time),
    ('30000000-0000-0000-0000-000000000009'::uuid, '14:30'::time, '14:50'::time),

    ('30000000-0000-0000-0000-000000000010'::uuid, '15:00'::time, '15:20'::time),
    ('30000000-0000-0000-0000-000000000010'::uuid, '15:30'::time, '15:50'::time),
    ('30000000-0000-0000-0000-000000000010'::uuid, '16:00'::time, '16:20'::time),

    ('30000000-0000-0000-0000-000000000011'::uuid, '15:00'::time, '15:20'::time),
    ('30000000-0000-0000-0000-000000000011'::uuid, '15:30'::time, '15:50'::time),
    ('30000000-0000-0000-0000-000000000011'::uuid, '16:00'::time, '16:20'::time),

    ('30000000-0000-0000-0000-000000000012'::uuid, '16:30'::time, '16:50'::time),
    ('30000000-0000-0000-0000-000000000012'::uuid, '17:00'::time, '17:20'::time),
    ('30000000-0000-0000-0000-000000000012'::uuid, '17:30'::time, '17:50'::time),

    ('30000000-0000-0000-0000-000000000013'::uuid, '16:30'::time, '16:50'::time),
    ('30000000-0000-0000-0000-000000000013'::uuid, '17:00'::time, '17:20'::time),
    ('30000000-0000-0000-0000-000000000013'::uuid, '17:30'::time, '17:50'::time),

    ('30000000-0000-0000-0000-000000000014'::uuid, '18:00'::time, '18:20'::time),
    ('30000000-0000-0000-0000-000000000014'::uuid, '18:30'::time, '18:50'::time),
    ('30000000-0000-0000-0000-000000000014'::uuid, '19:00'::time, '19:20'::time)
)
insert into doctor_slots (
  doctor_id,
  slot_date,
  start_time,
  end_time,
  is_booked
)
select
  new_slots.doctor_id,
  current_date,
  new_slots.start_time,
  new_slots.end_time,
  false
from new_slots
where not exists (
  select 1
  from doctor_slots existing_slots
  where existing_slots.doctor_id = new_slots.doctor_id
    and existing_slots.slot_date = current_date
    and existing_slots.start_time = new_slots.start_time
    and existing_slots.end_time = new_slots.end_time
);
