"use client";

import { create } from "zustand";
import { parseMarkdown } from "@/lib/markdown/parse";
import { serializeItinerary } from "@/lib/markdown/serialize";
import { debounce } from "@/lib/utils/debounce";
import { upsertTripSummary } from "@/lib/utils/trip-list";
import type { Itinerary, Activity } from "@/lib/markdown/schema";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type TripStore = {
  tripId: string | null;
  raw_markdown: string;
  previousMarkdown: string | null;
  parsed: Itinerary | null;
  activeDay: number | null;
  selectedItemId: string | null;
  saveStatus: SaveStatus;

  loadTrip: (id: string) => void;
  setMarkdown: (md: string) => void;
  selectItem: (id: string | null) => void;
  setActiveDay: (index: number | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  moveItem: (id: string, newTime: string) => void;
  applyAIEdit: (newMarkdown: string) => void;
  undoAIEdit: () => void;
};

const STORAGE_PREFIX = "trip:";

function loadFromStorage(id: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

const saveToStorage = debounce((id: string, md: string, title: string) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, md);
    upsertTripSummary({ id, title, updatedAt: new Date().toISOString() });
  } catch {
    // storage full 등 무시
  }
}, 1000);

function safeParse(md: string, fallback: Itinerary | null): Itinerary | null {
  try {
    return parseMarkdown(md);
  } catch {
    return fallback;
  }
}

export const useTripStore = create<TripStore>((set, get) => ({
  tripId: null,
  raw_markdown: "",
  previousMarkdown: null,
  parsed: null,
  activeDay: null,
  selectedItemId: null,
  saveStatus: "idle",

  loadTrip: (id) => {
    const saved = loadFromStorage(id);
    const md = saved ?? "";
    const parsed = safeParse(md, null);
    set({ tripId: id, raw_markdown: md, parsed });
  },

  setMarkdown: (md) => {
    const { tripId, parsed: prev } = get();
    const parsed = safeParse(md, prev);
    set({ raw_markdown: md, parsed });
    if (tripId) saveToStorage(tripId, md, parsed?.meta.title ?? "새 여행");
  },

  selectItem: (id) => set({ selectedItemId: id }),

  setActiveDay: (index) => set({ activeDay: index }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  moveItem: (id, newTime) => {
    const { parsed } = get();
    if (!parsed) return;

    const updatedDays = parsed.days.map((day) => ({
      ...day,
      items: day.items.map((item: Activity) =>
        item.id === id ? { ...item, time: newTime } : item
      ),
    }));

    const updatedItinerary: Itinerary = { ...parsed, days: updatedDays };
    const newMarkdown = serializeItinerary(updatedItinerary);
    get().setMarkdown(newMarkdown);
    set({ parsed: updatedItinerary });
  },

  applyAIEdit: (newMarkdown) => {
    set({ previousMarkdown: get().raw_markdown });
    get().setMarkdown(newMarkdown);
  },

  undoAIEdit: () => {
    const { previousMarkdown } = get();
    if (!previousMarkdown) return;
    get().setMarkdown(previousMarkdown);
    set({ previousMarkdown: null });
  },
}));
