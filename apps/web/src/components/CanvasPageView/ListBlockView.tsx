import { useState, useRef } from 'react';
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
import type { ListBlock, ListItem } from '../../types/page';

interface Props {
  block: ListBlock;
  familyId: string;
  pageId: string;
  onUpdate: (items: ListItem[]) => void;
}

export function ListBlockView({ block, familyId, pageId, onUpdate }: Props) {
  const { t } = useTranslation();
  const [newItemText, setNewItemText] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const base = `/families/${familyId}/pages/${pageId}/blocks/${block.id}`;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = block.items.findIndex((i) => i.id === active.id);
    const newIndex = block.items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(block.items, oldIndex, newIndex);
    onUpdate(reordered);
    apiRequest(`${base}/items/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ itemIds: reordered.map((i) => i.id) }),
    });
  }

  function toggleItem(item: ListItem) {
    const updated = block.items.map((i) =>
      i.id === item.id ? { ...i, checked: !i.checked } : i,
    );
    onUpdate(updated);
    apiRequest(`${base}/items/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ checked: !item.checked }),
    });
  }

  function deleteItem(itemId: string) {
    const updated = block.items.filter((i) => i.id !== itemId);
    onUpdate(updated);
    apiRequest(`${base}/items/${itemId}`, { method: 'DELETE' });
  }

  function editItemText(item: ListItem, text: string) {
    const updated = block.items.map((i) => (i.id === item.id ? { ...i, text } : i));
    onUpdate(updated);
    apiRequest(`${base}/items/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    });
  }

  function addItem(text: string) {
    const optimisticItem: ListItem = {
      id: `temp-${Date.now()}`,
      text,
      checked: false,
      assigneeId: null,
      dueDate: null,
      createdAt: new Date().toISOString(),
    };
    onUpdate([...block.items, optimisticItem]);
    setNewItemText('');
    apiRequest<ListItem>(`${base}/items`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }).then((created) => {
      onUpdate(
        block.items
          .filter((i) => i.id !== optimisticItem.id)
          .concat(created),
      );
    });
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    addItem(text);
  }

  return (
    <div className="space-y-0.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={block.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-gray-100">
            {block.items.map((item) => (
              <SortableItemRow
                key={item.id}
                item={item}
                onToggle={() => toggleItem(item)}
                onDelete={() => deleteItem(item.id)}
                onTextChange={(text) => editItemText(item, text)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add item input */}
      <form onSubmit={handleAddSubmit} className="mt-1">
        <div className="flex items-center gap-2 py-1.5 border-b-2 border-transparent focus-within:border-brand-300 transition-colors">
          <input
            ref={addInputRef}
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubmit(e);
            }}
            placeholder={t('list.addItemPlaceholder')}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none min-h-[36px]"
            aria-label="New item text"
          />
          {newItemText.trim() && (
            <button
              type="submit"
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

// ---- SortableItemRow --------------------------------------------------------

interface SortableItemRowProps {
  item: ListItem;
  onToggle: () => void;
  onDelete: () => void;
  onTextChange: (text: string) => void;
}

function SortableItemRow({ item, onToggle, onDelete, onTextChange }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitEdit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.text) onTextChange(trimmed);
    else setDraft(item.text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') {
      setDraft(item.text);
      setEditing(false);
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2.5 py-2 min-h-[36px] group">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 text-gray-300 opacity-0 group-hover:opacity-60 touch-none cursor-grab active:cursor-grabbing p-0.5 rounded"
        aria-label="Drag to reorder"
        tabIndex={-1}
      >
        <svg className="w-3 h-3" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="3" r="1.2" />
          <circle cx="7" cy="3" r="1.2" />
          <circle cx="3" cy="8" r="1.2" />
          <circle cx="7" cy="8" r="1.2" />
          <circle cx="3" cy="13" r="1.2" />
          <circle cx="7" cy="13" r="1.2" />
        </svg>
      </button>

      {/* Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        onClick={onToggle}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          item.checked
            ? 'bg-brand-500 border-brand-500 text-white'
            : 'border-gray-300 hover:border-brand-400'
        }`}
        aria-label={item.checked ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {item.checked && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Item text */}
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{ fontSize: '16px' }}
          className="flex-1 bg-transparent border-b border-brand-400 focus:outline-none text-gray-800 min-w-0 text-sm"
        />
      ) : (
        <span
          onClick={() => {
            setDraft(item.text);
            setEditing(true);
          }}
          className={`flex-1 text-sm min-w-0 cursor-text ${
            item.checked ? 'line-through text-gray-400' : 'text-gray-800'
          }`}
        >
          {item.text}
        </span>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 transition-colors shrink-0 w-4 h-4 flex items-center justify-center rounded md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
        aria-label="Delete item"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
