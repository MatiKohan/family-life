import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api-client';
import { useFamilyStore } from '../../store/family.store';
import { useMyFamilies } from '../../hooks/useMyFamilies';
import { Family } from '../../types/family';

export function FamilyCreatePage() {
  const navigate = useNavigate();
  const setActiveFamily = useFamilyStore((s) => s.setActiveFamily);
  const { data: families } = useMyFamilies();

  const [emoji, setEmoji] = useState('🏠');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const EMOJIS = ['🏠','👨‍👩‍👧‍👦','👨‍👩‍👦','👨‍👩‍👧','🏡','🌻','⭐','🎉','🌈','🦁','🐻','🐼','🌺','🍀','🏖️','🎨','🎵','🚀','❤️','🌙'];

  const hasExistingFamilies = families && families.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const family = await apiRequest<Family>('/families', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), emoji }),
      });

      setActiveFamily(family.id);
      navigate(`/family/${family.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create a Family</h1>
          <p className="text-gray-500 text-sm">Set up your family space to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-colors ${
                    emoji === e
                      ? 'bg-brand-100 ring-2 ring-brand-500'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Family Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="The Smiths"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Family'}
          </button>
        </form>

        {hasExistingFamilies && (
          <div className="mt-6 text-center">
            <Link
              to={`/family/${families[0].id}`}
              className="text-sm text-brand-600 hover:text-brand-700 transition-colors"
            >
              Back to my families
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
