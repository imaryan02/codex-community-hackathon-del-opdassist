# TECH_STACK_GUIDE.md

## Purpose
This document defines the tech decisions, coding direction, folder structure approach, and implementation rules for the hackathon MVP.

This is meant to keep development fast, clean, and controlled while using Codex.

---

## 1. Final Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- React Router DOM

### Backend / Database
- Supabase
  - Postgres database
  - Supabase JS client

### AI
- OpenAI API

### Optional Libraries
- `lucide-react` for icons
- `uuid` for helper IDs if needed

---

## 2. Build Philosophy

We are **not** building a full production hospital system.

We are building a **clean hackathon MVP** that feels real and scalable.

### Priority Order
1. Working end-to-end flow
2. Clean UI
3. AI working properly
4. Data persistence in Supabase
5. Doctor dashboard and prescription flow

### Avoid
- overengineering
- too many abstractions
- complex auth
- complex global state unless necessary
- unnecessary backend server if Supabase handles most of it

---

## 3. App Architecture Decision

We should keep the frontend as a single React app with simple route-based pages.

### Main Pages
- `/` → landing page
- `/register` → patient registration + symptom input
- `/recommendation` → AI recommendation result
- `/booking` → doctor + slot selection
- `/confirmation` → booking success page
- `/doctor-dashboard` → doctor queue
- `/consultation/:bookingId` → patient consultation page

---

## 4. State Strategy

Use simple React state first.

### Recommended
- `useState`
- `useEffect`
- local component state
- pass flow data through navigation state or lightweight local storage if needed

### Avoid initially
- Redux
- Zustand
- overly complex context architecture

For hackathon speed, simple state is better.

---

## 5. Supabase Strategy

Use Supabase directly from frontend for:
- reading doctors
- reading slots
- creating patients
- creating bookings
- saving prescriptions

### Keep it simple
We do not need a separate backend server unless absolutely necessary.

### Supabase will handle
- database storage
- CRUD operations
- persistent data

---

## 6. OpenAI Strategy

Use OpenAI only for one focused responsibility:

### AI Intake Analysis
Input:
- patient symptom description

Output:
- symptom summary
- recommended specialty
- urgency level
- reasoning

### Important Rule
AI should **not** try to act like a full doctor.

It should only:
- structure symptoms
- suggest the right department/specialty
- assist routing

---

## 7. Voice Input Strategy

For MVP, use browser voice input if possible.

### Best fast option
Use browser speech recognition only for capturing symptom text.

Flow:
- patient clicks mic
- speech converts to text
- text is sent to OpenAI

This keeps architecture simple.

### If voice is unstable
Fallback:
- keep voice button optional
- make text flow the primary path

---

## 8. Folder Structure

Recommended frontend structure:

```text
src/
  app/
    routes.tsx
  components/
    ui/
    shared/
  pages/
    LandingPage.tsx
    RegisterPage.tsx
    RecommendationPage.tsx
    BookingPage.tsx
    ConfirmationPage.tsx
    DoctorDashboardPage.tsx
    ConsultationPage.tsx
  lib/
    supabase.ts
    openai.ts
    utils.ts
    codeGenerators.ts
  services/
    patientService.ts
    aiService.ts
    doctorService.ts
    bookingService.ts
    prescriptionService.ts
  types/
    patient.ts
    doctor.ts
    booking.ts
    ai.ts




    Structure Principle
pages = route screens
services = data operations
lib = setup / helper files
types = shared TS types
components = reusable UI
9. UI Design Direction

The UI should look:

modern
clean
hospital-like
trustworthy
simple to demo
Tailwind Direction

Use:

white / light background
blue / teal primary accents
rounded cards
clean spacing
soft shadows
visible form steps
Key UI Goal

Judges should understand the flow in seconds.

10. Main Components to Build
Shared Components
Navbar / Header
Step progress indicator
Form input fields
Voice input button
Doctor card
Slot card
Booking summary card
Queue row card
Prescription form card
Reusable UI Principle

Do not make everything reusable too early.
Reuse only where obvious.

11. Service Layer Responsibilities
aiService.ts
send symptom text to OpenAI
return structured intake analysis
patientService.ts
create patient
generate patient code if needed
doctorService.ts
fetch doctors by specialty
fetch doctor queue
fetch booking detail for doctor
bookingService.ts
fetch available slots
create booking
update slot booked
prescriptionService.ts
save prescription
optionally update consultation status
12. Type Safety Rules

Use TypeScript types for all major entities:

Patient
Specialty
Doctor
DoctorSlot
AIIntakeReport
Booking
Prescription
Rule

Do not use too many any types.

Keep interfaces simple and practical.

13. Coding Rules for Codex

Codex should follow these rules:

General
keep files small and readable
do not overabstract
use functional React components
use TypeScript properly
keep UI simple and polished
avoid unnecessary libraries
UI
use Tailwind utility classes only
mobile-first layout
readable spacing and typography
do not build overly complex animations
Data
use Supabase JS client for CRUD
keep queries simple
use joined reads where useful
do sequential writes for booking flow
AI
restrict AI output to known specialties
return structured JSON-like data
do not generate unsafe medical diagnosis language
14. MVP Data Flow Strategy
Step-by-step
Patient fills form
Symptom input sent to OpenAI
AI response received
Patient row created in Supabase
AI report row created
Doctors fetched by recommended specialty
Slots fetched for selected doctor
Booking created
Slot marked booked
Doctor dashboard reads bookings
Prescription saved from doctor consultation page

This is the only flow that matters.

15. Error Handling Strategy

Keep error handling simple but visible.

Show clear frontend errors for:
failed AI analysis
failed patient save
failed booking creation
failed prescription save
no slots available
UI Principle

Never fail silently.

16. Demo Readiness Rules

Because this is a hackathon, the app must always be demoable.

Therefore:
pre-seed doctors
pre-seed specialties
pre-seed slots
keep one default hospital flow
keep doctor dashboard ready with visible records
Important

Even if one feature is weak, the end-to-end demo should still work.

17. Out of Scope Tech Decisions

We will not add:

full auth
role-based access
advanced backend server
full RBAC
realtime sync
file uploads
payment flow
complex caching
testing setup beyond sanity if time is short
18. Final Build Principle

This project should feel like:

a real hospital workflow MVP
powered by AI
backed by real persistent data
simple enough to complete quickly
structured enough to appear scalable

That balance is the goal.