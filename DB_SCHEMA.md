# DB_SCHEMA.md

## Purpose
This schema is the minimum required Supabase database design for the hackathon MVP.

It is designed to support:
- patient registration
- AI symptom analysis
- specialty-based doctor recommendation
- slot booking
- doctor-side queue / patient view
- digital prescription / consultation notes
- future patient history foundation

We are keeping it minimal but structured so the app feels scalable.

---

## 1. Tables Overview

We need these 7 tables:

1. `specialties`
2. `doctors`
3. `doctor_slots`
4. `patients`
5. `ai_intake_reports`
6. `bookings`
7. `prescriptions`

---

## 2. Table Details

---

## Table: specialties

### Purpose
Stores doctor domains/specialties.

### Fields
- `id` → uuid, primary key
- `name` → text, unique, not null
- `description` → text, nullable
- `created_at` → timestamp, default now()

### Example Data
- General Medicine
- Gastroenterology
- Gynecology
- Orthopedics
- Dermatology
- ENT
- Pediatrics
- Cardiology
- Neurology
- Pulmonology

---

## Table: doctors

### Purpose
Stores doctor information.

### Fields
- `id` → uuid, primary key
- `full_name` → text, not null
- `specialty_id` → uuid, foreign key → specialties.id
- `experience_years` → integer, nullable
- `qualification` → text, nullable
- `hospital_name` → text, nullable
- `available_today` → boolean, default true
- `created_at` → timestamp, default now()

### Notes
Each doctor belongs to one specialty for MVP.

---

## Table: doctor_slots

### Purpose
Stores available booking slots for doctors.

### Fields
- `id` → uuid, primary key
- `doctor_id` → uuid, foreign key → doctors.id
- `slot_date` → date, not null
- `start_time` → time, not null
- `end_time` → time, not null
- `is_booked` → boolean, default false
- `created_at` → timestamp, default now()

### Notes
For hackathon MVP, we can pre-seed slots for one or two days.

---

## Table: patients

### Purpose
Stores patient registration details and long-term patient identity.

### Fields
- `id` → uuid, primary key
- `patient_code` → text, unique, not null
- `full_name` → text, not null
- `age` → integer, not null
- `gender` → text, nullable
- `phone` → text, nullable
- `symptom_input` → text, not null
- `input_mode` → text, not null
- `created_at` → timestamp, default now()

### Notes
`input_mode` values:
- text
- voice

`patient_code` is the human-readable patient reference shown in UI.

Example:
- PAT-1001
- PAT-1002

---

## Table: ai_intake_reports

### Purpose
Stores AI-generated structured analysis for a patient.

### Fields
- `id` → uuid, primary key
- `patient_id` → uuid, foreign key → patients.id
- `symptom_summary` → text, not null
- `recommended_specialty_id` → uuid, foreign key → specialties.id
- `urgency_level` → text, nullable
- `reasoning` → text, nullable
- `raw_input` → text, nullable
- `created_at` → timestamp, default now()

### Notes
This table is important because it proves AI output is stored and reusable.

### Recommended urgency values
- low
- medium
- high

---

## Table: bookings

### Purpose
Stores final doctor appointment bookings.

### Fields
- `id` → uuid, primary key
- `booking_code` → text, unique, not null
- `patient_id` → uuid, foreign key → patients.id
- `doctor_id` → uuid, foreign key → doctors.id
- `slot_id` → uuid, foreign key → doctor_slots.id
- `ai_report_id` → uuid, foreign key → ai_intake_reports.id
- `booking_status` → text, default 'confirmed'
- `consultation_status` → text, default 'waiting'
- `token_number` → integer, nullable
- `created_at` → timestamp, default now()

### Recommended booking_status values
- confirmed
- cancelled
- completed

### Recommended consultation_status values
- waiting
- in_consultation
- completed

### Notes
`booking_code` is the visit-level reference.

Example:
- BKG-3001
- BKG-3002

---

## Table: prescriptions

### Purpose
Stores doctor consultation output digitally.

### Fields
- `id` → uuid, primary key
- `patient_id` → uuid, foreign key → patients.id
- `booking_id` → uuid, foreign key → bookings.id
- `doctor_id` → uuid, foreign key → doctors.id
- `diagnosis` → text, nullable
- `prescription_text` → text, nullable
- `notes` → text, nullable
- `follow_up_advice` → text, nullable
- `created_at` → timestamp, default now()

### Notes
This is the base for future patient history.

---

## 3. Relationships

### Core Relationships
- One specialty has many doctors
- One doctor has many slots
- One patient can have many visits over time
- One patient can have many AI intake reports over time
- One booking belongs to one patient, one doctor, and one slot
- One booking can optionally have one prescription in MVP
- One prescription belongs to one patient and one booking

### Relationship Summary
- `doctors.specialty_id` → `specialties.id`
- `doctor_slots.doctor_id` → `doctors.id`
- `ai_intake_reports.patient_id` → `patients.id`
- `ai_intake_reports.recommended_specialty_id` → `specialties.id`
- `bookings.patient_id` → `patients.id`
- `bookings.doctor_id` → `doctors.id`
- `bookings.slot_id` → `doctor_slots.id`
- `bookings.ai_report_id` → `ai_intake_reports.id`
- `prescriptions.patient_id` → `patients.id`
- `prescriptions.booking_id` → `bookings.id`
- `prescriptions.doctor_id` → `doctors.id`

---

## 4. Minimal SQL Shape

```sql
create table specialties (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamp with time zone default now()
);

create table doctors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  specialty_id uuid references specialties(id) on delete cascade,
  experience_years integer,
  qualification text,
  hospital_name text,
  available_today boolean default true,
  created_at timestamp with time zone default now()
);

create table doctor_slots (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) on delete cascade,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  is_booked boolean default false,
  created_at timestamp with time zone default now()
);

create table patients (
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

create table ai_intake_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  symptom_summary text not null,
  recommended_specialty_id uuid references specialties(id) on delete set null,
  urgency_level text,
  reasoning text,
  raw_input text,
  created_at timestamp with time zone default now()
);

create table bookings (
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

create table prescriptions (
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