import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../../hooks/useSearch';

interface SearchBarProps {
  familyId: string;
  onClose?: () => void;
}

function MagnifierIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
      />
    </svg>
  );
}

export function SearchBar({ familyId, onClose }: SearchBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Open dropdown when debounced query is long enough
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [debouncedQuery]);

  // Close on click outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const { data, isFetching } = useSearch(familyId, debouncedQuery);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setQuery('');
      setDebouncedQuery('');
      setOpen(false);
    }
  }, []);

  function handleResultClick(path: string) {
    navigate(path);
    setQuery('');
    setDebouncedQuery('');
    setOpen(false);
    onClose?.();
  }

  const hasPages = (data?.pages?.length ?? 0) > 0;
  const hasItems = (data?.items?.length ?? 0) > 0;
  const hasTasks = (data?.tasks?.length ?? 0) > 0;
  const hasEvents = (data?.events?.length ?? 0) > 0;
  const hasAnyResults = hasPages || hasItems || hasTasks || hasEvents;
  const showNoResults = open && !isFetching && data !== undefined && !hasAnyResults;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div className="relative flex items-center">
        <span className="absolute left-3 pointer-events-none">
          <MagnifierIcon />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('search.placeholder')}
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-colors"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
              setOpen(false);
            }}
            className="absolute right-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {isFetching && (
            <div className="px-3 py-3 text-sm text-gray-500">
              {t('search.searching')}
            </div>
          )}

          {!isFetching && showNoResults && (
            <div className="px-3 py-3 text-sm text-gray-500">
              {t('search.noResults', { q: debouncedQuery })}
            </div>
          )}

          {!isFetching && hasPages && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('search.pages')}
              </p>
              {data!.pages.map((page) => (
                <div
                  key={page.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleResultClick(`/family/${familyId}/pages/${page.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResultClick(`/family/${familyId}/pages/${page.id}`)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer rounded-lg"
                >
                  <span>{page.emoji}</span>
                  <span>{page.title}</span>
                </div>
              ))}
            </div>
          )}

          {!isFetching && hasItems && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('search.items')}
              </p>
              {data!.items.map((item, idx) => (
                <div
                  key={`item-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleResultClick(`/family/${familyId}/pages/${item.pageId}`)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResultClick(`/family/${familyId}/pages/${item.pageId}`)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer rounded-lg"
                >
                  <span>📋</span>
                  <span className="flex-1 min-w-0 truncate">{item.text}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {item.pageEmoji} {item.pageTitle}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isFetching && hasTasks && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('search.tasks')}
              </p>
              {data!.tasks.map((task, idx) => (
                <div
                  key={`task-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleResultClick(`/family/${familyId}/pages/${task.pageId}`)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResultClick(`/family/${familyId}/pages/${task.pageId}`)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer rounded-lg"
                >
                  <span>✅</span>
                  <span className="flex-1 min-w-0 truncate">{task.text}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {task.pageEmoji} {task.pageTitle}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isFetching && hasEvents && (
            <div>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('search.events')}
              </p>
              {data!.events.map((event) => (
                <div
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleResultClick(`/family/${familyId}/calendar`)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResultClick(`/family/${familyId}/calendar`)}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer rounded-lg"
                >
                  <span>📅</span>
                  <span className="flex-1 min-w-0 truncate">{event.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(event.startAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
