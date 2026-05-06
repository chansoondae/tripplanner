const LIST_KEY = "trip:__index__";
const STORAGE_PREFIX = "trip:";

export type TripSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export function getTripList(): TripSummary[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? (JSON.parse(raw) as TripSummary[]) : [];
  } catch {
    return [];
  }
}

function saveTripList(list: TripSummary[]) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch {}
}

export function upsertTripSummary(summary: TripSummary) {
  const list = getTripList();
  const idx = list.findIndex((t) => t.id === summary.id);
  if (idx >= 0) {
    list[idx] = summary;
  } else {
    list.unshift(summary);
  }
  saveTripList(list);
}

export function deleteTrip(id: string) {
  const list = getTripList().filter((t) => t.id !== id);
  saveTripList(list);
  try {
    localStorage.removeItem(STORAGE_PREFIX + id);
  } catch {}
}

export function createTripId(): string {
  return crypto.randomUUID();
}
