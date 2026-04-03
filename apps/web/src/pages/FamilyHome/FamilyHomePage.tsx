import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreatePageModal } from '../../components/CreatePageModal/CreatePageModal';
import { usePages } from '../../hooks/usePages';
import { PageSummary } from '../../types/page';

export function FamilyHomePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: pages, isLoading } = usePages(id);
  const [showCreateModal, setShowCreateModal] = useState(false);

  function handlePageCreated(page: PageSummary) {
    setShowCreateModal(false);
    navigate(`/family/${id}/pages/${page.id}`);
  }

  if (isLoading) {
    return (
      <main className="flex-1 p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </main>
    );
  }

  if (pages && pages.length > 0) {
    return (
      <main className="flex-1 p-4">
        <ul className="space-y-2">
          {pages.map((page) => (
            <li key={page.id}>
              <button
                onClick={() => navigate(`/family/${id}/pages/${page.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl text-left hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
              >
                <span className="text-2xl leading-none shrink-0">{page.emoji}</span>
                <span className="text-sm font-medium text-gray-900 truncate">{page.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('family.noPages')}</h2>
        <p className="text-gray-500 text-sm mb-6">{t('family.createFirstPage')}</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          {t('pages.newPage')}
        </button>
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
