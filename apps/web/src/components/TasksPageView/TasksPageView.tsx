import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
}

function TaskCard({ task, members, onStatusChange, onAssign, onDueDateChange, onDelete }: TaskCardProps) {
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row 1: status badge + title + delete */}
      <div className="flex items-start gap-2 min-h-[44px]">
        <StatusBadge
          status={task.status}
          onClick={() => onStatusChange(nextStatus(task.status))}
        />
        <span
          className={`flex-1 text-sm text-gray-800 pt-0.5 min-w-0 ${
            task.status === 'done' ? 'line-through text-gray-400' : ''
          }`}
        >
          {task.text}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className={`text-gray-400 hover:text-red-500 transition-colors shrink-0 w-5 h-5 flex items-center justify-center rounded ${
            hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label={t('tasks.deleteTask')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Row 2: due date + assignee */}
      <div className="flex items-center justify-end gap-2 mt-2">
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
  addInput?: React.ReactNode;
}

function StatusSection({
  status,
  tasks,
  members,
  onStatusChange,
  onAssign,
  onDueDateChange,
  onDelete,
  addInput,
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
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              onStatusChange={(s) => onStatusChange(task.id, s)}
              onAssign={(userId) => onAssign(task.id, userId)}
              onDueDateChange={(date) => onDueDateChange(task.id, date)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </div>
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
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(page.title);
  const addInputRef = useRef<HTMLInputElement>(null);

  const cacheKey = ['pages', familyId, page.id];
  const taskItems = page.taskItems ?? [];

  const todoTasks = taskItems.filter((t) => t.status === 'todo');
  const inProgressTasks = taskItems.filter((t) => t.status === 'in-progress');
  const doneTasks = taskItems.filter((t) => t.status === 'done');

  // Keep title in sync
  useEffect(() => {
    if (!editingTitle) setTitleValue(page.title);
  }, [page.title, editingTitle]);

  // Add task
  const addMutation = useMutation({
    mutationFn: (text: string) =>
      apiRequest<TaskItem>(`/families/${familyId}/pages/${page.id}/task-items`, {
        method: 'POST',
        body: JSON.stringify({ text, status: 'todo' }),
      }),
    onMutate: async (text) => {
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

  const addTaskInput = (
    <form onSubmit={handleAddTask} className="flex items-center gap-2 mb-1">
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
          onStatusChange={(id, s) => patchTaskMutation.mutate({ taskId: id, patch: { status: s } })}
          onAssign={(id, userId) => patchTaskMutation.mutate({ taskId: id, patch: { assigneeId: userId } })}
          onDueDateChange={(id, date) => patchTaskMutation.mutate({ taskId: id, patch: { dueDate: date } })}
          onDelete={(id) => deleteTaskMutation.mutate(id)}
          addInput={addTaskInput}
        />
        <StatusSection
          status="in-progress"
          tasks={inProgressTasks}
          members={members}
          onStatusChange={(id, s) => patchTaskMutation.mutate({ taskId: id, patch: { status: s } })}
          onAssign={(id, userId) => patchTaskMutation.mutate({ taskId: id, patch: { assigneeId: userId } })}
          onDueDateChange={(id, date) => patchTaskMutation.mutate({ taskId: id, patch: { dueDate: date } })}
          onDelete={(id) => deleteTaskMutation.mutate(id)}
        />
        <StatusSection
          status="done"
          tasks={doneTasks}
          members={members}
          onStatusChange={(id, s) => patchTaskMutation.mutate({ taskId: id, patch: { status: s } })}
          onAssign={(id, userId) => patchTaskMutation.mutate({ taskId: id, patch: { assigneeId: userId } })}
          onDueDateChange={(id, date) => patchTaskMutation.mutate({ taskId: id, patch: { dueDate: date } })}
          onDelete={(id) => deleteTaskMutation.mutate(id)}
        />
      </div>
    </div>
  );
}
