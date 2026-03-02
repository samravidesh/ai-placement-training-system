import { Navigate, Route, Routes } from 'react-router-dom';
import TopNav from './components/TopNav';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import JobRecommendationsPage from './pages/JobRecommendationsPage';
import TrainingPage from './pages/TrainingPage';
import AiAssistantChatPage from './pages/AiAssistantChatPage';
import AdminPanelPage from './pages/AdminPanelPage';

function App() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#1c355e,_#0f172a_35%,_#111827_80%)] text-slate-100">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/jobs" element={<JobRecommendationsPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/assistant" element={<AiAssistantChatPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPanelPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
