import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyFamilies } from '../../hooks/useMyFamilies';
import { useFamilyStore } from '../../store/family.store';
import { Family } from '../../types/family';

interface FamilySwitcherProps {
  currentFamily: Family;
}

export function FamilySwitcher({ currentFamily }: FamilySwitcherProps) {
  const navigate = useNavigate();
  const setActiveFamily = useFamilyStore((s) => s.setActiveFamily);
  const { data: families } = useMyFamilies();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectFamily(family: Family) {
    setActiveFamily(family.id);
    navigate(`/family/${family.id}`);
    setOpen(false);
  }

  function goToCreate() {
    navigate('/family/create');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-xl leading-none">{currentFamily.emoji}</span>
        <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{currentFamily.name}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Switch family"
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {families?.map((family) => (
            <button
              key={family.id}
              role="option"
              aria-selected={family.id === currentFamily.id}
              onClick={() => selectFamily(family)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left ${
                family.id === currentFamily.id ? 'bg-brand-50 text-brand-700' : 'text-gray-700'
              }`}
            >
              <span className="text-lg leading-none">{family.emoji}</span>
              <span className="flex-1 truncate">{family.name}</span>
              {family.id === currentFamily.id && (
                <svg className="w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}

          <div className="border-t border-gray-100">
            <button
              onClick={goToCreate}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-lg leading-none">+</span>
              <span>New Family</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
