import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreatePageModal } from '../../components/CreatePageModal/CreatePageModal';
import { usePages } from '../../hooks/usePages';
import { useFamily } from '../../hooks/useFamily';
import { useAuthStore } from '../../store/auth.store';
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

function PageCard({ page, onClick }: { page: PageSummary; onClick: () => void }) {
  const { t } = useTranslation();
  const style = PAGE_TYPE_STYLES[page.type] ?? PAGE_TYPE_STYLES.list;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-brand-200 active:scale-95 transition-all text-left"
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
  const { data: pages, isLoading } = usePages(id);
  const { data: family } = useFamily(id);
  const user = useAuthStore((s) => s.user);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const firstName = user?.name?.split(' ')[0] ?? '';

  function handlePageCreated(page: PageSummary) {
    setShowCreateModal(false);
    navigate(`/family/${id}/pages/${page.id}`);
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">

      {/* Hero header */}
      <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 pt-8 pb-16 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-16 -right-6 w-28 h-28 rounded-full bg-white/5" />

        {/* App brand */}
        <div className="flex items-center gap-2 mb-6">
          <img src="/logo.svg" alt="" className="w-8 h-8 rounded-xl shadow-md" />
          <span className="text-white/70 text-sm font-medium tracking-wide">{t('nav.familyLife')}</span>
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
              <span className="text-white/50 text-sm">
                · {t('home.members', { count: family.members.length })}
              </span>
            )}
          </div>
        ) : (
          <div className="h-6 w-40 bg-white/10 rounded animate-pulse mt-2" />
        )}
      </div>

      {/* Pages card — pulled up to overlap the hero */}
      <div className="px-4 -mt-8 pb-8">
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

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : pages && pages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {pages.map((page) => (
                <PageCard
                  key={page.id}
                  page={page}
                  onClick={() => navigate(`/family/${id}/pages/${page.id}`)}
                />
              ))}
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
    </main>
  );
}
