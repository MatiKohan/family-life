import { NavLink } from 'react-router-dom';
import { FamilySwitcher } from './FamilySwitcher';
import { useFamily } from '../../hooks/useFamily';

interface SidebarProps {
  familyId: string;
  open: boolean;
  onClose: () => void;
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function Sidebar({ familyId, open, onClose }: SidebarProps) {
  const { data: family } = useFamily(familyId);

  const sidebarContent = (
    <aside className="w-64 h-full flex flex-col bg-white border-r border-gray-200">
      {/* Family switcher */}
      <div className="p-4 border-b border-gray-100">
        {family ? (
          <FamilySwitcher currentFamily={family} />
        ) : (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        )}
      </div>

      {/* Pages section (placeholder for Phase 2) */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Pages</p>
        {/* Phase 2: page list goes here */}
      </div>

      {/* Bottom nav */}
      <div className="p-4 border-t border-gray-100 space-y-1">
        {/* Calendar — disabled, Phase 2 */}
        <span
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed select-none"
          aria-disabled="true"
        >
          <CalendarIcon />
          Calendar
        </span>

        <NavLink
          to={`/family/${familyId}/settings`}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          <SettingsIcon />
          Settings
        </NavLink>

        {/* New Page — disabled, Phase 2 */}
        <button
          disabled
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed"
        >
          + New Page
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden md:block h-full">{sidebarContent}</div>

      {/* Mobile: drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            aria-hidden="true"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative z-50 flex-shrink-0">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
