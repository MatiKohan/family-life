import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FamilyState {
  activeFamilyId: string | null;
  collapsedFolderIds: string[];
  setActiveFamily: (id: string) => void;
  clearActiveFamily: () => void;
  toggleFolder: (id: string) => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      activeFamilyId: null,
      collapsedFolderIds: [],
      setActiveFamily: (id) => set({ activeFamilyId: id }),
      clearActiveFamily: () => set({ activeFamilyId: null }),
      toggleFolder: (id) =>
        set((state) => ({
          collapsedFolderIds: state.collapsedFolderIds.includes(id)
            ? state.collapsedFolderIds.filter((fid) => fid !== id)
            : [...state.collapsedFolderIds, id],
        })),
    }),
    {
      name: 'family-storage',
    },
  ),
);
