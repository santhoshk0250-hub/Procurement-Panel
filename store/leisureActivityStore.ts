    // /store/leisureActivityStore.ts
    import { create } from "zustand";

    /** When Mongo _id can be an object like { $oid: '...' } */
    export type IDType = string | { $oid: string } | undefined;

    export type DateSurcharge = {
    mode: "single" | "range";
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    surchargeAmount: number;
    surchargeType: "fixed" | "percentage";
    };

    export type LeisureActivity = {
    _id?: IDType;

    // identity
    name: string;
    description?: string;
    destination?: string;

    // media
    thumbnailUrl?: string | null;
    images?: string[];
    videos?: string[];

    // pricing
    vendorPrice?: number | null;
    sellingPrice?: number | null;
    taxRate?: number | null;
    taxIncluded?: boolean;

    // schedule
    operatingDays?: string[];
    openTime?: string;   // "HH:mm"
    closeTime?: string;  // "HH:mm"
    duration?: number | string; // allow string if API sends "1"
    durationType?: "min" | "hrs";

    pickupLocation?: string;
    dropLocation?: string;

    // misc
    rating?: number;
    isComplete?: boolean;

    // surcharges
    dateSurcharges?: DateSurcharge[];
    };

    type StoreState = {
    /** the activity selected on the list page to be edited on the edit page */
    activity: LeisureActivity | null;
    setActivity: (a: LeisureActivity | null) => void;
    clearActivity: () => void;
    };

    export const useLeisureActivityStore = create<StoreState>((set) => ({
    activity: null,
    setActivity: (a) => set({ activity: a }),
    clearActivity: () => set({ activity: null }),
    }));
