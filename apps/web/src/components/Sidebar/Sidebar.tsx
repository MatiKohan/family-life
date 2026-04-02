import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FamilySwitcher } from './FamilySwitcher';
import { useFamily } from '../../hooks/useFamily';
import { usePages } from '../../hooks/usePages';
import { CreatePageModal } from '../CreatePageModal/CreatePageModal';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { PageSummary } from '../../types/page';

interface SidebarProps {
  familyId: string;
  onClose?: () => void;
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

// Sidebar is also rendered standalone so we need params optionally
function useActivePageId() {
  try {
    const params = useParams<{ pageId?: string }>();
    return params.pageId;
  } catch {
    return undefined;
  }
}

export function Sidebar({ familyId, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { data: family } = useFamily(familyId);
  const { data: pages, isLoading: pagesLoading } = usePages(familyId);
  const navigate = useNavigate();
  const params = useParams<{ pageId?: string }>();
  const activePageId = params.pageId;
  const [showCreateModal, setShowCreateModal] = useState(false);

  function handlePageCreated(page: PageSummary) {
    setShowCreateModal(false);
    navigate(`/family/${familyId}/pages/${page._id}`);
    onClose?.();
  }

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

      {/* Pages section */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Pages</p>

        {pagesLoading ? (
          // Loading skeleton
          <div className="space-y-2" aria-label="Loading pages">
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ) : pages && pages.length > 0 ? (
          <nav aria-label="Pages">
            <ul className="space-y-0.5">
              {pages.map((page) => (
                <li key={page._id}>
                  <NavLink
                    to={`/family/${familyId}/pages/${page._id}`}
                    onClick={() => onClose?.()}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full ${
                      activePageId === page._id
                        ? 'bg-brand-50 text-brand-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="leading-none shrink-0">{page.emoji}</span>
                    <span className="truncate">{page.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      {/* Bottom nav */}
      <div className="p-4 border-t border-gray-100 space-y-1">
        {/* Calendar — disabled */}
        <span
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed select-none"
          aria-disabled="true"
        >
          <CalendarIcon />
          {t('pages.calendar')}
        </span>

        <NavLink
          to={`/family/${familyId}/settings`}
          onClick={() => onClose?.()}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          <SettingsIcon />
          {t('family.settings')}
        </NavLink>

        {/* New Page */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors font-medium"
        >
          + {t('pages.newPage')}
        </button>
      </div>

      {/* Language switcher */}
      <div className="px-3 py-4 border-t border-gray-100">
        <LanguageSwitcher />
      </div>
    </aside>
  );

  return (
    <>
      {sidebarContent}

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

// Keep legacy open/onClose interface for FamilyHomePage compatibility
interface SidebarWithDrawerProps extends SidebarProps {
  open: boolean;
}

export function SidebarWithDrawer({ familyId, open, onClose }: SidebarWithDrawerProps) {
  return (
    <>
      {/* Desktop: static sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar familyId={familyId} onClose={onClose} />
      </div>

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
          <div className="relative z-50 flex-shrink-0">
            <Sidebar familyId={familyId} onClose={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
