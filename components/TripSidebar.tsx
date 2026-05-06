"use client";

import { useEffect, useState } from "react";
import {
  fetchTrips,
  deleteTripFromDB,
  type TripRow,
} from "@/lib/supabase/trips";
import NewTripModal from "./NewTripModal";

type Props = {
  currentTripId: string;
  open: boolean;
  onClose: () => void;
};

export default function TripSidebar({ currentTripId, open, onClose }: Props) {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (open) fetchTrips().then(setTrips).catch(console.error);
  }, [open]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    await deleteTripFromDB(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <>
      {/* 오버레이 */}
      <div
        className={[
          "fixed inset-0 bg-black/40 z-40 transition-opacity duration-300",
          open && !showModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={onClose}
      />

      {/* 사이드바 */}
      <div
        className={[
          "fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <span className="font-semibold text-sm">내 여행 일정</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {trips.map((trip) => (
            <div key={trip.id} className={["flex items-center gap-2 rounded-lg group", trip.id === currentTripId ? "bg-blue-50" : "hover:bg-gray-50"].join(" ")}>
              <a href={`/trips/${trip.id}`} onClick={onClose} className="flex-1 px-3 py-2.5 min-h-[44px] flex flex-col justify-center">
                <p className={["text-sm font-medium truncate", trip.id === currentTripId ? "text-blue-600" : "text-gray-800"].join(" ")}>{trip.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(trip.updated_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                </p>
              </a>
              <button onClick={(e) => handleDelete(e, trip.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                aria-label="삭제">
                🗑️
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 shrink-0">
          <button
            onClick={() => { onClose(); setShowModal(true); }}
            className="w-full py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors min-h-[44px]"
          >
            + 새 일정
          </button>
        </div>
      </div>

      {showModal && <NewTripModal onClose={() => setShowModal(false)} />}
    </>
  );
}
