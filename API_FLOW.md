# API_FLOW.md

## Purpose
This document defines the frontend-to-backend flow for the hackathon MVP.

It explains:
- what each screen does
- what Supabase data is read/written
- where OpenAI is used
- how booking and consultation flow works

This is not a production API contract.  
It is a practical implementation flow for building the MVP fast.

---

## 1. Main Product Flow

### End-to-End Journey
1. Patient opens hospital platform
2. Patient enters details and symptoms (text or voice)
3. OpenAI analyzes symptoms
4. System recommends specialty
5. Frontend fetches doctors for that specialty
6. Patient selects doctor
7. Frontend fetches available slots for that doctor
8. Patient books a slot
9. Booking confirmation is shown
10. Doctor dashboard shows today’s queue
11. Doctor opens patient record
12. Doctor writes prescription / notes
13. Consultation is saved for future reference

---

## 2. Frontend Screens and Their Data Flow

---

## Screen 1: Landing / Start Page

### Purpose
Simple entry point for patient.

### UI
- hospital branding
- start button
- optional “Doctor Dashboard” button for demo

### Data
- no backend call needed

---

## Screen 2: Patient Registration + Symptom Input

### Purpose
Collect patient details and symptoms.

### Inputs
- full_name
- age
- gender
- phone
- symptom_input
- input_mode (`text` or `voice`)

### Frontend Action
On submit:
- call AI analysis flow
- then save patient + AI report

### OpenAI Use
We send symptom input to OpenAI and expect a structured response.

### Expected AI Output Shape
```json
{
  "symptom_summary": "stomach pain with vomiting and gastric discomfort",
  "recommended_specialty": "Gastroenterology",
  "urgency_level": "medium",
  "reasoning": "Symptoms suggest digestive system related issue"
}





Suggested Frontend Function

handleAnalyzeAndRegisterPatient(formData)

Backend / Data Flow

Step 1:

send symptom_input to OpenAI

Step 2:

insert into patients

Step 3:

find specialty row using recommended_specialty

Step 4:

insert into ai_intake_reports
Tables Written
patients
ai_intake_reports
Output to Frontend

Return:

patient_id
patient_code
ai_report_id
recommended_specialty_id
recommended_specialty_name
urgency_level
symptom_summary
reasoning
Screen 3: AI Recommendation Page
Purpose

Show patient what AI understood and which specialty is recommended.

UI
symptom summary
recommended specialty
urgency badge
reasoning
continue button
Data Needed

Comes from previous step response.

Backend Call

On continue:

fetch doctors for recommended_specialty_id
Tables Read
doctors
Query Logic

Get all doctors where:

specialty_id = recommended_specialty_id
available_today = true
Output to Frontend

List of doctors:

[
  {
    "id": "doctor-1",
    "full_name": "Dr. Amit Kumar",
    "qualification": "MBBS, MD",
    "experience_years": 12,
    "specialty_name": "Gastroenterology"
  }
]
Screen 4: Doctor Selection + Slot Selection
Purpose

Let patient choose a doctor and an available time slot.

UI
doctor cards
available slots under selected doctor
Backend Calls
Call 1: Fetch doctors by specialty

Input:

specialty_id

Read from:

doctors
Call 2: Fetch slots for selected doctor

Input:

doctor_id

Read from:

doctor_slots
Slot Query Logic

Show only:

today’s slots
is_booked = false
Output to Frontend
[
  {
    "id": "slot-1",
    "slot_date": "2026-04-18",
    "start_time": "10:00:00",
    "end_time": "10:30:00"
  }
]
Screen 5: Booking Confirmation Flow
Purpose

Create final appointment booking.

Input
patient_id
doctor_id
slot_id
ai_report_id
Frontend Action

When patient clicks confirm:

generate booking_code
generate token_number
create booking
update slot to booked
Tables Written
bookings
doctor_slots
Booking Insert Shape
{
  "booking_code": "BKG-3001",
  "patient_id": "patient-1",
  "doctor_id": "doctor-1",
  "slot_id": "slot-1",
  "ai_report_id": "report-1",
  "booking_status": "confirmed",
  "consultation_status": "waiting",
  "token_number": 12
}
Slot Update

For selected slot:

set is_booked = true
Output to Frontend

Return booking confirmation details:

booking_code
token_number
patient_code
doctor_name
specialty_name
date/time
Screen 6: Booking Success Page
Purpose

Show appointment confirmation to patient.

UI

Show:

patient code
booking code
token number
doctor name
specialty
slot time
hospital name
Data

Comes from booking response.

Backend

No new write needed here.

Screen 7: Doctor Dashboard / Today’s Queue
Purpose

Doctor sees today’s booked patients in order.

UI

Queue list with:

token number
patient name
patient code
booking code
slot time
urgency level
consultation status
open button
Backend Read

Fetch bookings joined with:

patients
ai_intake_reports
doctors
doctor_slots
specialties
Ideal Query Result
[
  {
    "booking_id": "booking-1",
    "booking_code": "BKG-3001",
    "token_number": 12,
    "consultation_status": "waiting",
    "patient_name": "Rahul Kumar",
    "patient_code": "PAT-1001",
    "symptom_summary": "stomach pain with vomiting",
    "urgency_level": "medium",
    "slot_time": "10:00 AM",
    "doctor_name": "Dr. Amit Kumar"
  }
]
Sorting

Sort by:

token_number ascending
or
slot start time ascending
Screen 8: Doctor Consultation Page
Purpose

Doctor views patient details and writes prescription digitally.

UI

Show:

patient name
patient code
booking code
age / gender / phone
original symptom input
AI summary
urgency level
recommended specialty
diagnosis input
prescription input
notes input
follow-up advice input
save button
mark consultation complete button
Backend Read

Read selected booking with joins:

bookings
patients
ai_intake_reports
doctors
doctor_slots
specialties
Backend Write

On save:

insert into prescriptions

Optional after save:

update bookings.consultation_status = completed
update bookings.booking_status = completed
Tables Written
prescriptions
bookings (status update)
Prescription Insert Shape
{
  "patient_id": "patient-1",
  "booking_id": "booking-1",
  "doctor_id": "doctor-1",
  "diagnosis": "Acute gastritis",
  "prescription_text": "Pantoprazole once daily for 5 days",
  "notes": "Avoid spicy food",
  "follow_up_advice": "Follow up after 1 week if symptoms persist"
}
3. Logical Backend Functions

These do not have to be separate server APIs if Supabase is called directly from frontend.
But logically, the app needs these operations.

1. Analyze symptoms with OpenAI

Input

symptom_input

Output

symptom_summary
recommended_specialty
urgency_level
reasoning
2. Create patient

Input

full_name
age
gender
phone
symptom_input
input_mode

Output

patient_id
patient_code
3. Create AI intake report

Input

patient_id
symptom_summary
recommended_specialty_id
urgency_level
reasoning
raw_input

Output

ai_report_id
4. Get doctors by specialty

Input

specialty_id

Output

doctor list
5. Get slots by doctor

Input

doctor_id

Output

available slots
6. Create booking

Input

patient_id
doctor_id
slot_id
ai_report_id
booking_code
token_number

Output

booking confirmation object
7. Get doctor queue

Input

doctor_id

Output

today’s patient queue
8. Get booking detail for consultation

Input

booking_id

Output

patient + AI summary + slot + booking data
9. Save prescription

Input

booking_id
patient_id
doctor_id
diagnosis
prescription_text
notes
follow_up_advice

Output

saved prescription row
4. OpenAI Integration Flow
Where AI is used

Only in patient intake analysis.

AI Input

Patient symptom description, for example:

"I have severe stomach pain and vomiting after meals."

AI Output

Must be clean and structured:

symptom summary
recommended specialty
urgency level
reasoning
Recommended Prompt Behavior

Prompt should clearly instruct model:

do not diagnose definitively
only suggest specialty routing
keep summary short
return structured JSON
Good Specialties List for Prompt

Restrict model to known specialties only:

General Medicine
Gastroenterology
Gynecology
Orthopedics
Dermatology
ENT
Pediatrics
Cardiology
Neurology
Pulmonology

This makes output more stable.

5. ID / Code Generation Rules
Patient Code

Readable code shown in UI.

Format example:

PAT-1001
PAT-1002
Booking Code

Readable appointment reference.

Format example:

BKG-3001
BKG-3002
Token Number

Simple number for doctor queue.

Format:

1, 2, 3, 4...

For hackathon, these can be generated in frontend or a helper util.

6. Recommended Supabase Query Strategy
Reads

Use joined reads where possible for doctor dashboard and consultation page.

Writes

Do sequential writes:

create patient
create ai report
create booking
update slot booked
save prescription

This is easy to implement fast.

7. MVP Simplifications

To move fast, we should simplify:

Keep
one hospital
hardcoded / seeded doctors
seeded slots
one patient flow
one doctor dashboard
one prescription form
Simplify
no auth
no role system
no file upload
no real voice transcription backend if time is short
no advanced scheduling logic
no multi-hospital logic in code yet
8. Demo Script Mapping
Demo Start
Open landing page
click start
Patient Flow
enter patient details
type symptoms
show AI analysis
show recommended doctors
select doctor and slot
confirm booking
show patient code + booking code
Doctor Flow
open doctor dashboard
show today’s queue
open booked patient
show AI summary
add diagnosis + prescription
save consultation

This creates a full hospital workflow story.

9. Future Expandability

This same flow can later support:

repeat visits using patient_code
patient history
multiple hospitals
digital prescriptions archive
analytics
multilingual voice intake
front-desk assistant mode
hospital admin dashboards

So the MVP is small, but the architecture direction is scalable.