create extension if not exists pgcrypto;

create table if not exists specialties (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamp with time zone default now()
);

create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  specialty_id uuid references specialties(id) on delete cascade,
  experience_years integer,
  qualification text,
  hospital_name text,
  available_today boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists doctor_slots (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  is_booked boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text unique not null,
  full_name text not null,
  age integer not null,
  gender text,
  phone text,
  symptom_input text not null,
  input_mode text not null,
  created_at timestamp with time zone default now()
);

create table if not exists ai_intake_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  symptom_summary text not null,
  recommended_specialty_id uuid references specialties(id) on delete set null,
  urgency_level text,
  reasoning text,
  raw_input text,
  created_at timestamp with time zone default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text unique not null,
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete cascade,
  slot_id uuid references doctor_slots(id) on delete cascade,
  ai_report_id uuid references ai_intake_reports(id) on delete set null,
  booking_status text default 'confirmed',
  consultation_status text default 'waiting',
  token_number integer,
  created_at timestamp with time zone default now()
);

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  booking_id uuid references bookings(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete cascade,
  diagnosis text,
  prescription_text text,
  notes text,
  follow_up_advice text,
  created_at timestamp with time zone default now()
);
