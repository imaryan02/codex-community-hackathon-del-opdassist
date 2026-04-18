import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/shared/AppShell";
import { RequireSession } from "../components/shared/RequireSession";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { AdminApprovalsPage } from "../pages/AdminApprovalsPage";
import { AdminManagementPage } from "../pages/AdminManagementPage";
import { BookingPage } from "../pages/BookingPage";
import { ConfirmationPage } from "../pages/ConfirmationPage";
import { ConsultationPage } from "../pages/ConsultationPage";
import { DoctorDashboardPage } from "../pages/DoctorDashboardPage";
import { DoctorsDirectoryPage } from "../pages/DoctorsDirectoryPage";
import { LandingPage } from "../pages/LandingPage";
import { PatientDashboardPage } from "../pages/PatientDashboardPage";
import { RecommendationPage } from "../pages/RecommendationPage";
import { RegisterPage } from "../pages/RegisterPage";
import { VoiceRegisterPage } from "../pages/VoiceRegisterPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />
        <Route
          path="/register"
          element={
            <RequireSession allowedRoles={["patient"]}>
              <Navigate to="/register/manual" replace />
            </RequireSession>
          }
        />
        <Route
          path="/register/manual"
          element={
            <RequireSession allowedRoles={["patient"]}>
              <RegisterPage />
            </RequireSession>
          }
        />
        <Route
          path="/register/voice"
          element={
            <RequireSession allowedRoles={["patient"]}>
              <VoiceRegisterPage />
            </RequireSession>
          }
        />
        <Route
          path="/patient-dashboard"
          element={
            <RequireSession allowedRoles={["patient"]}>
              <PatientDashboardPage />
            </RequireSession>
          }
        />
        <Route
          path="/recommendation"
          element={
            <RequireSession allowedRoles={["patient"]}>
              <RecommendationPage />
            </RequireSession>
          }
        />
        <Route
          path="/booking"
          element={
            <RequireSession allowedRoles={["patient"]}>
              <BookingPage />
            </RequireSession>
          }
        />
        <Route
          path="/confirmation"
          element={
            <RequireSession allowedRoles={["patient"]}>
              <ConfirmationPage />
            </RequireSession>
          }
        />
        <Route
          path="/doctors"
          element={<DoctorsDirectoryPage />}
        />
        <Route
          path="/admin-dashboard"
          element={
            <RequireSession allowedRoles={["admin"]}>
              <AdminDashboardPage />
            </RequireSession>
          }
        />
        <Route
          path="/admin-approvals"
          element={
            <RequireSession allowedRoles={["admin"]}>
              <AdminApprovalsPage />
            </RequireSession>
          }
        />
        <Route
          path="/admin-management"
          element={
            <RequireSession allowedRoles={["admin"]}>
              <AdminManagementPage />
            </RequireSession>
          }
        />
        <Route
          path="/doctor-dashboard"
          element={
            <RequireSession allowedRoles={["doctor"]}>
              <DoctorDashboardPage />
            </RequireSession>
          }
        />
        <Route
          path="/consultation/:bookingId"
          element={
            <RequireSession allowedRoles={["doctor"]}>
              <ConsultationPage />
            </RequireSession>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
