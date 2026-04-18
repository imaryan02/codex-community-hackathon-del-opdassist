insert into specialties (id, name, description)
values
  ('11111111-1111-1111-1111-111111111111', 'General Medicine', 'General health concerns, fever, fatigue, and common illnesses.'),
  ('22222222-2222-2222-2222-222222222222', 'Gastroenterology', 'Digestive system concerns including stomach pain, vomiting, acidity, and bowel issues.'),
  ('33333333-3333-3333-3333-333333333333', 'Gynecology', 'Women''s health, pregnancy-related concerns, and reproductive health.'),
  ('44444444-4444-4444-4444-444444444444', 'Orthopedics', 'Bone, joint, muscle, and movement-related concerns.'),
  ('55555555-5555-5555-5555-555555555555', 'Dermatology', 'Skin, hair, nail, rash, allergy, and infection concerns.'),
  ('66666666-6666-6666-6666-666666666666', 'ENT', 'Ear, nose, throat, sinus, voice, and hearing concerns.'),
  ('77777777-7777-7777-7777-777777777777', 'Pediatrics', 'Child and adolescent health concerns.'),
  ('88888888-8888-8888-8888-888888888888', 'Cardiology', 'Heart, blood pressure, chest discomfort, and circulation concerns.'),
  ('99999999-9999-9999-9999-999999999999', 'Neurology', 'Brain, nerve, headache, seizure, and numbness concerns.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pulmonology', 'Lung, breathing, cough, asthma, and respiratory concerns.')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

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
  ('10000000-0000-0000-0000-000000000001', 'Dr. Ananya Sharma', '11111111-1111-1111-1111-111111111111', 11, 'MBBS, MD General Medicine', 'CityCare Hospital', true),
  ('10000000-0000-0000-0000-000000000002', 'Dr. Rohan Mehta', '22222222-2222-2222-2222-222222222222', 13, 'MBBS, DM Gastroenterology', 'CityCare Hospital', true),
  ('10000000-0000-0000-0000-000000000003', 'Dr. Nisha Rao', '33333333-3333-3333-3333-333333333333', 9, 'MBBS, MS Gynecology', 'CityCare Hospital', true),
  ('10000000-0000-0000-0000-000000000004', 'Dr. Karan Malhotra', '44444444-4444-4444-4444-444444444444', 15, 'MBBS, MS Orthopedics', 'CityCare Hospital', true),
  ('10000000-0000-0000-0000-000000000005', 'Dr. Meera Iyer', '55555555-5555-5555-5555-555555555555', 8, 'MBBS, MD Dermatology', 'CityCare Hospital', true),
  ('10000000-0000-0000-0000-000000000006', 'Dr. Arjun Sen', '66666666-6666-6666-6666-666666666666', 10, 'MBBS, MS ENT', 'CityCare Hospital', true),
  ('10000000-0000-0000-0000-000000000007', 'Dr. Priya Kapoor', '77777777-7777-7777-7777-777777777777', 12, 'MBBS, MD Pediatrics', 'CityCare Hospital', true),
  ('10000000-0000-0000-0000-000000000008', 'Dr. Sameer Joshi', '88888888-8888-8888-8888-888888888888', 16, 'MBBS, DM Cardiology', 'CityCare Hospital', true),
  ('10000000-0000-0000-0000-000000000009', 'Dr. Kavya Menon', '99999999-9999-9999-9999-999999999999', 14, 'MBBS, DM Neurology', 'CityCare Hospital', true),
  ('10000000-0000-0000-0000-000000000010', 'Dr. Vikram Das', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10, 'MBBS, MD Pulmonology', 'CityCare Hospital', true)
on conflict (id) do update set
  full_name = excluded.full_name,
  specialty_id = excluded.specialty_id,
  experience_years = excluded.experience_years,
  qualification = excluded.qualification,
  hospital_name = excluded.hospital_name,
  available_today = excluded.available_today;

insert into doctor_slots (id, doctor_id, slot_date, start_time, end_time, is_booked)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, '09:00', '09:20', false),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', current_date, '09:30', '09:50', false),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', current_date, '10:00', '10:20', false),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', current_date, '10:30', '10:50', false),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', current_date, '09:00', '09:20', false),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', current_date, '09:30', '09:50', false),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', current_date, '10:00', '10:20', false),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', current_date, '10:30', '10:50', false),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', current_date, '09:00', '09:20', false),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', current_date, '09:30', '09:50', false),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000003', current_date, '10:00', '10:20', false),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', current_date, '10:30', '10:50', false),
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000004', current_date, '11:00', '11:20', false),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000004', current_date, '11:30', '11:50', false),
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000004', current_date, '12:00', '12:20', false),
  ('20000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000004', current_date, '12:30', '12:50', false),
  ('20000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000005', current_date, '11:00', '11:20', false),
  ('20000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000005', current_date, '11:30', '11:50', false),
  ('20000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000005', current_date, '12:00', '12:20', false),
  ('20000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000005', current_date, '12:30', '12:50', false),
  ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000006', current_date, '11:00', '11:20', false),
  ('20000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000006', current_date, '11:30', '11:50', false),
  ('20000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000006', current_date, '12:00', '12:20', false),
  ('20000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000006', current_date, '12:30', '12:50', false),
  ('20000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000007', current_date, '14:00', '14:20', false),
  ('20000000-0000-0000-0000-000000000026', '10000000-0000-0000-0000-000000000007', current_date, '14:30', '14:50', false),
  ('20000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000007', current_date, '15:00', '15:20', false),
  ('20000000-0000-0000-0000-000000000028', '10000000-0000-0000-0000-000000000007', current_date, '15:30', '15:50', false),
  ('20000000-0000-0000-0000-000000000029', '10000000-0000-0000-0000-000000000008', current_date, '14:00', '14:20', false),
  ('20000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000008', current_date, '14:30', '14:50', false),
  ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000008', current_date, '15:00', '15:20', false),
  ('20000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000008', current_date, '15:30', '15:50', false),
  ('20000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000009', current_date, '14:00', '14:20', false),
  ('20000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000009', current_date, '14:30', '14:50', false),
  ('20000000-0000-0000-0000-000000000035', '10000000-0000-0000-0000-000000000009', current_date, '15:00', '15:20', false),
  ('20000000-0000-0000-0000-000000000036', '10000000-0000-0000-0000-000000000009', current_date, '15:30', '15:50', false),
  ('20000000-0000-0000-0000-000000000037', '10000000-0000-0000-0000-000000000010', current_date, '16:00', '16:20', false),
  ('20000000-0000-0000-0000-000000000038', '10000000-0000-0000-0000-000000000010', current_date, '16:30', '16:50', false),
  ('20000000-0000-0000-0000-000000000039', '10000000-0000-0000-0000-000000000010', current_date, '17:00', '17:20', false),
  ('20000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000010', current_date, '17:30', '17:50', false)
on conflict (id) do update set
  doctor_id = excluded.doctor_id,
  slot_date = excluded.slot_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  is_booked = excluded.is_booked;
