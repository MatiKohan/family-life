import { useLanguage } from '../../hooks/useLanguage';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
      {(['en', 'he'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
            language === lang
              ? 'bg-brand-600 text-white'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {lang === 'en' ? 'EN' : 'עב'}
        </button>
      ))}
    </div>
  );
}
