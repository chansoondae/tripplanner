"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchTrips,
  createTrip as createTripInDB,
  deleteTripFromDB,
  type TripRow,
} from "@/lib/supabase/trips";
import { parseMarkdown } from "@/lib/markdown/parse";

const PRESETS = [
  { label: "도쿄 3박 4일", file: "tokyo-3days.md" },
  { label: "파리 5일", file: "paris-5days.md" },
];

const BLANK_MD = `---
title: 새 여행
dates:
travelers: 2
---

## Day 1

- **09:00** 출발
`;

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    fetchTrips().then(setTrips).catch(console.error);
  }, []);

  async function createFromPreset(file: string) {
    const res = await fetch(`/presets/${file}`);
    const md = await res.text();
    await handleCreate(md);
  }

  async function handleCreate(md: string) {
    let title = "새 여행";
    try { title = parseMarkdown(md).meta.title; } catch {}
    const row = await createTripInDB(md, title);
    router.push(`/trips/${row.id}`);
  }

  async function handleDelete(id: string) {
    await deleteTripFromDB(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="h-14 border-b border-gray-200 flex items-center px-4 justify-between">
        <span className="font-semibold">내 여행 일정</span>
        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg min-h-[44px] hover:bg-blue-700 transition-colors"
        >
          + 새 일정
        </button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <p className="text-gray-400 text-sm">아직 저장된 일정이 없습니다</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm min-h-[44px] hover:bg-gray-50"
            >
              첫 번째 일정 만들기
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {trips.map((trip) => (
              <li key={trip.id} className="flex items-center gap-3">
                <a
                  href={`/trips/${trip.id}`}
                  className="flex-1 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] block"
                >
                  <p className="font-medium text-sm">{trip.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(trip.updated_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </a>
                <button
                  onClick={() => handleDelete(trip.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="삭제"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* 새 일정 모달 */}
      {showNewModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-base mb-4">새 일정 만들기</h2>

            <button
              onClick={() => handleCreate(BLANK_MD)}
              className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              <p className="font-medium text-sm">빈 일정으로 시작</p>
              <p className="text-xs text-gray-400 mt-0.5">직접 마크다운 작성</p>
            </button>

            <p className="text-xs text-gray-400 text-center">또는 프리셋 선택</p>

            {PRESETS.map((p) => (
              <button
                key={p.file}
                onClick={() => { void createFromPreset(p.file); }}
                className="w-full text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                <p className="font-medium text-sm">{p.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">예시 일정으로 시작</p>
              </button>
            ))}

            <button
              onClick={() => setShowNewModal(false)}
              className="w-full py-2.5 text-sm text-gray-500 min-h-[44px]"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
