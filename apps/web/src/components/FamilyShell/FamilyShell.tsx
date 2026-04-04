import { Navigate, useParams, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useFamilyStore } from '../../store/family.store';
import { useFamily } from '../../hooks/useFamily';
import { SidebarWithDrawer } from '../Sidebar/Sidebar';
import { BottomNav } from '../BottomNav/BottomNav';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';

/**
 * FamilyShell provides the sidebar + mobile bottom nav layout for all family routes.
 * Child routes render inside the <main> area via <Outlet />.
 */
export function FamilyShell() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data: family, isLoading, isError } = useFamily(id);

  const clearActiveFamily = useFamilyStore((s) => s.clearActiveFamily);

  if (!id) return <Navigate to="/" replace />;
  if (isError) {
    clearActiveFamily();
    return <Navigate to="/family/create" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop only (hidden on mobile) */}
      <SidebarWithDrawer familyId={id} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top bar (mobile only) — shows family name + avatar, no hamburger */}
        <header className="md:hidden flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-gray-200 bg-white sticky top-0 z-30">
          {isLoading ? (
            <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
          ) : (
            <span className="text-sm font-semibold text-gray-900 truncate">
              {family?.emoji} {family?.name}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            {user?.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full"
              />
            )}
          </div>
        </header>

        {/* Outlet renders the active child route. pb-16 on mobile reserves space for the bottom nav. */}
        <div className="flex-1 overflow-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </div>
      </div>

      {/* Bottom navigation — mobile only */}
      <BottomNav familyId={id} />
    </div>
  );
}
