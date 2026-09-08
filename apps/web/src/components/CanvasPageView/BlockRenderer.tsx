import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Block, ListBlock, TextBlock, ListItem } from '../../types/page';
import {
  LIST_CURRENCIES,
  LIST_MODES,
  type ListCurrency,
  type ListMode,
} from '@family-life/types';
import { resolveListCurrency, resolveListMode } from '../../lib/list-mode';
import { ListBlockView } from './ListBlockView';
import { TextBlockView } from './TextBlockView';
import { apiRequest } from '../../lib/api-client';

interface Props {
  block: Block;
  familyId: string;
  pageId: string;
  dragHandle?: React.ReactNode;
  onUpdate: (patch: Partial<Block>) => void;
  onDelete: () => void;
}

export function BlockRenderer({ block, familyId, pageId, dragHandle, onUpdate, onDelete }: Props) {
  const { t } = useTranslation();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(block.title ?? '');

  const base = `/families/${familyId}/pages/${pageId}/blocks/${block.id}`;

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    onUpdate({ title: trimmed || undefined });
    apiRequest(base, {
      method: 'PATCH',
      body: JSON.stringify({ title: trimmed || null }),
    });
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') {
      setTitleDraft(block.title ?? '');
      setEditingTitle(false);
    }
  }

  function handleDeleteBlock() {
    const hasContent =
      block.type === 'list'
        ? block.items.length > 0
        : block.content.trim().length > 0;
    if (hasContent && !window.confirm(t('pages.deleteBlockConfirm'))) return;
    onDelete();
  }

  function patchListBlock(patch: Partial<ListBlock>) {
    onUpdate(patch);
    apiRequest(base, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  function handleListItemsUpdate(items: ListItem[]) {
    onUpdate({ items } as Partial<ListBlock>);
  }

  function handleTextUpdate(patch: { content: string }) {
    onUpdate({ content: patch.content } as Partial<TextBlock>);
  }

  return (
    <div className="group relative">
      {/* Block header */}
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        {/* Drag handle */}
        {dragHandle}

        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            placeholder={t('pages.blockTitlePlaceholder')}
            className="flex-1 text-sm font-semibold text-gray-700 bg-transparent border-b border-brand-400 focus:outline-none min-w-0"
            aria-label="Block title"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitleDraft(block.title ?? '');
              setEditingTitle(true);
            }}
            className={`flex-1 min-w-0 text-sm font-semibold text-start text-gray-600 hover:text-gray-900 transition-colors truncate ${
              block.title ? '' : 'text-gray-300 italic'
            }`}
          >
            {block.title ?? t('pages.blockTitlePlaceholder')}
          </button>
        )}

        {block.type === 'list' && (
          <>
            <select
              aria-label={t('list.listType')}
              value={resolveListMode(block.mode)}
              onChange={(e) => {
                const mode = e.target.value as ListMode;
                const patch: Partial<ListBlock> = { mode };
                if (mode === 'priced') {
                  patch.currency = resolveListCurrency(block.currency);
                }
                patchListBlock(patch);
              }}
              className="text-base md:text-xs text-gray-600 border border-gray-200 rounded-md px-2 py-1.5 bg-white shrink-0 min-h-9 max-w-[9.5rem]"
            >
              {LIST_MODES.map((m) => (
                <option key={m} value={m}>
                  {t(`list.mode.${m}`)}
                </option>
              ))}
            </select>
            {resolveListMode(block.mode) === 'priced' && (
              <select
                aria-label={t('list.currency')}
                value={resolveListCurrency(block.currency)}
                onChange={(e) => {
                  patchListBlock({ currency: e.target.value as ListCurrency });
                }}
                className="text-base md:text-xs text-gray-600 border border-gray-200 rounded-md px-2 py-1.5 bg-white shrink-0 min-h-9"
              >
                {LIST_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {t(`list.currencyCode.${code}`)}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        {/* Delete block — always tappable on mobile, hover on desktop */}
        <button
          type="button"
          onClick={handleDeleteBlock}
          className="text-gray-300 hover:text-red-500 transition-colors shrink-0 w-8 h-8 flex items-center justify-center rounded md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
          aria-label="Delete block"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Block content */}
      {block.type === 'list' && (
        <ListBlockView
          block={block}
          familyId={familyId}
          pageId={pageId}
          onUpdate={handleListItemsUpdate}
        />
      )}
      {block.type === 'text' && (
        <TextBlockView block={block} onUpdate={handleTextUpdate} />
      )}
    </div>
  );
}
