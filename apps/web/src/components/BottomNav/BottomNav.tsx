import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CreatePageModal } from '../CreatePageModal/CreatePageModal';
import { PageSummary } from '../../types/page';

interface Props {
  familyId: string;
}

function PagesIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

const activeClass = 'text-brand-600';
const inactiveClass = 'text-gray-500';

export function BottomNav({ familyId }: Props) {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  function handlePageCreated(page: PageSummary) {
    setShowCreateModal(false);
    navigate(`/family/${familyId}/pages/${page.id}`);
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex items-stretch"
        aria-label="Bottom navigation"
      >
        {/* Pages tab */}
        <NavLink
          to={`/family/${familyId}`}
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
              isActive ? activeClass : inactiveClass
            }`
          }
        >
          <PagesIcon />
          <span>Pages</span>
        </NavLink>

        {/* Calendar tab */}
        <NavLink
          to={`/family/${familyId}/calendar`}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
              isActive ? activeClass : inactiveClass
            }`
          }
        >
          <CalendarIcon />
          <span>Calendar</span>
        </NavLink>

        {/* New Page tab */}
        <button
          onClick={() => setShowCreateModal(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${inactiveClass} hover:text-brand-600`}
          aria-label="New Page"
        >
          <PlusIcon />
          <span>New Page</span>
        </button>

        {/* Settings tab */}
        <NavLink
          to={`/family/${familyId}/settings`}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
              isActive ? activeClass : inactiveClass
            }`
          }
        >
          <SettingsIcon />
          <span>Settings</span>
        </NavLink>
      </nav>

      {showCreateModal && (
        <CreatePageModal
          familyId={familyId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePageCreated}
        />
      )}
    </>
  );
}
