import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useHotelStore = create(
  persist(
    (set) => ({
      hotel: null,
      setHotel: (hotel) => set({ hotel }),
      clearHotel: () => set({ hotel: null }),
    }),
    {
      name: "hotel-storage", // unique key in localStorage
    }
  )
);
