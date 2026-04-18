# OPD Assist - AI Powered Hospital Kiosk System

OPD Assist is a simple kiosk-style system built for government hospital OPD workflows. It helps patients check in using a mobile number, complete a guided AI intake, find available doctors, request an OPD token, and continue their medical record across repeat visits.

The project is hosted on Vercel and built as a working prototype for jury evaluation.

## Problem Statement

Government hospital OPDs are often overcrowded. Patients wait in long queues, repeat the same details at every visit, and may not know which department or doctor they should go to. Doctors also need quick access to the patient's past records to give better and faster care.

## Our Solution

We built an easy-to-use kiosk-style OPD system for hospitals. Patients can log in with their mobile number, enter details through touch or voice, and get AI guidance for the right department. They can view available doctors, request an OPD token, and pay at the reception using the token number.

Admin staff can manage doctors, slots, availability, and approve tokens. Doctors can view approved patients with their symptoms, AI summary, and previous visit history in one place.

## Key Features

- Mobile-number based patient login
- Touch and voice based patient intake
- AI symptom summary and department recommendation
- Doctor directory with availability
- OPD slot and token request flow
- Reception/admin approval for OPD tokens
- Patient health record linked to mobile number
- Previous visit history visible to patients and doctors
- Doctor dashboard for approved OPD queue
- Digital prescription and consultation notes
- Admin dashboard to manage doctors, slots, and token approvals
- Payment gateway skipped for prototype: patient pays at reception using token number

## User Roles

### Patient

- Logs in using mobile number
- Creates a new OPD visit
- Uses touch or voice intake
- Gets AI-based department guidance
- Requests token for a doctor slot
- Views previous visits and prescriptions

### Admin / Reception

- Approves OPD tokens after reception verification
- Manages doctors
- Manages doctor availability
- Creates and manages OPD slots
- Tracks today's OPD flow

### Doctor

- Logs in with demo doctor credentials
- Selects doctor profile
- Views only approved OPD tokens
- Sees patient details, AI summary, and past visit history
- Adds diagnosis, prescription, notes, and follow-up advice

## Application Flow

1. Patient logs in with mobile number.
2. If the patient is new, they are sent to AI intake.
3. If the patient already has records, their dashboard opens.
4. Patient starts a new OPD visit for self or another patient.
5. AI intake collects name, age, gender, phone, and symptoms.
6. AI recommends the suitable department.
7. Patient selects an available doctor and slot.
8. OPD token is generated and waits for admin approval.
9. Reception/admin approves the token.
10. Doctor sees the patient in the approved queue.
11. Doctor completes consultation and saves prescription.
12. Visit is stored in the patient's health record for future visits.

## Tech Stack

- Frontend: React 19, TypeScript, Vite
- Styling: Tailwind CSS
- Routing: React Router
- Database: Supabase PostgreSQL
- Backend Services: Supabase client-side services
- AI: OpenAI API for symptom analysis and department recommendation
- Hosting: Vercel

## Demo Credentials

### Admin

```text
Email: admin@hospital.test
Password: admin123
```

### Doctor

```text
Email: doctor@hospital.test
Password: doctor123
```

After doctor login, select a doctor profile from the dropdown.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example` and add the required Supabase and OpenAI keys.

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Database

The app uses Supabase tables for:

- patients
- doctors
- doctor slots
- specialties
- AI intake reports
- bookings
- prescriptions

RLS policies for the prototype are available in:

```text
db/rls_policies.sql
```

These policies are for hackathon/demo use only. A production healthcare system should use proper authentication, verified OTP login, staff accounts, and strict patient-record access rules.

## Prototype Note

This is a working prototype focused on the complete OPD journey. Authentication is simplified for demo purposes. In production, patient login would use verified mobile OTP, staff would use secure hospital accounts, and medical record access would be strictly controlled.

