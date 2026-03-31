import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FamilyState {
  activeFamilyId: string | null;
  setActiveFamily: (id: string) => void;
  clearActiveFamily: () => void;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      activeFamilyId: null,
      setActiveFamily: (id) => set({ activeFamilyId: id }),
      clearActiveFamily: () => set({ activeFamilyId: null }),
    }),
    {
      name: 'family-storage',
    },
  ),
);
