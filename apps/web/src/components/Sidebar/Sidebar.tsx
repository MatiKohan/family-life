import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FamilySwitcher } from './FamilySwitcher';
import { useFamily } from '../../hooks/useFamily';
import { usePages } from '../../hooks/usePages';
import { CreatePageModal } from '../CreatePageModal/CreatePageModal';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { PageSummary } from '../../types/page';
import { apiRequest } from '../../lib/api-client';

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

function GripIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="3" r="1.2" />
      <circle cx="7" cy="3" r="1.2" />
      <circle cx="3" cy="8" r="1.2" />
      <circle cx="7" cy="8" r="1.2" />
      <circle cx="3" cy="13" r="1.2" />
      <circle cx="7" cy="13" r="1.2" />
    </svg>
  );
}

interface SortablePageItemProps {
  page: PageSummary;
  familyId: string;
  isActive: boolean;
  onClose?: () => void;
}

function SortablePageItem({ page, familyId, isActive, onClose }: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="group/page flex items-center gap-1">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 text-gray-300 opacity-0 group-hover/page:opacity-100 touch-none cursor-grab active:cursor-grabbing p-1 rounded hover:text-gray-500 transition-opacity"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <GripIcon />
      </button>

      <NavLink
        to={`/family/${familyId}/pages/${page.id}`}
        onClick={() => onClose?.()}
        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors min-w-0 ${
          isActive
            ? 'bg-brand-50 text-brand-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <span className="leading-none shrink-0">{page.emoji}</span>
        <span className="truncate">{page.title}</span>
      </NavLink>
    </li>
  );
}

export function Sidebar({ familyId, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { data: family } = useFamily(familyId);
  const { data: pages, isLoading: pagesLoading } = usePages(familyId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams<{ pageId?: string }>();
  const activePageId = params.pageId;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [localPages, setLocalPages] = useState<PageSummary[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Sync local pages from query data when not dragging
  useEffect(() => {
    if (!isDragging && pages) setLocalPages(pages);
  }, [pages, isDragging]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const reorderMutation = useMutation({
    mutationFn: (pageIds: string[]) =>
      apiRequest(`/families/${familyId}/pages/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ pageIds }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['pages', familyId] }),
  });

  function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalPages((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reorderMutation.mutate(reordered.map((p) => p.id));
      return reordered;
    });
  }

  function handlePageCreated(page: PageSummary) {
    setShowCreateModal(false);
    navigate(`/family/${familyId}/pages/${page.id}`);
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
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{t('pages.pages')}</p>

        {pagesLoading ? (
          <div className="space-y-2" aria-label="Loading pages">
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ) : localPages.length > 0 ? (
          <nav aria-label="Pages">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setIsDragging(false)}
            >
              <SortableContext items={localPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-0.5">
                  {localPages.map((page) => (
                    <SortablePageItem
                      key={page.id}
                      page={page}
                      familyId={familyId}
                      isActive={activePageId === page.id}
                      onClose={onClose}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </nav>
        ) : null}
      </div>

      {/* Bottom nav */}
      <div className="p-4 border-t border-gray-100 space-y-1">
        <NavLink
          to={`/family/${familyId}/calendar`}
          onClick={() => onClose?.()}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          <CalendarIcon />
          {t('pages.calendar')}
        </NavLink>

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

interface SidebarWithDrawerProps {
  familyId: string;
}

export function SidebarWithDrawer({ familyId }: SidebarWithDrawerProps) {
  return (
    /* Desktop only — mobile uses the BottomNav instead */
    <div className="hidden md:block h-full">
      <Sidebar familyId={familyId} />
    </div>
  );
}
