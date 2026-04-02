import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreatePageModal } from '../../components/CreatePageModal/CreatePageModal';
import { PageSummary } from '../../types/page';

export function FamilyHomePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  function handlePageCreated(page: PageSummary) {
    setShowCreateModal(false);
    navigate(`/family/${id}/pages/${page.id}`);
  }

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('family.noPages')}</h2>
        <p className="text-gray-500 text-sm mb-6">
          {t('family.createFirstPage')}
        </p>
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
