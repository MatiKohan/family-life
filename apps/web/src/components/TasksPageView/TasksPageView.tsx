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
import { Page, TaskItem, TaskStatus } from '../../types/page';
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

const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'done'];

function nextStatus(current: TaskStatus): TaskStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
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
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${
          assignee ? avatarColor(assignee.userId) : 'bg-gray-200 text-gray-500'
        }`}
        aria-label={assignee ? `Assigned to ${assignee.user.name}` : t('tasks.assignTo')}
        title={assignee ? assignee.user.name : t('tasks.assignTo')}
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
                {t('tasks.unassign')}
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
          📅
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

interface StatusBadgeProps {
  status: TaskStatus;
  onClick: () => void;
}

function StatusBadge({ status, onClick }: StatusBadgeProps) {
  const { t } = useTranslation();

  const styles: Record<TaskStatus, string> = {
    'todo': 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-blue-100 text-blue-600',
    'done': 'bg-green-100 text-green-600',
  };

  const labels: Record<TaskStatus, string> = {
    'todo': t('tasks.statusTodo'),
    'in-progress': t('tasks.statusInProgress'),
    'done': t('tasks.statusDone'),
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 min-h-[28px] transition-colors hover:opacity-80 ${styles[status]}`}
      aria-label={`Status: ${labels[status]}. Click to change.`}
      title={`Status: ${labels[status]}`}
    >
      {labels[status]} ▾
    </button>
  );
}

// ---- TaskCard ---------------------------------------------------------------

interface TaskCardProps {
  task: TaskItem;
  members: FamilyMember[];
  onStatusChange: (status: TaskStatus) => void;
  onAssign: (userId: string | null) => void;
  onDueDateChange: (date: string | null) => void;
  onDelete: () => void;
  onTextChange: (text: string) => void;
  dragHandle?: React.ReactNode;
}

function SortableTaskCard(props: Omit<TaskCardProps, 'dragHandle'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id });
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
      <TaskCard {...props} dragHandle={dragHandle} />
    </div>
  );
}

function TaskCard({ task, members, onStatusChange, onAssign, onDueDateChange, onDelete, onTextChange, dragHandle }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commitEdit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.text) onTextChange(trimmed);
    else setDraft(task.text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') { setDraft(task.text); setEditing(false); }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm group">
      {/* Row 1: drag handle + status badge + title + delete */}
      <div className="flex items-start gap-2 min-h-[44px]">
        {dragHandle}
        <StatusBadge
          status={task.status}
          onClick={() => onStatusChange(nextStatus(task.status))}
        />
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            style={{ fontSize: '16px' }}
            className="flex-1 bg-transparent border-b border-brand-400 focus:outline-none text-gray-800 pt-0.5 min-w-0"
          />
        ) : (
          <span
            onClick={() => { setDraft(task.text); setEditing(true); }}
            className={`flex-1 text-sm pt-0.5 min-w-0 cursor-text ${
              task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'
            }`}
          >
            {task.text}
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 w-5 h-5 flex items-center justify-center rounded md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
          aria-label={t('tasks.deleteTask')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Row 2: recurrence badges + due date + assignee */}
      <div className="flex items-center justify-end gap-2 mt-2 flex-wrap">
        {task.recurrence && (
          <span className="text-xs text-gray-400 shrink-0">
            🔁 {t(`tasks.recurrence${task.recurrence.freq.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`)}
          </span>
        )}
        {task.recurrence?.nextDue && task.recurrence.nextDue < new Date().toISOString().slice(0, 10) && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
            {t('tasks.overdue')}
          </span>
        )}
        {task.recurrence?.nextDue && task.recurrence.nextDue === new Date().toISOString().slice(0, 10) && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">
            {t('tasks.dueToday')}
          </span>
        )}
        <DueDateBadge dueDate={task.dueDate} onDateChange={onDueDateChange} />
        {members.length > 0 && (
          <AssigneeCircle
            assigneeId={task.assigneeId}
            members={members}
            onAssign={onAssign}
          />
        )}
      </div>
    </div>
  );
}

// ---- StatusSection ----------------------------------------------------------

interface StatusSectionProps {
  status: TaskStatus;
  tasks: TaskItem[];
  members: FamilyMember[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAssign: (taskId: string, userId: string | null) => void;
  onDueDateChange: (taskId: string, date: string | null) => void;
  onDelete: (taskId: string) => void;
  onTextChange: (taskId: string, text: string) => void;
  onReorder: (reorderedIds: string[]) => void;
  addInput?: React.ReactNode;
  sensors: ReturnType<typeof useSensors>;
}

function StatusSection({
  status,
  tasks,
  members,
  onStatusChange,
  onAssign,
  onDueDateChange,
  onDelete,
  onTextChange,
  onReorder,
  addInput,
  sensors,
}: StatusSectionProps) {
  const { t } = useTranslation();

  const headerStyles: Record<TaskStatus, string> = {
    'todo': 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-blue-100 text-blue-600',
    'done': 'bg-green-100 text-green-600',
  };

  const sectionLabels: Record<TaskStatus, string> = {
    'todo': t('tasks.todo'),
    'in-progress': t('tasks.inProgress'),
    'done': t('tasks.done'),
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    onReorder(reordered.map((t) => t.id));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${headerStyles[status]}`}>
          {sectionLabels[status]}
        </span>
        <span className="text-xs text-gray-400 font-medium">{tasks.length}</span>
      </div>

      {/* Add input (only for todo section) */}
      {addInput}

      {/* Task cards */}
      {tasks.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 min-h-[60px] flex items-center justify-center">
          {t('tasks.emptyState')}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  members={members}
                  onStatusChange={(s) => onStatusChange(task.id, s)}
                  onAssign={(userId) => onAssign(task.id, userId)}
                  onDueDateChange={(date) => onDueDateChange(task.id, date)}
                  onDelete={() => onDelete(task.id)}
                  onTextChange={(text) => onTextChange(task.id, text)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ---- main component --------------------------------------------------------

export function TasksPageView({ page, familyId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: familyData } = useFamily(familyId);
  const members = familyData?.members ?? [];

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<'none' | 'daily' | 'bi-daily' | 'weekly' | 'monthly'>('none');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(page.title);
  const addInputRef = useRef<HTMLInputElement>(null);

  const cacheKey = ['pages', familyId, page.id];
  const taskItems = page.taskItems ?? [];

  const today = new Date().toISOString().slice(0, 10);
  const todoTasks = taskItems
    .filter((t) => t.status === 'todo')
    .sort((a, b) => {
      const score = (item: TaskItem) => {
        if (!item.recurrence?.nextDue) return 0;
        if (item.recurrence.nextDue < today) return -2;
        if (item.recurrence.nextDue === today) return -1;
        return 0;
      };
      return score(a) - score(b);
    });
  const inProgressTasks = taskItems.filter((t) => t.status === 'in-progress');
  const doneTasks = taskItems.filter((t) => t.status === 'done');

  // Keep title in sync
  useEffect(() => {
    if (!editingTitle) setTitleValue(page.title);
  }, [page.title, editingTitle]);

  // Add task
  const addMutation = useMutation({
    mutationFn: ({ text, recurrence }: { text: string; recurrence?: { freq: 'daily' | 'weekly' | 'monthly' } }) =>
      apiRequest<TaskItem>(`/families/${familyId}/pages/${page.id}/task-items`, {
        method: 'POST',
        body: JSON.stringify({ text, status: 'todo', recurrence: recurrence ?? null }),
      }),
    onMutate: async ({ text }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      const optimisticTask: TaskItem = {
        id: `optimistic-${Date.now()}`,
        text,
        assigneeId: null,
        status: 'todo',
        dueDate: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Page>(cacheKey, (old) => {
        if (!old) return old;
        return { ...old, taskItems: [optimisticTask, ...(old.taskItems ?? [])] };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSuccess: () => {
      setNewTaskText('');
      setNewTaskRecurrence('none');
      queryClient.invalidateQueries({ queryKey: cacheKey });
    },
  });

  // Patch task (status, assignee, dueDate)
  const patchTaskMutation = useMutation({
    mutationFn: ({ taskId, patch }: { taskId: string; patch: Partial<TaskItem> }) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/task-items/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onMutate: async ({ taskId, patch }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      queryClient.setQueryData<Page>(cacheKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          taskItems: (old.taskItems ?? []).map((item) =>
            item.id === taskId ? { ...item, ...patch } : item,
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

  // Delete task
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/task-items/${taskId}`, {
        method: 'DELETE',
      }),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      queryClient.setQueryData<Page>(cacheKey, (old) => {
        if (!old) return old;
        return { ...old, taskItems: (old.taskItems ?? []).filter((t) => t.id !== taskId) };
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

  // Edit task text (optimistic)
  const editTextMutation = useMutation({
    mutationFn: ({ taskId, text }: { taskId: string; text: string }) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/task-items/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ text }),
      }),
    onMutate: async ({ taskId, text }) => {
      await queryClient.cancelQueries({ queryKey: cacheKey });
      const previous = queryClient.getQueryData<Page>(cacheKey);
      queryClient.setQueryData<Page>(cacheKey, (old) =>
        old
          ? { ...old, taskItems: (old.taskItems ?? []).map((t) => t.id === taskId ? { ...t, text } : t) }
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(cacheKey, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });

  // Reorder task items
  const reorderTaskMutation = useMutation({
    mutationFn: (taskItemIds: string[]) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/task-items/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ taskItemIds }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: cacheKey }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleReorderSection(reorderedIds: string[], sectionStatus: TaskStatus) {
    // Rebuild the full taskItems array: reordered section + other sections in original order
    const otherItems = taskItems.filter((t) => t.status !== sectionStatus);
    const reorderedSection = reorderedIds
      .map((id) => taskItems.find((t) => t.id === id))
      .filter((t): t is TaskItem => !!t);
    const fullOrder = [...reorderedSection, ...otherItems];
    queryClient.setQueryData<Page>(cacheKey, (old) =>
      old ? { ...old, taskItems: fullOrder } : old,
    );
    reorderTaskMutation.mutate(fullOrder.map((t) => t.id));
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

  function handleAddTask(e: React.KeyboardEvent<HTMLInputElement> | React.FormEvent) {
    e.preventDefault();
    const text = newTaskText.trim();
    if (!text) return;
    addMutation.mutate({
      text,
      recurrence: newTaskRecurrence !== 'none' ? { freq: newTaskRecurrence } : undefined,
    });
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

  const addTaskInput = (
    <form onSubmit={handleAddTask} className="flex flex-col gap-1.5 mb-1">
      <div className="flex items-center gap-2">
        <input
          ref={addInputRef}
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddTask(e);
          }}
          placeholder={t('tasks.addTaskPlaceholder')}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder-gray-400 min-h-[44px]"
          aria-label={t('tasks.addTaskPlaceholder')}
          disabled={addMutation.isPending}
        />
        {newTaskText.trim() && (
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="text-xs text-brand-600 font-medium px-3 py-2 min-h-[44px] hover:bg-brand-50 rounded-lg transition-colors border border-brand-200"
          >
            {t('tasks.addTask')}
          </button>
        )}
      </div>
      <select
        value={newTaskRecurrence}
        onChange={(e) => setNewTaskRecurrence(e.target.value as typeof newTaskRecurrence)}
        aria-label={t('tasks.recurrence')}
        className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white"
      >
        <option value="none">{t('tasks.recurrenceNone')}</option>
        <option value="daily">{t('tasks.recurrenceDaily')}</option>
        <option value="bi-daily">{t('tasks.recurrenceBiDaily')}</option>
        <option value="weekly">{t('tasks.recurrenceWeekly')}</option>
        <option value="monthly">{t('tasks.recurrenceMonthly')}</option>
      </select>
    </form>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full">
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

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusSection
          status="todo"
          tasks={todoTasks}
          members={members}
          sensors={sensors}
          onStatusChange={(id, s) => patchTaskMutation.mutate({ taskId: id, patch: { status: s } })}
          onAssign={(id, userId) => patchTaskMutation.mutate({ taskId: id, patch: { assigneeId: userId } })}
          onDueDateChange={(id, date) => patchTaskMutation.mutate({ taskId: id, patch: { dueDate: date } })}
          onDelete={(id) => deleteTaskMutation.mutate(id)}
          onTextChange={(id, text) => editTextMutation.mutate({ taskId: id, text })}
          onReorder={(ids) => handleReorderSection(ids, 'todo')}
          addInput={addTaskInput}
        />
        <StatusSection
          status="in-progress"
          tasks={inProgressTasks}
          members={members}
          sensors={sensors}
          onStatusChange={(id, s) => patchTaskMutation.mutate({ taskId: id, patch: { status: s } })}
          onAssign={(id, userId) => patchTaskMutation.mutate({ taskId: id, patch: { assigneeId: userId } })}
          onDueDateChange={(id, date) => patchTaskMutation.mutate({ taskId: id, patch: { dueDate: date } })}
          onDelete={(id) => deleteTaskMutation.mutate(id)}
          onTextChange={(id, text) => editTextMutation.mutate({ taskId: id, text })}
          onReorder={(ids) => handleReorderSection(ids, 'in-progress')}
        />
        <StatusSection
          status="done"
          tasks={doneTasks}
          members={members}
          sensors={sensors}
          onStatusChange={(id, s) => patchTaskMutation.mutate({ taskId: id, patch: { status: s } })}
          onAssign={(id, userId) => patchTaskMutation.mutate({ taskId: id, patch: { assigneeId: userId } })}
          onDueDateChange={(id, date) => patchTaskMutation.mutate({ taskId: id, patch: { dueDate: date } })}
          onDelete={(id) => deleteTaskMutation.mutate(id)}
          onTextChange={(id, text) => editTextMutation.mutate({ taskId: id, text })}
          onReorder={(ids) => handleReorderSection(ids, 'done')}
        />
      </div>
    </div>
  );
}
