import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreatePageModal } from '../../components/CreatePageModal/CreatePageModal';
import { usePages } from '../../hooks/usePages';
import { useFolders } from '../../hooks/useFolders';
import { useFamily } from '../../hooks/useFamily';
import { useAuthStore } from '../../store/auth.store';
import { useFamilyStore } from '../../store/family.store';
import { apiRequest } from '../../lib/api-client';
import { PageSummary, PageType } from '../../types/page';

function greeting(t: (k: string) => string): string {
  const h = new Date().getHours();
  if (h < 12) return t('home.goodMorning');
  if (h < 17) return t('home.goodAfternoon');
  return t('home.goodEvening');
}

const PAGE_TYPE_STYLES: Record<PageType, { bg: string; text: string; dot: string }> = {
  list:       { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-400' },
  tasks:      { bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-400'   },
  events:     { bg: 'bg-sky-50',      text: 'text-sky-700',     dot: 'bg-sky-400'     },
  apartments: { bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-400'  },
};

function PageCard({ page, onClick, onDelete }: { page: PageSummary; onClick: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const style = PAGE_TYPE_STYLES[page.type] ?? PAGE_TYPE_STYLES.list;

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-200 active:scale-95 transition-all text-left"
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${style.bg}`}>
          {page.emoji}
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate w-full group-hover:text-brand-700 transition-colors">
          {page.title}
        </span>
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
          <span className={`text-xs font-medium ${style.text}`}>
            {t(`pages.${page.type}Type`)}
          </span>
        </div>
      </button>

      {/* More options button */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        className="absolute top-2 right-2 p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="More options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {menuOpen && (
        <>
          {/* Backdrop to close menu */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-8 right-2 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[120px]">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('common.delete')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl shadow-sm animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-gray-100 mb-3" />
      <div className="h-4 w-24 bg-gray-100 rounded mb-2" />
      <div className="h-3 w-14 bg-gray-100 rounded" />
    </div>
  );
}

export function FamilyHomePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: pages, isLoading } = usePages(id);
  const { data: folders } = useFolders(id);
  const { data: family } = useFamily(id);
  const user = useAuthStore((s) => s.user);
  const { collapsedFolderIds, toggleFolder } = useFamilyStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<PageSummary | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (pageId: string) =>
      apiRequest(`/families/${id}/pages/${pageId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', id] });
      queryClient.invalidateQueries({ queryKey: ['folders', id] });
    },
  });

  const firstName = user?.name?.split(' ')[0] ?? '';

  function handlePageCreated(page: PageSummary) {
    setShowCreateModal(false);
    navigate(`/family/${id}/pages/${page.id}`);
  }

  function confirmDeletePage() {
    if (!pageToDelete) return;
    deleteMutation.mutate(pageToDelete.id);
    setPageToDelete(null);
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">

      {/* Hero header */}
      <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 px-6 pt-8 pb-8 overflow-hidden">
        {/* Decorative circles — behind content */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-16 -right-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

        {/* Content — above decorative layer */}
        <div className="relative z-10">
          {/* App brand */}
          <div className="flex items-center gap-2 mb-6">
            <img src="/logo.svg" alt="" className="w-8 h-8 rounded-xl shadow-md" />
            <span className="text-white/80 text-sm font-medium tracking-wide">{t('nav.familyLife')}</span>
          </div>

          {/* Greeting */}
          <h1 className="text-3xl font-bold text-white mb-1">
            {greeting(t)}{firstName ? `, ${firstName}` : ''}!
          </h1>

          {/* Family info */}
          {family ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xl">{family.emoji}</span>
              <span className="text-white/90 font-semibold">{family.name}</span>
              {family.members?.length != null && (
                <span className="text-white/60 text-sm">
                  · {t('home.members', { count: family.members.length })}
                </span>
              )}
            </div>
          ) : (
            <div className="h-6 w-40 bg-white/10 rounded animate-pulse mt-2" />
          )}
        </div>
      </div>

      {/* Pages card — pulled up to overlap the hero */}
      <div className="px-4 pt-4 pb-8">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">

          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {t('home.yourPages')}
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('pages.newPage')}
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : pages && pages.length > 0 ? (
            <div className="space-y-5">
              {/* Folders */}
              {folders?.map((folder) => {
                const isCollapsed = collapsedFolderIds.includes(folder.id);
                return (
                  <div key={folder.id}>
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="flex items-center gap-1.5 mb-2 w-full text-start"
                    >
                      <svg
                        className={`w-3 h-3 text-gray-400 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {folder.emoji} {folder.name}
                      </span>
                    </button>
                    {!isCollapsed && folder.pages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {folder.pages.map((page) => (
                          <PageCard
                            key={page.id}
                            page={page}
                            onClick={() => navigate(`/family/${id}/pages/${page.id}`)}
                            onDelete={() => setPageToDelete(page)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Ungrouped pages */}
              {(() => {
                const folderPageIds = new Set(folders?.flatMap((f) => f.pages.map((p) => p.id)) ?? []);
                const ungrouped = pages.filter((p) => !folderPageIds.has(p.id));
                if (ungrouped.length === 0) return null;
                return (
                  <div>
                    {folders && folders.length > 0 && (
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        {t('pages.pages')}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {ungrouped.map((page) => (
                        <PageCard
                          key={page.id}
                          page={page}
                          onClick={() => navigate(`/family/${id}/pages/${page.id}`)}
                          onDelete={() => setPageToDelete(page)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-3xl mb-4">📄</div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">{t('family.noPages')}</h3>
              <p className="text-sm text-gray-400 mb-5 max-w-xs">{t('family.createFirstPage')}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t('pages.newPage')}
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && id && (
        <CreatePageModal
          familyId={id}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePageCreated}
        />
      )}

      {pageToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setPageToDelete(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('pages.deletePage')}</h2>
            <p className="text-sm text-gray-600">
              {t('pages.deletePageConfirm', { title: pageToDelete.title })}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPageToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeletePage}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
