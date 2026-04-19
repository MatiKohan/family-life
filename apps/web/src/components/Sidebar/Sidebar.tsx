import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
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
import { useFolders } from '../../hooks/useFolders';
import { CreatePageModal } from '../CreatePageModal/CreatePageModal';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import { PageSummary, FolderSummary } from '../../types/page';
import { apiRequest } from '../../lib/api-client';
import { useFamilyStore } from '../../store/family.store';

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

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform ${collapsed ? '-rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

interface SortablePageItemProps {
  page: PageSummary;
  familyId: string;
  isActive: boolean;
  onClose?: () => void;
  onDelete: () => void;
  indented?: boolean;
  folderId?: string | null;
}

function SortablePageItem({ page, familyId, isActive, onClose, onDelete, indented = false, folderId = null }: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, data: { type: 'page', folderId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className={`group/page flex items-center gap-1 ${indented ? 'pl-3' : ''}`}>
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

      {/* Delete page button */}
      <button
        onClick={onDelete}
        className="shrink-0 text-gray-300 opacity-0 group-hover/page:opacity-100 p-1 rounded hover:text-red-500 transition-opacity"
        aria-label="Delete page"
        tabIndex={-1}
      >
        <TrashIcon />
      </button>
    </li>
  );
}

interface FolderItemProps {
  folder: FolderSummary;
  familyId: string;
  activePageId: string | undefined;
  onClose?: () => void;
  onDeletePage: (pageId: string, title: string) => void;
  onDeleteFolder: (folder: FolderSummary) => void;
  onRenameFolder: (folder: FolderSummary, newName: string) => void;
  isOver: boolean;
}

function FolderItem({
  folder,
  familyId,
  activePageId,
  onClose,
  onDeletePage,
  onDeleteFolder,
  onRenameFolder,
  isOver,
}: FolderItemProps) {
  const { collapsedFolderIds, toggleFolder } = useFamilyStore();
  const isCollapsed = collapsedFolderIds.includes(folder.id);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id, data: { type: 'folder' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  function handleRenameCommit() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      onRenameFolder(folder, trimmed);
    }
    setIsRenaming(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleRenameCommit();
    if (e.key === 'Escape') {
      setRenameValue(folder.name);
      setIsRenaming(false);
    }
  }

  return (
    <li ref={setNodeRef} style={style} className="group/folder">
      {/* Folder header */}
      <div
        className={`flex items-center gap-1 rounded-lg transition-colors ${
          isOver ? 'ring-2 ring-brand-400 bg-brand-50' : 'hover:bg-gray-50'
        }`}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 text-gray-300 opacity-0 group-hover/folder:opacity-100 touch-none cursor-grab active:cursor-grabbing p-1 rounded hover:text-gray-500 transition-opacity"
          aria-label="Drag folder to reorder"
          tabIndex={-1}
        >
          <GripIcon />
        </button>

        {/* Collapse toggle + folder info */}
        <button
          className="flex-1 flex items-center gap-2 px-2 py-2 text-sm text-gray-700 min-w-0"
          onClick={() => toggleFolder(folder.id)}
          aria-expanded={!isCollapsed}
        >
          <span className="leading-none shrink-0">{folder.emoji}</span>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameCommit}
              onKeyDown={handleRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white border border-brand-300 rounded px-1 py-0.5 text-sm outline-none min-w-0"
            />
          ) : (
            <span
              className="truncate font-medium flex-1 text-left"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setRenameValue(folder.name);
              }}
            >
              {folder.name}
            </span>
          )}
          <ChevronIcon collapsed={isCollapsed} />
        </button>

        {/* Delete folder button */}
        <button
          onClick={() => onDeleteFolder(folder)}
          className="shrink-0 text-gray-300 opacity-0 group-hover/folder:opacity-100 p-1 rounded hover:text-red-500 transition-opacity"
          aria-label="Delete folder"
          tabIndex={-1}
        >
          <TrashIcon />
        </button>
      </div>

      {/* Folder pages (expanded) */}
      {!isCollapsed && (
        <SortableContext items={folder.pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5 mt-0.5">
            {folder.pages.map((page) => (
              <SortablePageItem
                key={page.id}
                page={page}
                familyId={familyId}
                isActive={activePageId === page.id}
                onClose={onClose}
                onDelete={() => onDeletePage(page.id, page.title)}
                indented
                folderId={folder.id}
              />
            ))}
          </ul>
        </SortableContext>
      )}
    </li>
  );
}

export function Sidebar({ familyId, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { data: family } = useFamily(familyId);
  const { data: pages, isLoading: pagesLoading } = usePages(familyId);
  const { data: folders } = useFolders(familyId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams<{ pageId?: string }>();
  const activePageId = params.pageId;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [localPages, setLocalPages] = useState<PageSummary[]>([]);
  const [localFolders, setLocalFolders] = useState<FolderSummary[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Sync local state from server when not dragging
  useEffect(() => {
    if (!isDragging && pages) setLocalPages(pages);
  }, [pages, isDragging]);

  useEffect(() => {
    if (!isDragging && folders) setLocalFolders(folders);
  }, [folders, isDragging]);

  useEffect(() => {
    if (showNewFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [showNewFolder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  // --- Mutations ---

  const reorderPagesMutation = useMutation({
    mutationFn: (pageIds: string[]) =>
      apiRequest(`/families/${familyId}/pages/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ pageIds }),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', familyId] });
      queryClient.invalidateQueries({ queryKey: ['folders', familyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (pageId: string) =>
      apiRequest(`/families/${familyId}/pages/${pageId}`, { method: 'DELETE' }),
    onSuccess: (_data, pageId) => {
      queryClient.invalidateQueries({ queryKey: ['pages', familyId] });
      queryClient.invalidateQueries({ queryKey: ['folders', familyId] });
      if (activePageId === pageId) navigate(`/family/${familyId}`);
    },
  });

  const movePageToFolderMutation = useMutation({
    mutationFn: ({ pageId, folderId }: { pageId: string; folderId: string | null }) =>
      apiRequest(`/families/${familyId}/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ folderId }),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', familyId] });
      queryClient.invalidateQueries({ queryKey: ['folders', familyId] });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; emoji?: string }) =>
      apiRequest<FolderSummary>(`/families/${familyId}/folders`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', familyId] });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ folderId, data }: { folderId: string; data: { name?: string; emoji?: string } }) =>
      apiRequest<FolderSummary>(`/families/${familyId}/folders/${folderId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', familyId] });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) =>
      apiRequest(`/families/${familyId}/folders/${folderId}`, { method: 'DELETE' }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', familyId] });
      queryClient.invalidateQueries({ queryKey: ['folders', familyId] });
    },
  });

  const reorderFoldersMutation = useMutation({
    mutationFn: (folderIds: string[]) =>
      apiRequest(`/families/${familyId}/folders/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ folderIds }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['folders', familyId] }),
  });

  // --- Event handlers ---

  function handleDeletePage(pageId: string, pageTitle: string) {
    if (!window.confirm(`Delete "${pageTitle}"?`)) return;
    deleteMutation.mutate(pageId);
  }

  function handleDeleteFolder(folder: FolderSummary) {
    if (!window.confirm(`${t('pages.deleteFolder')} "${folder.name}"?`)) return;
    deleteFolderMutation.mutate(folder.id);
  }

  function handleRenameFolder(folder: FolderSummary, newName: string) {
    updateFolderMutation.mutate({ folderId: folder.id, data: { name: newName } });
  }

  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setShowNewFolder(false);
      setNewFolderName('');
      return;
    }
    createFolderMutation.mutate({ name, emoji: '📁' });
    setShowNewFolder(false);
    setNewFolderName('');
  }

  function handleNewFolderKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleCreateFolder();
    if (e.key === 'Escape') {
      setShowNewFolder(false);
      setNewFolderName('');
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverFolderId(null);
      return;
    }
    const overData = over.data.current as { type?: string } | undefined;
    if (overData?.type === 'folder') {
      setOverFolderId(over.id as string);
    } else {
      setOverFolderId(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false);
    setOverFolderId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current as { type?: string; folderId?: string | null } | undefined;
    const overData = over.data.current as { type?: string; folderId?: string | null } | undefined;

    if (activeData?.type === 'folder') {
      // Reorder folders
      setLocalFolders((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const reordered = arrayMove(prev, oldIndex, newIndex);
        reorderFoldersMutation.mutate(reordered.map((f) => f.id));
        return reordered;
      });
      return;
    }

    if (activeData?.type === 'page') {
      // Dropping page onto a folder header => move to that folder
      if (overData?.type === 'folder') {
        const targetFolderId = over.id as string;
        movePageToFolderMutation.mutate({ pageId: active.id as string, folderId: targetFolderId });
        return;
      }

      // Dropping page onto another page
      if (overData?.type === 'page') {
        const activeFolderId = activeData.folderId ?? null;
        const overFolderIdVal = overData.folderId ?? null;

        if (activeFolderId === overFolderIdVal) {
          // Same context — reorder
          if (activeFolderId === null) {
            // Root pages reorder
            setLocalPages((prev) => {
              const oldIndex = prev.findIndex((p) => p.id === active.id);
              const newIndex = prev.findIndex((p) => p.id === over.id);
              if (oldIndex === -1 || newIndex === -1) return prev;
              const reordered = arrayMove(prev, oldIndex, newIndex);
              reorderPagesMutation.mutate(reordered.map((p) => p.id));
              return reordered;
            });
          } else {
            // Pages within same folder — reorder
            setLocalFolders((prev) =>
              prev.map((f) => {
                if (f.id !== activeFolderId) return f;
                const oldIndex = f.pages.findIndex((p) => p.id === active.id);
                const newIndex = f.pages.findIndex((p) => p.id === over.id);
                if (oldIndex === -1 || newIndex === -1) return f;
                const reordered = arrayMove(f.pages, oldIndex, newIndex);
                reorderPagesMutation.mutate(reordered.map((p) => p.id));
                return { ...f, pages: reordered };
              }),
            );
          }
        } else {
          // Different folder/root context — move page
          movePageToFolderMutation.mutate({ pageId: active.id as string, folderId: overFolderIdVal });
        }
      }
    }
  }

  function handlePageCreated(page: PageSummary) {
    setShowCreateModal(false);
    navigate(`/family/${familyId}/pages/${page.id}`);
    onClose?.();
  }

  // Root pages = pages with no folderId
  const rootPages = localPages.filter((p) => !p.folderId);

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
        {/* Section header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{t('pages.pages')}</p>
          <button
            onClick={() => {
              setShowNewFolder(true);
              setNewFolderName('');
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-0.5"
            title={t('pages.newFolder')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4m-2-2h4" />
            </svg>
          </button>
        </div>

        {/* New folder inline input */}
        {showNewFolder && (
          <div className="mb-2 flex items-center gap-1 px-1">
            <span className="text-sm">📁</span>
            <input
              ref={newFolderInputRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={handleCreateFolder}
              onKeyDown={handleNewFolderKeyDown}
              placeholder={t('pages.folderName')}
              className="flex-1 text-sm border border-brand-300 rounded px-2 py-1 outline-none"
            />
          </div>
        )}

        {pagesLoading ? (
          <div className="space-y-2" aria-label="Loading pages">
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ) : (
          <nav aria-label="Pages">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={() => setIsDragging(true)}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={() => {
                setIsDragging(false);
                setOverFolderId(null);
              }}
            >
              {/* Folders */}
              {localFolders.length > 0 && (
                <SortableContext items={localFolders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-0.5 mb-1">
                    {localFolders.map((folder) => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        familyId={familyId}
                        activePageId={activePageId}
                        onClose={onClose}
                        onDeletePage={handleDeletePage}
                        onDeleteFolder={handleDeleteFolder}
                        onRenameFolder={handleRenameFolder}
                        isOver={overFolderId === folder.id}
                      />
                    ))}
                  </ul>
                </SortableContext>
              )}

              {/* Root pages */}
              {rootPages.length > 0 && (
                <SortableContext items={rootPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-0.5">
                    {rootPages.map((page) => (
                      <SortablePageItem
                        key={page.id}
                        page={page}
                        familyId={familyId}
                        isActive={activePageId === page.id}
                        onClose={onClose}
                        onDelete={() => handleDeletePage(page.id, page.title)}
                        folderId={null}
                      />
                    ))}
                  </ul>
                </SortableContext>
              )}
            </DndContext>
          </nav>
        )}
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
