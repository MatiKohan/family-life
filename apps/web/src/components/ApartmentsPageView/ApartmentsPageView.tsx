import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePage } from '../../hooks/usePage';
import { useUpdateApartmentSearchParams } from '../../hooks/useUpdateApartmentSearchParams';
import { useSyncApartments } from '../../hooks/useSyncApartments';
import { useMarkApartmentSeen } from '../../hooks/useMarkApartmentSeen';
import { useAuthStore } from '../../store/auth.store';
import { ApartmentListing, ApartmentSearchParams, ApartmentDealType } from '../../types/page';

interface Props {
  familyId: string;
  pageId: string;
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function SpinnerIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function formatLastSynced(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return '—';
  return new Date(lastSyncedAt).toLocaleString();
}

function metadataToSearchParams(metadata: Record<string, unknown>): Partial<ApartmentSearchParams> {
  return {
    dealType: (metadata.dealType as ApartmentDealType) ?? 'rent',
    city: metadata.city as string | undefined,
    neighbourhood: metadata.neighbourhood as string | undefined,
    minRooms: metadata.minRooms as number | undefined,
    maxRooms: metadata.maxRooms as number | undefined,
    minPrice: metadata.minPrice as number | undefined,
    maxPrice: metadata.maxPrice as number | undefined,
    minFloor: metadata.minFloor as number | undefined,
    maxFloor: metadata.maxFloor as number | undefined,
    requireParking: (metadata.requireParking as boolean | undefined) ?? false,
    requireBalcony: (metadata.requireBalcony as boolean | undefined) ?? false,
    requireElevator: (metadata.requireElevator as boolean | undefined) ?? false,
    requireSecureRoom: (metadata.requireSecureRoom as boolean | undefined) ?? false,
  };
}

interface ApartmentCardProps {
  listing: ApartmentListing;
  currentUserId: string;
  onMarkSeen: (id: string) => void;
  isMarkingPending: boolean;
}

function ApartmentCard({ listing, currentUserId, onMarkSeen, isMarkingPending }: ApartmentCardProps) {
  const { t } = useTranslation();
  const isSeen = listing.seenBy.includes(currentUserId);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-opacity ${isSeen ? 'opacity-40' : ''}`}>
      <div className="w-full h-36 bg-gray-100 flex items-center justify-center overflow-hidden">
        {listing.imageUrl ? (
          <img src={listing.imageUrl} alt={listing.title} className="w-full h-36 object-cover" />
        ) : (
          <span className="text-4xl" aria-label="Building">🏢</span>
        )}
      </div>

      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{listing.title}</p>

        {listing.price != null && (
          <p className="text-base font-bold text-brand-600">₪{listing.price.toLocaleString()}</p>
        )}

        <p className="text-sm text-gray-500">
          {[
            listing.rooms != null ? `${listing.rooms} ${t('apartments.rooms')}` : null,
            listing.floor != null ? `${t('apartments.floor')} ${listing.floor}` : null,
          ].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="px-3 pb-3 flex items-center justify-between gap-2">
        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          {t('apartments.viewListing')} →
        </a>

        <button
          type="button"
          onClick={() => onMarkSeen(listing.id)}
          disabled={isMarkingPending || isSeen}
          aria-label={t('apartments.markSeen')}
          title={t('apartments.markSeen')}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
            isSeen
              ? 'border-gray-200 text-gray-300 cursor-default'
              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <EyeIcon />
        </button>
      </div>
    </div>
  );
}

type SyncStatus = 'idle' | 'saving' | 'syncing' | 'done' | 'error';

export function ApartmentsPageView({ familyId, pageId }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? '';

  const { data: page } = usePage(familyId, pageId);

  const initialParams = page ? metadataToSearchParams(page.metadata) : {};

  const [formDealType, setFormDealType] = useState<ApartmentDealType>(initialParams.dealType ?? 'rent');
  const [formCity, setFormCity] = useState(initialParams.city ?? '');
  const [formMinRooms, setFormMinRooms] = useState(initialParams.minRooms != null ? String(initialParams.minRooms) : '');
  const [formMaxRooms, setFormMaxRooms] = useState(initialParams.maxRooms != null ? String(initialParams.maxRooms) : '');
  const [formNeighbourhood, setFormNeighbourhood] = useState(initialParams.neighbourhood ?? '');
  const [formMinPrice, setFormMinPrice] = useState(initialParams.minPrice != null ? String(initialParams.minPrice) : '');
  const [formMaxPrice, setFormMaxPrice] = useState(initialParams.maxPrice != null ? String(initialParams.maxPrice) : '');
  const [formMinFloor, setFormMinFloor] = useState(initialParams.minFloor != null ? String(initialParams.minFloor) : '');
  const [formMaxFloor, setFormMaxFloor] = useState(initialParams.maxFloor != null ? String(initialParams.maxFloor) : '');
  const [formParking, setFormParking] = useState(initialParams.requireParking ?? false);
  const [formBalcony, setFormBalcony] = useState(initialParams.requireBalcony ?? false);
  const [formElevator, setFormElevator] = useState(initialParams.requireElevator ?? false);
  const [formSecureRoom, setFormSecureRoom] = useState(initialParams.requireSecureRoom ?? false);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [newCount, setNewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!page) return;
    const p = metadataToSearchParams(page.metadata);
    setFormDealType(p.dealType ?? 'rent');
    setFormCity(p.city ?? '');
    setFormNeighbourhood(p.neighbourhood ?? '');
    setFormMinRooms(p.minRooms != null ? String(p.minRooms) : '');
    setFormMaxRooms(p.maxRooms != null ? String(p.maxRooms) : '');
    setFormMinPrice(p.minPrice != null ? String(p.minPrice) : '');
    setFormMaxPrice(p.maxPrice != null ? String(p.maxPrice) : '');
    setFormMinFloor(p.minFloor != null ? String(p.minFloor) : '');
    setFormMaxFloor(p.maxFloor != null ? String(p.maxFloor) : '');
    setFormParking(p.requireParking ?? false);
    setFormBalcony(p.requireBalcony ?? false);
    setFormElevator(p.requireElevator ?? false);
    setFormSecureRoom(p.requireSecureRoom ?? false);
  }, [page?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateParamsMutation = useUpdateApartmentSearchParams(familyId, pageId);
  const syncMutation = useSyncApartments(familyId, pageId);
  const markSeenMutation = useMarkApartmentSeen(familyId, pageId);

  async function handleSaveAndSearch(e: React.FormEvent) {
    e.preventDefault();
    const params: ApartmentSearchParams = {
      dealType: formDealType,
      ...(formCity.trim() ? { city: formCity.trim() } : {}),
      ...(formNeighbourhood.trim() ? { neighbourhood: formNeighbourhood.trim() } : {}),
      ...(formMinRooms ? { minRooms: Number(formMinRooms) } : {}),
      ...(formMaxRooms ? { maxRooms: Number(formMaxRooms) } : {}),
      ...(formMinPrice ? { minPrice: Number(formMinPrice) } : {}),
      ...(formMaxPrice ? { maxPrice: Number(formMaxPrice) } : {}),
      ...(formMinFloor ? { minFloor: Number(formMinFloor) } : {}),
      ...(formMaxFloor ? { maxFloor: Number(formMaxFloor) } : {}),
      requireParking: formParking,
      requireBalcony: formBalcony,
      requireElevator: formElevator,
      requireSecureRoom: formSecureRoom,
    };

    try {
      setSyncStatus('saving');
      setNewCount(null);
      await updateParamsMutation.mutateAsync(params);
      setSyncStatus('syncing');
      const result = await syncMutation.mutateAsync();
      setNewCount(result?.newCount ?? 0);
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  }

  async function handleRefresh() {
    try {
      setSyncStatus('syncing');
      setNewCount(null);
      const result = await syncMutation.mutateAsync();
      setNewCount(result?.newCount ?? 0);
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  }

  const isBusy = syncStatus === 'saving' || syncStatus === 'syncing';
  const listings: ApartmentListing[] = page?.apartmentListings ?? [];

  function getButtonLabel() {
    if (syncStatus === 'saving') return t('common.saving');
    if (syncStatus === 'syncing') return t('apartments.searching');
    if (syncStatus === 'done') return t('apartments.searchDone');
    if (syncStatus === 'error') return t('apartments.searchError');
    return t('apartments.saveAndSearch');
  }

  function CheckToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          checked
            ? 'bg-brand-600 text-white border-brand-600'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {label}
      </button>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 w-full">
      {/* Page heading */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-4xl leading-none">{page?.emoji ?? '🏠'}</span>
        <h1 className="text-2xl font-bold text-gray-900">{page?.title ?? ''}</h1>
      </div>

      {/* Filter panel */}
      <form onSubmit={handleSaveAndSearch} className="bg-white border border-gray-200 rounded-xl shadow-sm mb-5 p-4 space-y-4">

        {/* Deal type + last synced row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setFormDealType('rent')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                formDealType === 'rent' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('apartments.rent')}
            </button>
            <button
              type="button"
              onClick={() => setFormDealType('buy')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors border-s border-gray-200 ${
                formDealType === 'buy' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('apartments.buy')}
            </button>
          </div>

          <span className="text-xs text-gray-400 ms-auto">
            {t('apartments.lastSynced')}: {formatLastSynced(page?.lastSyncedAt ?? null)}
          </span>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isBusy}
            title={t('apartments.syncNow')}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
          >
            {syncStatus === 'syncing' ? <SpinnerIcon /> : <RefreshIcon />}
          </button>
        </div>

        {/* Fields grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('apartments.city')}</label>
            <input
              type="text"
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Tel Aviv"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('apartments.minPrice')} (₪)</label>
            <input
              type="number"
              min={0}
              value={formMinPrice}
              onChange={(e) => setFormMinPrice(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="3000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('apartments.maxPrice')} (₪)</label>
            <input
              type="number"
              min={0}
              value={formMaxPrice}
              onChange={(e) => setFormMaxPrice(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="8000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('apartments.minRooms')}</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={formMinRooms}
              onChange={(e) => setFormMinRooms(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('apartments.maxRooms')}</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={formMaxRooms}
              onChange={(e) => setFormMaxRooms(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="5"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('apartments.minFloor')}</label>
            <input
              type="number"
              min={0}
              value={formMinFloor}
              onChange={(e) => setFormMinFloor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('apartments.maxFloor')}</label>
            <input
              type="number"
              min={0}
              value={formMaxFloor}
              onChange={(e) => setFormMaxFloor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="20"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('apartments.neighbourhood')}</label>
            <input
              type="text"
              value={formNeighbourhood}
              onChange={(e) => setFormNeighbourhood(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="פלורנטין, הקישון..."
            />
          </div>
        </div>

        {/* Feature toggles */}
        <div className="flex flex-wrap gap-2">
          <CheckToggle checked={formParking} onChange={setFormParking} label={t('apartments.parking')} />
          <CheckToggle checked={formBalcony} onChange={setFormBalcony} label={t('apartments.balcony')} />
          <CheckToggle checked={formElevator} onChange={setFormElevator} label={t('apartments.elevator')} />
          <CheckToggle checked={formSecureRoom} onChange={setFormSecureRoom} label={t('apartments.secureRoom')} />
        </div>

        {/* Submit row */}
        <div className="flex items-center justify-between pt-1">
          {syncStatus === 'done' && (
            <p className="text-sm text-green-600 font-medium">
              {newCount != null && newCount > 0
                ? t('apartments.foundNew', { count: newCount })
                : t('apartments.upToDate')}
            </p>
          )}
          {syncStatus === 'error' && (
            <p className="text-sm text-red-500">{t('apartments.searchError')}</p>
          )}
          {isBusy && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <SpinnerIcon />
              {syncStatus === 'saving' ? t('common.saving') : t('apartments.searching')}
            </p>
          )}
          {(syncStatus === 'idle') && <span />}

          <button
            type="submit"
            disabled={isBusy}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60 ms-auto ${
              syncStatus === 'done'
                ? 'bg-green-600 hover:bg-green-700'
                : syncStatus === 'error'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {isBusy ? <SpinnerIcon /> : <SearchIcon />}
            {getButtonLabel()}
          </button>
        </div>
      </form>

      {/* Listings */}
      <div className={`transition-opacity ${isBusy ? 'opacity-40 pointer-events-none' : ''}`}>
        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">🏠</span>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">{t('apartments.noListings')}</h2>
            <p className="text-sm text-gray-400 max-w-xs">{t('apartments.noListingsHint')}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">{listings.length} {t('apartments.listingsCount')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <ApartmentCard
                  key={listing.id}
                  listing={listing}
                  currentUserId={currentUserId}
                  onMarkSeen={(id) => markSeenMutation.mutate(id)}
                  isMarkingPending={markSeenMutation.isPending}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
