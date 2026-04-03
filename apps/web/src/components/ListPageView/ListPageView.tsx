import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
      <div className="divide-y divide-gray-100">
        {page.items.map((item) => (
          <ItemRow
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
          />
        ))}
      </div>

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
}

function ItemRow({ item, members, onToggle, onDelete, onAssign, onDueDateChange }: ItemRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-3 py-2.5 min-h-[44px] group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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

      {/* Item text */}
      <span
        className={`flex-1 text-sm min-w-0 ${
          item.checked ? 'line-through text-gray-400' : 'text-gray-800'
        }`}
      >
        {item.text}
      </span>

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
        className={`text-gray-400 hover:text-red-500 transition-colors shrink-0 w-5 h-5 flex items-center justify-center rounded ${
          hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Delete item"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
