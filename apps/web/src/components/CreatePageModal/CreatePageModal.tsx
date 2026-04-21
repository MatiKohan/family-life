import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../../lib/api-client';
import { useFolders } from '../../hooks/useFolders';
import { PageSummary, PageType } from '../../types/page';

const PAGE_EMOJIS = [
  // General
  '📝', '📋', '✅', '🎯', '📅', '🌟', '💰', '🔧', '💻', '📚',
  // Food & Kitchen
  '🍕', '🍽️', '🛒', '🥗', '🍜', '🍣', '🥘', '🍳', '🧁', '🎂',
  '🍷', '☕', '🧇', '🥩', '🫕',
  // Trips & Travel
  '✈️', '🏖️', '🏕️', '🗺️', '🧳', '🚂', '🚢', '🏔️', '🌍', '🗼',
  '🏝️', '⛺', '🚗', '🛵', '🎒',
  // Home & Family
  '🏠', '🏡', '👶', '🐾', '🧹', '🛋️', '🪴', '🔑', '🧺', '🪟',
  // Health & Fitness
  '💪', '🏋️', '🏃', '🧘', '🩺', '💊', '🏥', '🥦', '🚴', '🩹',
  // Fun & Hobbies
  '🎵', '🎨', '🎮', '⚽', '🎬', '📸', '🎭', '🎸', '🎲', '🏄',
  // Events & Social
  '🎉', '🎁', '🛍️', '🎓', '🌅', '🕯️', '🥂', '💌', '🎪', '🚀',
  // Nature & Outdoors
  '🌿', '🌸', '🌳', '🌊', '⛰️', '🦋', '🌻', '🍂', '❄️', '🌈',
];

interface Props {
  familyId: string;
  onClose: () => void;
  onCreated: (page: PageSummary) => void;
}

export function CreatePageModal({ familyId, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📝');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [type, setType] = useState<PageType>('list');
  const [folderId, setFolderId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { data: folders } = useFolders(familyId);

  const handleEmojiSelect = useCallback((e: string) => {
    setEmoji(e);
    setEmojiPickerOpen(false);
  }, []);

  useEffect(() => {
    if (!emojiPickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [emojiPickerOpen]);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);


  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<PageSummary>(`/families/${familyId}/pages`, {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), emoji, type, ...(folderId ? { folderId } : {}) }),
      }),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ['pages', familyId] });
      onCreated(page);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90dvh]">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{t('pages.createTitle')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none -mr-1"
              aria-label={t('common.close')}
            >
              ×
            </button>
          </div>

          <div className="px-6 space-y-5 overflow-y-auto flex-1">
            {/* Emoji selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('family.icon')}</label>
              <div ref={emojiPickerRef} className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  aria-label={t('family.icon')}
                >
                  <span className="text-2xl leading-none">{emoji}</span>
                  <span className="text-gray-500">▾</span>
                </button>
                {emojiPickerOpen && (
                  <div className="absolute top-full mt-1 start-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-64">
                    <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
                      {PAGE_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => handleEmojiSelect(e)}
                          className={`text-xl p-1.5 rounded-lg transition-colors ${
                            emoji === e ? 'bg-brand-100 ring-2 ring-brand-500' : 'hover:bg-gray-100'
                          }`}
                          aria-label={`Select emoji ${e}`}
                          aria-pressed={emoji === e}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Title input */}
            <div>
              <label htmlFor="page-title" className="block text-sm font-medium text-gray-700 mb-1">
                {t('pages.titleLabel')}
              </label>
              <input
                id="page-title"
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('pages.titlePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Page type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.typeLabel')}</label>
              <div className="grid grid-cols-2 gap-3">
                {/* List type */}
                <button
                  type="button"
                  onClick={() => setType('list')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    type === 'list'
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={type === 'list'}
                >
                  <span className="text-2xl">📋</span>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{t('pages.listType')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t('pages.listTypeDesc')}</div>
                  </div>
                </button>

                {/* Tasks type */}
                <button
                  type="button"
                  onClick={() => setType('tasks')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    type === 'tasks'
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={type === 'tasks'}
                >
                  <span className="text-2xl">✅</span>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{t('pages.tasksType')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t('pages.tasksTypeDesc')}</div>
                  </div>
                </button>

                {/* Events type */}
                <button
                  type="button"
                  onClick={() => setType('events')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    type === 'events'
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={type === 'events'}
                >
                  <span className="text-2xl">📅</span>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{t('pages.eventsType')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t('pages.eventsTypeDesc')}</div>
                  </div>
                </button>

                {/* Apartments type */}
                <button
                  type="button"
                  onClick={() => setType('apartments')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    type === 'apartments'
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={type === 'apartments'}
                >
                  <span className="text-2xl">🏠</span>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{t('pages.apartmentsType')}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t('pages.apartmentsTypeDesc')}</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Folder selector */}
            {folders && folders.length > 0 && (
              <div>
                <label htmlFor="page-folder" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.folderLabel', 'Folder')}
                </label>
                <select
                  id="page-folder"
                  value={folderId ?? ''}
                  onChange={(e) => setFolderId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="">{t('pages.noFolder', 'No folder')}</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.emoji} {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          <div className="pb-2" />
          </div>

          {/* Footer */}
          <div className="px-6 py-5 flex justify-end gap-3 shrink-0 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!title.trim() || mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? t('family.creating') : t('common.create')}
            </button>
          </div>

          {mutation.isError && (
            <p className="px-6 pb-4 text-sm text-red-600">
              Failed to create page. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
