# TASK_PLAN.md

## Progress Checklist

This plan is split into two halves so the MVP stays controlled. Build only the active milestone unless the next instruction explicitly moves forward.

---

## Half 1: Core Patient Booking Flow

### Phase 1: Project Foundation

#### 1.1 App setup
- [x] Create React + TypeScript project structure.
- [x] Add Vite configuration.
- [x] Add Tailwind CSS configuration.
- [x] Add base global styles.
- [x] Add npm scripts for local development and build verification.

#### 1.2 Route setup
- [x] Install and configure React Router DOM.
- [x] Create route map for all required MVP screens.
- [x] Add a shared app shell for consistent page layout.
- [x] Verify each required route renders a placeholder page.

#### 1.3 Placeholder screens
- [x] Create `/` landing page placeholder.
- [x] Create `/register` patient registration placeholder.
- [x] Create `/recommendation` AI recommendation placeholder.
- [x] Create `/booking` doctor and slot selection placeholder.
- [x] Create `/confirmation` booking confirmation placeholder.
- [x] Create `/doctor-dashboard` doctor queue placeholder.
- [x] Create `/consultation/:bookingId` consultation placeholder.

#### 1.4 Shared structure
- [x] Create folders for app routes, pages, shared components, services, lib helpers, and types.
- [x] Add TypeScript types for the main database entities.
- [x] Add Supabase client setup placeholder.
- [x] Add OpenAI service placeholder for later milestone.

#### 1.5 Verification
- [x] Run dependency install.
- [x] Run production build.
- [x] Confirm Milestone 1 app shell compiles.

### Phase 2: Patient Registration And AI Intake

#### 2.1 Registration form
- [x] Build patient detail fields.
- [x] Build symptom text area.
- [x] Add simple browser voice input option.
- [x] Add visible validation errors.

#### 2.2 AI intake
- [x] Send symptom input to OpenAI.
- [x] Restrict output to known specialties.
- [x] Store patient in Supabase.
- [x] Store AI intake report in Supabase.
- [ ] Navigate to recommendation result.

### Phase 3: Recommendation And Doctor Selection

#### 3.1 Recommendation page
- [ ] Show symptom summary.
- [ ] Show recommended specialty.
- [ ] Show urgency badge.
- [ ] Show AI reasoning.

#### 3.2 Booking preparation
- [ ] Fetch doctors by recommended specialty.
- [ ] Fetch available slots for selected doctor.
- [ ] Handle empty doctor or slot states.

### Phase 4: Booking Confirmation

#### 4.1 Booking flow
- [ ] Generate booking code.
- [ ] Generate token number.
- [ ] Insert booking record.
- [ ] Mark selected slot as booked.

#### 4.2 Confirmation screen
- [ ] Show patient code.
- [ ] Show booking code.
- [ ] Show token number.
- [ ] Show doctor, specialty, and slot details.

---

## Half 2: Doctor Consultation Flow

### Phase 5: Doctor Queue Dashboard
- [ ] Fetch today's confirmed bookings.
- [ ] Show token number.
- [ ] Show patient name and patient code.
- [ ] Show booking code.
- [ ] Show urgency.
- [ ] Show consultation status.
- [ ] Link each queue item to consultation page.

### Phase 6: Consultation Page
- [ ] Fetch booking detail with patient and AI report.
- [ ] Show patient registration details.
- [ ] Show original symptoms and AI summary.
- [ ] Add diagnosis input.
- [ ] Add prescription input.
- [ ] Add notes input.
- [ ] Add follow-up advice input.

### Phase 7: Save Consultation
- [ ] Insert prescription record.
- [ ] Update consultation status to completed.
- [ ] Update booking status to completed.
- [ ] Show saved confirmation.

### Phase 8: Demo Readiness
- [ ] Add Supabase seed SQL for specialties, doctors, and slots.
- [ ] Verify full patient-to-doctor flow.
- [ ] Polish spacing and copy for demo clarity.
- [ ] Add final setup notes.
