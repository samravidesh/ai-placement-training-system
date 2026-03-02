import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-200">
        Validating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isOnboardingRoute = location.pathname === '/onboarding';
  const isProfileRoute = location.pathname === '/profile';
  const isOnboardingCompleted = Boolean(user?.onboarding_completed);

  if (!isOnboardingCompleted && !isOnboardingRoute && !isProfileRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isOnboardingCompleted && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
