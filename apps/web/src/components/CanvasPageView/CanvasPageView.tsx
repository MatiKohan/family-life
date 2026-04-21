import { useState, useEffect, useRef, useCallback } from 'react';
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
import type { Page, Block } from '../../types/page';
import { BlockRenderer } from './BlockRenderer';

interface Props {
  page: Page;
  familyId: string;
}

// ---- GripIcon ---------------------------------------------------------------

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

// ---- SortableBlock ----------------------------------------------------------

interface SortableBlockProps {
  block: Block;
  familyId: string;
  pageId: string;
  onUpdate: (id: string, patch: Partial<Block>) => void;
  onDelete: (id: string) => void;
}

function SortableBlock({ block, familyId, pageId, onUpdate, onDelete }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="shrink-0 text-gray-300 opacity-30 group-hover:opacity-60 touch-none cursor-grab active:cursor-grabbing p-0.5 rounded"
      aria-label="Drag block to reorder"
      tabIndex={-1}
    >
      <GripIcon />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
    >
      <BlockRenderer
        block={block}
        familyId={familyId}
        pageId={pageId}
        dragHandle={dragHandle}
        onUpdate={(patch) => onUpdate(block.id, patch)}
        onDelete={() => onDelete(block.id)}
      />
    </div>
  );
}

// ---- CanvasPageView ---------------------------------------------------------

export function CanvasPageView({ page, familyId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const cacheKey = ['pages', familyId, page.id];

  const [blocks, setBlocks] = useState<Block[]>(page.blocks ?? []);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(page.title);
  const [showListPicker, setShowListPicker] = useState(false);
  const listPickerRef = useRef<HTMLDivElement>(null);

  // Keep blocks in sync when page prop updates (but don't overwrite while editing)
  const isLocalEdit = useRef(false);
  useEffect(() => {
    if (!isLocalEdit.current) {
      setBlocks(page.blocks ?? []);
    }
  }, [page.blocks]);

  useEffect(() => {
    if (!editingTitle) setTitleValue(page.title);
  }, [page.title, editingTitle]);

  // Close list picker when clicking outside
  useEffect(() => {
    if (!showListPicker) return;
    function handleClickOutside(e: globalThis.MouseEvent) {
      if (listPickerRef.current && !listPickerRef.current.contains(e.target as Node)) {
        setShowListPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showListPicker]);

  // Debounced save for block structure changes
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveBlocksMutation = useMutation({
    mutationFn: (newBlocks: Block[]) =>
      apiRequest(`/families/${familyId}/pages/${page.id}/blocks`, {
        method: 'PUT',
        body: JSON.stringify({ blocks: newBlocks }),
      }),
  });

  const scheduleSave = useCallback(
    (newBlocks: Block[]) => {
      isLocalEdit.current = true;
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = setTimeout(() => {
        saveBlocksMutation.mutate(newBlocks);
        isLocalEdit.current = false;
      }, 800);
    },
    [saveBlocksMutation],
  );

  function updateBlocks(newBlocks: Block[]) {
    setBlocks(newBlocks);
    scheduleSave(newBlocks);
  }

  function addBlock(type: 'list' | 'text', variant?: 'simple' | 'categorized') {
    const newBlock: Block =
      type === 'list'
        ? { id: crypto.randomUUID(), type: 'list', title: undefined, items: [], ...(variant ? { variant } : {}) }
        : { id: crypto.randomUUID(), type: 'text', title: undefined, content: '' };
    updateBlocks([...blocks, newBlock]);
  }

  function handleBlockUpdate(id: string, patch: Partial<Block>) {
    const newBlocks = blocks.map((b) =>
      b.id === id ? ({ ...b, ...patch } as Block) : b,
    );
    setBlocks(newBlocks);
    // For title changes in block header, schedule save
    if ('title' in patch) {
      scheduleSave(newBlocks);
    }
    // items and content changes are saved via their specific endpoints in the child components
  }

  function handleBlockDelete(id: string) {
    updateBlocks(blocks.filter((b) => b.id !== id));
  }

  // Page title mutation
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
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') {
      setTitleValue(page.title);
      setEditingTitle(false);
    }
  }

  // Drag-to-reorder blocks
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    updateBlocks(arrayMove(blocks, oldIndex, newIndex));
  }

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

      {/* Blocks */}
      <div className="flex-1 overflow-y-auto space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                familyId={familyId}
                pageId={page.id}
                onUpdate={handleBlockUpdate}
                onDelete={handleBlockDelete}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add block buttons */}
        <div className="flex gap-2 pt-2">
          <div className="relative" ref={listPickerRef}>
            <button
              type="button"
              onClick={() => setShowListPicker((v) => !v)}
              className="text-sm text-gray-500 hover:text-brand-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
            >
              {t('pages.addListBlock')} ▾
            </button>
            {showListPicker && (
              <div className="absolute bottom-full mb-1 start-0 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[180px]">
                <button
                  type="button"
                  onClick={() => { addBlock('list', 'simple'); setShowListPicker(false); }}
                  className="w-full text-start px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>📋</span> {t('list.simpleList')}
                </button>
                <button
                  type="button"
                  onClick={() => { addBlock('list', 'categorized'); setShowListPicker(false); }}
                  className="w-full text-start px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <span>🗂️</span> {t('list.categorizedList')}
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => addBlock('text')}
            className="text-sm text-gray-500 hover:text-brand-600 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
          >
            {t('pages.addTextBlock')}
          </button>
        </div>
      </div>
    </div>
  );
}
