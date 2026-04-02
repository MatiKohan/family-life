import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { apiRequest } from '../../lib/api-client';

function HamburgerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function Layout() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => null);
    clearSession();
    navigate('/login', { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-brand-600">
              Family Life
            </Link>

            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link to="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                {t('nav.home')}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                )}
                <span className="text-sm text-gray-600 hidden sm:block">{user.name}</span>
                <button
                  onClick={() => void handleLogout()}
                  className="text-sm text-gray-500 hover:text-gray-800 transition-colors hidden md:block"
                >
                  {t('auth.signOut')}
                </button>
              </>
            )}

            {/* Hamburger — visible on mobile only */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={menuOpen}
              className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-100">
            <nav className="flex flex-col gap-1 text-sm" aria-label="Mobile navigation">
              <Link
                to="/"
                onClick={closeMenu}
                className="px-2 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Home
              </Link>
              {user && (
                <button
                  onClick={() => {
                    closeMenu();
                    void handleLogout();
                  }}
                  className="px-2 py-2 text-left text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {t('auth.signOut')}
                </button>
              )}
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
