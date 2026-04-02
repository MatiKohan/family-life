import { useState } from 'react';
import { Navigate, useParams, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useFamilyStore } from '../../store/family.store';
import { useFamily } from '../../hooks/useFamily';
import { SidebarWithDrawer } from '../Sidebar/Sidebar';

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

/**
 * FamilyShell provides the sidebar + mobile header layout for all family routes.
 * Child routes render inside the <main> area via <Outlet />.
 */
export function FamilyShell() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: family, isLoading, isError } = useFamily(id);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const clearActiveFamily = useFamilyStore((s) => s.clearActiveFamily);

  if (!id) return <Navigate to="/" replace />;
  if (isError) {
    clearActiveFamily();
    return <Navigate to="/family/create" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <SidebarWithDrawer
        familyId={id}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top bar (mobile only) */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <HamburgerIcon />
          </button>
          {isLoading ? (
            <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
          ) : (
            <span className="text-sm font-semibold text-gray-900 truncate">
              {family?.emoji} {family?.name}
            </span>
          )}
          {user?.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-7 h-7 rounded-full ml-auto"
            />
          )}
        </header>

        {/* Outlet renders the active child route */}
        <Outlet />
      </div>
    </div>
  );
}
