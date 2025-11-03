// store/useHotelStore.ts
import { create } from "zustand";

interface HotelStore {
  hotels: any[]; // you can create a proper Hotel type for better typing
  setHotels: (data: any[]) => void;
}

export const useHotelStore = create<HotelStore>((set) => ({
  hotels: [],
  setHotels: (data) => set({ hotels: data }),
}));
