import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useRestoreSession } from '../../hooks/useRestoreSession';
import { useSyncLocale } from '../../hooks/useSyncLocale';

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const { restoring } = useRestoreSession();
  useSyncLocale();

  if (restoring) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
