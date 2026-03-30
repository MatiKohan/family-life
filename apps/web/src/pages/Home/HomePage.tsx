import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { apiRequest } from '../../lib/api-client';

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => null);
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Welcome to Template Repository
      </h1>
      {user && (
        <p className="text-gray-500 mb-8">
          Hello, {user.name}!
        </p>
      )}
      <p className="text-gray-400 text-sm mb-8 max-w-md">
        This is a placeholder home page. Start building your features here.
      </p>
      <button
        onClick={() => void handleLogout()}
        className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
