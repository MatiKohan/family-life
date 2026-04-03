import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { Layout } from './components/Layout/Layout';
import { FamilyShell } from './components/FamilyShell/FamilyShell';
import { LoginPage } from './pages/Login/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallback/AuthCallbackPage';
import { FamilyCreatePage } from './pages/FamilyCreate/FamilyCreatePage';
import { JoinFamilyPage } from './pages/JoinFamily/JoinFamilyPage';
import { FamilyHomePage } from './pages/FamilyHome/FamilyHomePage';
import { PageViewPage } from './pages/PageView/PageViewPage';
import { CalendarPage } from './pages/Calendar/CalendarPage';
import { FamilySettingsPage } from './pages/FamilySettings/FamilySettingsPage';
import { useMyFamilies } from './hooks/useMyFamilies';
import { useFamilyStore } from './store/family.store';

function HomeRedirect() {
  // Fast path: check localStorage first
  try {
    const raw = localStorage.getItem('family-storage');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { activeFamilyId?: string | null } };
      const id = parsed?.state?.activeFamilyId;
      if (id) return <Navigate to={`/family/${id}`} replace />;
    }
  } catch {
    // ignore parse errors
  }

  // Slow path: fetch families from API
  return <FamiliesRedirect />;
}

function FamiliesRedirect() {
  const { data: families, isLoading, isError } = useMyFamilies();
  const setActiveFamily = useFamilyStore((s) => s.setActiveFamily);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (isError) return; // don't redirect on network error — stay put
    if (families && families.length > 0) {
      setActiveFamily(families[0].id);
      navigate(`/family/${families[0].id}`, { replace: true });
    } else if (families) {
      navigate('/family/create', { replace: true });
    }
  }, [families, isLoading, isError, setActiveFamily, navigate]);

  return null;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Public join route — auth is optional (server handles the 401 case) */}
      <Route
        path="/join/:token"
        element={
          <ErrorBoundary>
            <JoinFamilyPage />
          </ErrorBoundary>
        }
      />

      <Route element={<ProtectedRoute />}>
        {/* Family create — no sidebar shell */}
        <Route
          path="/family/create"
          element={
            <ErrorBoundary>
              <FamilyCreatePage />
            </ErrorBoundary>
          }
        />

        {/* Family shell — provides sidebar for all family child routes */}
        <Route
          path="/family/:id"
          element={
            <ErrorBoundary>
              <FamilyShell />
            </ErrorBoundary>
          }
        >
          {/* index = /family/:id */}
          <Route index element={<FamilyHomePage />} />
          {/* page view = /family/:id/pages/:pageId */}
          <Route
            path="pages/:pageId"
            element={
              <ErrorBoundary>
                <PageViewPage />
              </ErrorBoundary>
            }
          />
          {/* calendar = /family/:id/calendar */}
          <Route
            path="calendar"
            element={
              <ErrorBoundary>
                <CalendarPage />
              </ErrorBoundary>
            }
          />
          {/* settings = /family/:id/settings */}
          <Route
            path="settings"
            element={
              <ErrorBoundary>
                <FamilySettingsPage />
              </ErrorBoundary>
            }
          />
        </Route>

        {/* Legacy Layout wrapper for any future simple pages */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomeRedirect />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
