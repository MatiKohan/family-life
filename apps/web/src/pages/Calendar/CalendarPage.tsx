import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarView } from '../../components/CalendarView/CalendarView';

export function CalendarPage() {
  const { t } = useTranslation();
  const { id: familyId } = useParams<{ id: string }>();

  useEffect(() => {
    document.title = `${t('calendar.title')} — Family Life`;
    return () => {
      document.title = 'Family Life';
    };
  }, [t]);

  if (!familyId) return <Navigate to="/" replace />;

  return (
    <div className="flex flex-col h-full">
      <CalendarView familyId={familyId} />
    </div>
  );
}
