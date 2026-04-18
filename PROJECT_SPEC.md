# PROJECT_SPEC.md

## Project Name
AI Hospital Intake, Booking & Consultation Workflow

---

## 1. Problem Statement
In hospitals and multi-specialty clinics, patients often do not know which doctor or department they should consult. The registration process is usually manual, repetitive, and time-consuming. Front-desk teams collect the same details repeatedly, doctors lose time asking for the same basic information before consultation, and patient records are often scattered on paper.

This creates:
- patient confusion
- unnecessary paperwork
- front-desk overload
- slower consultation workflow
- poor continuity for future visits

---

## 2. Solution Overview
We are building an AI-powered hospital workflow system that helps patients register using text or voice, understand their symptoms, get recommended to the correct specialty/doctor, book an available slot, and send the doctor a structured patient summary before consultation.

After the consultation, the doctor can write a digital prescription/consultation note linked to that patient. This creates the base for future patient history and repeat visits.

The system reduces paperwork and improves patient routing inside a hospital.

---

## 3. Core Idea in One Line
A smart hospital workflow where AI collects patient details, recommends the right doctor, books the slot, prepares the doctor with patient information, and stores the consultation digitally.

---

## 4. Target Users
### Primary Users
- Patients visiting a hospital website / digital kiosk
- Hospital front-desk staff
- Doctors

### Ideal Scenario
A hospital with around 10 doctors across different specialties.

Example specialties:
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

## 5. Main Workflow

### Step 1: Patient Registration
Patient visits the platform and starts registration.

Input methods:
- Text input
- Voice input

Patient provides:
- full name
- age
- gender
- phone number
- symptom/problem description

System creates:
- permanent `patient_id` / `patient_code`

This becomes the patient’s long-term identity in the system.

---

### Step 2: AI Intake Analysis
AI analyzes the patient's symptom description and converts it into structured information.

AI should generate:
- short symptom summary
- recommended specialty
- recommended doctor type/domain
- urgency level (low / medium / high)
- possible reason for recommendation

---

### Step 3: Doctor Recommendation
The system shows:
- recommended specialty
- matching doctors under that specialty
- available slots for each doctor

Patient selects a doctor.

---

### Step 4: Slot Booking
The system books an available slot.

After successful booking, generate:
- booking ID / booking code
- token number
- doctor name
- specialty
- appointment time
- hospital/clinic location if needed

---

### Step 5: Doctor View / Queue
Doctor sees a queue or booking list for today.

For each patient, doctor can view:
- patient name
- patient ID / patient code
- booking code
- token number
- symptom description
- AI-generated summary
- urgency level
- booked slot info

This reduces repetitive questioning and paperwork.

---

### Step 6: Digital Consultation / Prescription
Doctor opens the patient record and writes:
- diagnosis
- prescription
- consultation notes
- follow-up advice

This gets stored against the patient and booking.

---

### Step 7: Future Visits
When the same patient visits again:
- same patient record can be reused
- old consultation/prescription history can be seen
- doctors can get context faster

This becomes the base for a long-term digital patient workflow.

---

## 6. Core Features for Hackathon MVP

### Must Have
- Patient registration form
- Text + voice symptom input
- AI analysis of symptoms
- Specialty recommendation
- Doctor list by specialty
- Available slot selection
- Booking confirmation with booking ID
- Doctor dashboard / doctor-side queue view
- Patient detail view for doctor
- Simple digital prescription / consultation note saving

### Nice to Have
- urgency badge
- token number
- simple appointment status
- hospital branding / clean UI
- booking code search on doctor side

---

## 7. Screens to Build

### Patient Side
1. Landing / Start page
2. Registration + symptom input page
3. AI recommendation page
4. Doctor and slot selection page
5. Booking confirmation page

### Doctor Side
6. Doctor dashboard showing patient queue / bookings
7. Patient consultation page with AI summary + prescription form

---

## 8. AI Use in the Product
AI is used for meaningful hospital workflow automation, not just chat.

### AI Responsibilities
- understand patient symptoms from text or voice
- create a clean structured summary
- map the complaint to the most relevant specialty
- assist in reducing manual routing effort

### Example
Patient says:
"I have stomach pain, vomiting, and burning sensation after food."

AI output:
- summary: stomach pain with vomiting and gastric discomfort
- recommended specialty: Gastroenterology
- urgency: medium
- reason: symptoms indicate digestive tract related issue

---

## 9. Example Use Case
A patient visits a hospital website and says:
"I have knee pain for 5 days and it gets worse while walking."

The system:
- collects basic patient details
- creates a patient ID
- analyzes symptoms using AI
- recommends Orthopedics
- shows available orthopedic doctors
- patient selects a slot
- booking ID is generated
- doctor sees the patient summary before consultation
- doctor writes diagnosis and prescription digitally
- next time, patient history can be reused

---

## 10. Why This Matters
This solves a real first-order hospital problem:
- patients are confused about whom to consult
- registration involves repetitive manual paperwork
- doctors lose time collecting the same basic information
- front-desk teams are overloaded
- consultation records are often not reusable

The system improves:
- patient experience
- hospital workflow efficiency
- consultation readiness
- continuity for future visits
- scalability for multi-doctor hospitals

---

## 11. Scalability Vision
The MVP will show one hospital workflow, but the product is designed to scale.

### Future Scale
- multiple hospitals
- multiple branches
- many specialties
- multilingual intake
- digital patient records
- analytics dashboard for hospital admin
- prescription and follow-up workflow
- integration with hospital management systems

This is not just a single booking form. It is the foundation for a scalable hospital workflow platform.

---

## 12. Tech Direction
Frontend:
- React
- TypeScript
- Tailwind CSS

Backend / Database:
- Supabase

AI:
- OpenAI API for symptom analysis and specialty recommendation

---

## 13. Hackathon Scope Boundaries

### We Will Build
- one hospital demo
- around 10 doctors across specialties
- mock slot data
- booking flow
- doctor-side queue and patient detail view
- AI-based routing
- simple digital prescription saving

### We Will Not Build
- full authentication system
- payment gateway
- full EMR / EHR
- advanced prescription intelligence
- full admin panel
- production-grade hospital integration

---

## 14. Demo Flow
1. Open hospital platform
2. Enter patient details
3. Speak or type symptoms
4. AI recommends correct specialty
5. Show doctors and slots
6. Select doctor and slot
7. Generate booking confirmation
8. Open doctor dashboard
9. Show booked patient with AI summary
10. Doctor writes prescription / consultation note
11. Save visit record for future use

---

## 15. Winning Pitch in One Line
We built an AI-powered hospital intake, booking, and consultation workflow that reduces paperwork, helps patients find the right specialist, and gives doctors a digital patient summary and consultation record.