"use client";

import { create } from "zustand";
import { parseMarkdown } from "@/lib/markdown/parse";
import { serializeItinerary } from "@/lib/markdown/serialize";
import { debounce } from "@/lib/utils/debounce";
import { updateTrip, fetchTrip } from "@/lib/supabase/trips";
import type { Itinerary, Activity } from "@/lib/markdown/schema";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type TripStore = {
  tripId: string | null;
  raw_markdown: string;
  previousMarkdown: string | null;
  parsed: Itinerary | null;
  activeDay: number | null;
  selectedItemId: string | null;
  selectedItemIds: string[];
  saveStatus: SaveStatus;

  loadTrip: (id: string) => Promise<void>;
  setMarkdown: (md: string) => void;
  selectItem: (id: string | null) => void;
  toggleSelectItem: (id: string, multi: boolean) => void;
  selectDay: (dayIndex: number) => void;
  clearSelection: () => void;
  setActiveDay: (index: number | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  moveItem: (id: string, newTime: string) => void;
  applyAIEdit: (newMarkdown: string) => void;
  undoAIEdit: () => void;
};

const saveToDB = debounce((id: string, md: string, title: string) => {
  updateTrip(id, md, title).catch((e) => console.error("[store] save failed:", e));
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
  selectedItemIds: [],
  saveStatus: "idle",

  loadTrip: async (id) => {
    const row = await fetchTrip(id);
    const md = row?.markdown ?? "";
    const parsed = safeParse(md, null);
    set({ tripId: id, raw_markdown: md, parsed });
  },

  setMarkdown: (md) => {
    const { tripId, parsed: prev } = get();
    const parsed = safeParse(md, prev);
    set({ raw_markdown: md, parsed });
    if (tripId) saveToDB(tripId, md, parsed?.meta.title ?? "새 여행");
  },

  selectItem: (id) => set({ selectedItemId: id, selectedItemIds: id ? [id] : [] }),

  toggleSelectItem: (id, multi) => {
    const { selectedItemIds } = get();
    if (!multi) {
      set({ selectedItemIds: [id], selectedItemId: id });
      return;
    }
    const exists = selectedItemIds.includes(id);
    const next = exists ? selectedItemIds.filter((i) => i !== id) : [...selectedItemIds, id];
    set({ selectedItemIds: next, selectedItemId: next[next.length - 1] ?? null });
  },

  selectDay: (dayIndex) => {
    const { parsed, selectedItemIds } = get();
    const day = parsed?.days.find((d) => d.index === dayIndex);
    if (!day) return;
    const dayIds = day.items.map((item) => item.id);
    const allSelected = dayIds.every((id) => selectedItemIds.includes(id));
    const next = allSelected
      ? selectedItemIds.filter((id) => !dayIds.includes(id))
      : [...new Set([...selectedItemIds, ...dayIds])];
    set({ selectedItemIds: next, selectedItemId: next[next.length - 1] ?? null });
  },

  clearSelection: () => set({ selectedItemIds: [], selectedItemId: null }),

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
