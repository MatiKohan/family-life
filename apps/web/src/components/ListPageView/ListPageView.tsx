import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { apiRequest } from '../../lib/api-client';
import { Page, ListItem } from '../../types/page';
import { useFamily } from '../../hooks/useFamily';
import { FamilyMember } from '../../types/family';

interface Props {
  page: Page;
  familyId: string;
}

// ---- helpers ---------------------------------------------------------------

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-red-400',
  'bg-orange-400',
  'bg-amber-400',
  'bg-green-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-pink-500',
];

function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

// ---- helpers ---------------------------------------------------------------

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

// ---- sub-components --------------------------------------------------------

interface AssigneeCircleProps {
  assigneeId: string | null;
  members: FamilyMember[];
  onAssign: (userId: string | null) => void;
}

function AssigneeCircle({ assigneeId, members, onAssign }: AssigneeCircleProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const assignee = members.find((m) => m.userId === assigneeId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${
          assignee ? avatarColor(assignee.userId) : 'bg-gray-200 text-gray-500'
        }`}
        aria-label={assignee ? `Assigned to ${assignee.user.name}` : 'Unassigned — click to assign'}
        title={assignee ? assignee.user.name : 'Unassigned'}
      >
        {assignee ? getInitials(assignee.user.name) : '+'}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] overflow-hidden">
          {members.map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => {
                onAssign(m.userId);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left ${
                m.userId === assigneeId ? 'text-brand-700 font-medium' : 'text-gray-700'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${avatarColor(m.userId)}`}
              >
                {getInitials(m.user.name)}
              </span>
              <span className="truncate">{m.user.name}</span>
            </button>
          ))}
          {assigneeId && (
            <>
              <div className="border-t border-gray-100" />
              <button
                type="button"
                onClick={() => {
                  onAssign(null);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 text-left"
              >
                {t('list.unassign')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface DueDateBadgeProps {
  dueDate: string | null;
  onDateChange: (date: string | null) => void;
}

function DueDateBadge({ dueDate, onDateChange }: DueDateBadgeProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.showPicker?.();
  }, [editing]);

  const overdue = isOverdue(dueDate);
  const label = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="relative shrink-0">
      {dueDate ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`text-xs px-2 py-0.5 rounded-full ${
            overdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
          }`}
          aria-label={`Due ${label}${overdue ? ' (overdue)' : ''}`}
        >
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-gray-300 hover:text-gray-500 transition-colors px-1"
          aria-label="Set due date"
        >
          date
        </button>
      )}
      {editing && (
        <input
          ref={inputRef}
          type="date"
          value={dueDate ?? ''}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          onChange={(e) => {
            onDateChange(e.target.value || null);
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ---- main component --------------------------------------------------------

export function ListPageView({ page, familyId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: familyData } = useFamily(familyId);
  const members = familyData?.members ?? [];

  const [newItemText, setNewItemText] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(page.title);
  const addInputRef = useRef<HTMLInputElement>(null);

  const cacheKey = ['pages', familyId, page.id];

  // Toggle checked (optimistic)
  const toggleMutation = useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ checked }),
      }),
    onMutate: async ({ itemId, checked }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      queryClient.setQueryData<Page>(cacheKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId ? { ...item, checked } : item,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });

  // Add item
  const addMutation = useMutation({
    mutationFn: (text: string) =>
      apiRequest<ListItem>(`/families/${familyId}/pages/${page.id}/items`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    onSuccess: () => {
      setNewItemText('');
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });

  // Delete item (optimistic)
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/items/${itemId}`, {
        method: 'DELETE',
      }),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      queryClient.setQueryData<Page>(cacheKey, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((i) => i.id !== itemId) };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });

  // Patch item (assignee, due date) — optimistic
  const patchItemMutation = useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: Partial<ListItem> }) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onMutate: async ({ itemId, patch }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      queryClient.setQueryData<Page>(cacheKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId ? { ...item, ...patch } : item,
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });

  // Check all (optimistic)
  const checkAllMutation = useMutation({
    mutationFn: (checked: boolean) =>
      Promise.all(
        page.items
          .filter((i) => i.checked !== checked)
          .map((i) =>
            apiRequest(`/families/${familyId}/pages/${page.id}/items/${i.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ checked }),
            }),
          ),
      ),
    onMutate: async (checked) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      queryClient.setQueryData<Page>(cacheKey, (old) =>
        old ? { ...old, items: old.items.map((i) => ({ ...i, checked })) } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });

  // Clear all items (optimistic)
  const clearAllMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        page.items.map((i) =>
          apiRequest(`/families/${familyId}/pages/${page.id}/items/${i.id}`, {
            method: 'DELETE',
          }),
        ),
      ),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      queryClient.setQueryData<Page>(cacheKey, (old) =>
        old ? { ...old, items: [] } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });

  // Edit item text (optimistic)
  const editTextMutation = useMutation({
    mutationFn: ({ itemId, text }: { itemId: string; text: string }) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ text }),
      }),
    onMutate: async ({ itemId, text }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      queryClient.setQueryData<Page>(cacheKey, (old) =>
        old ? { ...old, items: old.items.map((i) => i.id === itemId ? { ...i, text } : i) } : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });

  // Reorder items
  const reorderMutation = useMutation({
    mutationFn: (itemIds: string[]) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/items/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ itemIds }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = page.items;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    queryClient.setQueryData<Page>(cacheKey, (old) =>
      old ? { ...old, items: reordered } : old,
    );
    reorderMutation.mutate(reordered.map((i) => i.id));
  }

  // Update page title
  const updateTitleMutation = useMutation({
    mutationFn: (newTitle: string) =>
      apiRequest(`/families/${familyId}/pages/${page.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKey });
      queryClient.invalidateQueries({ queryKey: ['pages', familyId] });
    },
  });

  function handleAddItem(e: React.KeyboardEvent<HTMLInputElement> | React.FormEvent) {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    addMutation.mutate(text);
  }

  function handleTitleBlur() {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== page.title) {
      updateTitleMutation.mutate(trimmed);
    } else {
      setTitleValue(page.title);
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setTitleValue(page.title);
      setEditingTitle(false);
    }
  }

  // Keep local title value in sync when page prop updates
  useEffect(() => {
    if (!editingTitle) setTitleValue(page.title);
  }, [page.title, editingTitle]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      {/* Page heading */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-4xl leading-none">{page.emoji}</span>
        {editingTitle ? (
          <input
            autoFocus
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-brand-400 focus:outline-none flex-1 min-w-0"
            aria-label="Page title"
          />
        ) : (
          <h1
            className="text-3xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors"
            onClick={() => setEditingTitle(true)}
            title="Click to edit title"
          >
            {page.title}
          </h1>
        )}
      </div>

      {/* Bulk actions — only shown when there are items */}
      {page.items.length > 0 && (
        <div className="flex items-center gap-2 mb-4 -mt-4">
          <button
            type="button"
            onClick={() => checkAllMutation.mutate(page.items.some((i) => !i.checked))}
            disabled={checkAllMutation.isPending}
            className="text-xs text-gray-500 hover:text-brand-600 font-medium px-2 py-1 rounded hover:bg-brand-50 transition-colors"
          >
            {page.items.every((i) => i.checked)
              ? t('list.uncheckAll')
              : t('list.checkAll')}
          </button>

          <span className="text-gray-200 select-none">|</span>

          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('list.clearConfirm'))) {
                clearAllMutation.mutate();
              }
            }}
            disabled={clearAllMutation.isPending}
            className="text-xs text-gray-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            {t('list.clearAll')}
          </button>
        </div>
      )}

      {/* Items list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={page.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-gray-100">
            {page.items.map((item) => (
              <SortableItemRow
                key={item.id}
                item={item}
                members={members}
                onToggle={(checked) => toggleMutation.mutate({ itemId: item.id, checked })}
                onDelete={() => deleteMutation.mutate(item.id)}
                onAssign={(userId) =>
                  patchItemMutation.mutate({ itemId: item.id, patch: { assigneeId: userId } })
                }
                onDueDateChange={(date) =>
                  patchItemMutation.mutate({ itemId: item.id, patch: { dueDate: date } })
                }
                onTextChange={(text) => editTextMutation.mutate({ itemId: item.id, text })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add item input */}
      <form onSubmit={handleAddItem} className="mt-2">
        <div className="flex items-center gap-2 py-2 border-b-2 border-transparent focus-within:border-brand-300 transition-colors">
          <input
            ref={addInputRef}
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddItem(e);
            }}
            placeholder={t('list.addItemPlaceholder')}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none min-h-[44px]"
            aria-label="New item text"
            disabled={addMutation.isPending}
          />
          {newItemText.trim() && (
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="text-xs text-brand-600 font-medium px-2 py-1 hover:bg-brand-50 rounded transition-colors"
            >
              {t('list.addItem')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ---- ItemRow ----------------------------------------------------------------

interface ItemRowProps {
  item: ListItem;
  members: FamilyMember[];
  onToggle: (checked: boolean) => void;
  onDelete: () => void;
  onAssign: (userId: string | null) => void;
  onDueDateChange: (date: string | null) => void;
  onTextChange: (text: string) => void;
  dragHandle?: React.ReactNode;
}

function SortableItemRow(props: Omit<ItemRowProps, 'dragHandle'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="shrink-0 text-gray-300 opacity-30 group-hover:opacity-60 touch-none cursor-grab active:cursor-grabbing p-0.5 rounded"
      aria-label="Drag to reorder"
      tabIndex={-1}
    >
      <GripIcon />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      <ItemRow {...props} dragHandle={dragHandle} />
    </div>
  );
}

function ItemRow({ item, members, onToggle, onDelete, onAssign, onDueDateChange, onTextChange, dragHandle }: ItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commitEdit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.text) onTextChange(trimmed);
    else setDraft(item.text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') { setDraft(item.text); setEditing(false); }
  }

  return (
    <div className="flex items-center gap-3 py-2.5 min-h-[44px] group">
      {/* Drag handle */}
      {dragHandle}

      {/* Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        onClick={() => onToggle(!item.checked)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          item.checked
            ? 'bg-brand-500 border-brand-500 text-white'
            : 'border-gray-300 hover:border-brand-400'
        }`}
        aria-label={item.checked ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {item.checked && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Item text — click to edit */}
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{ fontSize: '16px' }}
          className="flex-1 bg-transparent border-b border-brand-400 focus:outline-none text-gray-800 min-w-0"
        />
      ) : (
        <span
          onClick={() => { setDraft(item.text); setEditing(true); }}
          className={`flex-1 text-sm min-w-0 cursor-text ${
            item.checked ? 'line-through text-gray-400' : 'text-gray-800'
          }`}
        >
          {item.text}
        </span>
      )}

      {/* Due date */}
      <DueDateBadge dueDate={item.dueDate} onDateChange={onDueDateChange} />

      {/* Assignee */}
      {members.length > 0 && (
        <AssigneeCircle
          assigneeId={item.assigneeId}
          members={members}
          onAssign={onAssign}
        />
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 transition-colors shrink-0 w-5 h-5 flex items-center justify-center rounded md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
        aria-label="Delete item"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
