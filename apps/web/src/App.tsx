import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { Layout } from './components/Layout/Layout';
import { LoginPage } from './pages/Login/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallback/AuthCallbackPage';
import { FamilyCreatePage } from './pages/FamilyCreate/FamilyCreatePage';
import { JoinFamilyPage } from './pages/JoinFamily/JoinFamilyPage';
import { FamilyHomePage } from './pages/FamilyHome/FamilyHomePage';

function HomeRedirect() {
  // Read persisted family-storage directly to avoid a Zustand import cycle
  // and to keep this component dependency-free.
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
  return <Navigate to="/family/create" replace />;
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
        {/* Family routes — no top Layout (FamilyHomePage has its own shell) */}
        <Route
          path="/family/create"
          element={
            <ErrorBoundary>
              <FamilyCreatePage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/family/:id"
          element={
            <ErrorBoundary>
              <FamilyHomePage />
            </ErrorBoundary>
          }
        />

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
