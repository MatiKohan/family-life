import { useState, useRef, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../../lib/api-client';
import { PageSummary, PageType } from '../../types/page';

const PAGE_EMOJIS = [
  '📝', '📋', '🛒', '🎁', '🏠', '🍕', '📅', '✅', '🎯', '🎨',
  '🌟', '🏖️', '🎵', '📚', '💪', '🧹', '🌿', '💊', '🐾', '🎉',
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
  const [type, setType] = useState<PageType>('list');
  const titleInputRef = useRef<HTMLInputElement>(null);

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
        body: JSON.stringify({ title: title.trim(), emoji, type }),
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('pages.createTitle')}</h2>
          </div>

          <div className="px-6 space-y-5">
            {/* Emoji selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('family.icon')}</label>
              <div className="grid grid-cols-10 gap-1">
                {PAGE_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`text-xl p-1.5 rounded-lg transition-colors ${
                      emoji === e
                        ? 'bg-brand-100 ring-2 ring-brand-500'
                        : 'hover:bg-gray-100'
                    }`}
                    aria-label={`Select emoji ${e}`}
                    aria-pressed={emoji === e}
                  >
                    {e}
                  </button>
                ))}
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
              <div className="grid grid-cols-3 gap-3">
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

                {/* Events type — coming soon */}
                <button
                  type="button"
                  disabled
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 opacity-60 cursor-not-allowed relative"
                  aria-disabled="true"
                >
                  <span className="text-2xl">📅</span>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-500">{t('pages.eventsType')}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t('pages.eventsTypeDesc')}</div>
                  </div>
                  <span className="absolute top-2 end-2 text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">
                    {t('common.comingSoon')}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 flex justify-end gap-3">
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
