import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { Layout } from './components/Layout/Layout';
import { LoginPage } from './pages/Login/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallback/AuthCallbackPage';
import { HomePage } from './pages/Home/HomePage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <HomePage />
              </ErrorBoundary>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
