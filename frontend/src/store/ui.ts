import { create } from "zustand";

export type Highlight =
  | { kind: "outbreak"; taxonId: string }
  | { kind: "relatedness"; a: string; b: string }
  | null;

interface UiState {
  selectedLocationId: string | null;
  selectedSpecimenId: string | null;
  sidebarCollapsed: boolean;
  highlight: Highlight;
  selectLocation: (id: string) => void;
  openSpecimen: (id: string) => void;
  closeSpecimen: () => void;
  toggleSidebar: () => void;
  setHighlight: (highlight: Highlight) => void;
}

export const useUi = create<UiState>((set) => ({
  selectedLocationId: null,
  selectedSpecimenId: null,
  sidebarCollapsed: false,
  highlight: null,
  selectLocation: (id) => set({ selectedLocationId: id }),
  openSpecimen: (id) => set({ selectedSpecimenId: id }),
  closeSpecimen: () => set({ selectedSpecimenId: null }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setHighlight: (highlight) => set({ highlight }),
}));
