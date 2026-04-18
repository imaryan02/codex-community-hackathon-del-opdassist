import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/shared/AppShell";
import { BookingPage } from "../pages/BookingPage";
import { ConfirmationPage } from "../pages/ConfirmationPage";
import { ConsultationPage } from "../pages/ConsultationPage";
import { DoctorDashboardPage } from "../pages/DoctorDashboardPage";
import { DoctorsDirectoryPage } from "../pages/DoctorsDirectoryPage";
import { LandingPage } from "../pages/LandingPage";
import { RecommendationPage } from "../pages/RecommendationPage";
import { RegisterPage } from "../pages/RegisterPage";
import { VoiceRegisterPage } from "../pages/VoiceRegisterPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Navigate to="/register/manual" replace />} />
        <Route path="/register/manual" element={<RegisterPage />} />
        <Route path="/register/voice" element={<VoiceRegisterPage />} />
        <Route path="/recommendation" element={<RecommendationPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="/doctors" element={<DoctorsDirectoryPage />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboardPage />} />
        <Route path="/consultation/:bookingId" element={<ConsultationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
