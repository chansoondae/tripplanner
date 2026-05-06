"use client";

import type { Itinerary, Day, Activity } from "@/lib/markdown/schema";

type Props = {
  itinerary: Itinerary;
  selectedItemId?: string | null;
  onItemClick?: (id: string) => void;
};

const ACTIVITY_TYPE_ICON: Record<string, string> = {
  meal: "🍽️",
  sightseeing: "🏛️",
  transit: "🚌",
  accommodation: "🏨",
  activity: "⭐",
};

function ActivityCard({
  activity,
  isSelected,
  onClick,
}: {
  activity: Activity;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left flex gap-3 p-3 rounded-lg transition-colors min-h-[44px]",
        "hover:bg-[var(--timeline-card-bg,#f9fafb)]",
        isSelected
          ? "bg-[var(--timeline-accent-bg,#eff6ff)] ring-1 ring-[var(--timeline-accent,#2563eb)]"
          : "",
      ].join(" ")}
    >
      {/* 시간 */}
      <span className="w-14 shrink-0 text-sm text-[var(--timeline-time-color,#6b7280)] pt-0.5 font-mono">
        {activity.time ?? ""}
      </span>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          {activity.emoji && (
            <span className="shrink-0">{activity.emoji}</span>
          )}
          {!activity.emoji && activity.type && (
            <span className="shrink-0 text-sm opacity-60">
              {ACTIVITY_TYPE_ICON[activity.type]}
            </span>
          )}
          <span className="text-sm font-medium text-[var(--timeline-title-color,#111827)] leading-snug">
            {activity.title}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activity.location && (
            <p className="mt-0.5 text-xs text-[var(--timeline-location-color,#2563eb)] truncate">
              📍 {activity.location}
            </p>
          )}
          {activity.url && (
            <a
              href={activity.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 text-xs text-gray-400 hover:text-blue-500 transition-colors shrink-0"
            >
              🗺️ 지도
            </a>
          )}
        </div>

        {/* 구조화 메타 */}
        {(activity.duration || activity.price) && (
          <div className="flex gap-2 mt-1 flex-wrap">
            {activity.duration && (
              <span className="text-xs text-gray-500">⏱ {activity.duration}</span>
            )}
            {activity.price && (
              <span className="text-xs text-gray-500">💰 {activity.price}</span>
            )}
          </div>
        )}

        {activity.notes && activity.notes.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {activity.notes.map((note, i) => (
              <li key={i} className="text-xs text-[var(--timeline-time-color,#6b7280)] pl-2 border-l border-gray-200">
                {note}
              </li>
            ))}
          </ul>
        )}

        {activity.tips && activity.tips.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {activity.tips.map((tip, i) => (
              <li key={i} className="text-xs text-amber-600 pl-2 border-l border-amber-200">
                💡 {tip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </button>
  );
}

function DaySection({
  day,
  selectedItemId,
  onItemClick,
}: {
  day: Day;
  selectedItemId?: string | null;
  onItemClick?: (id: string) => void;
}) {
  return (
    <section className="mb-6">
      {/* Day 헤더 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-8 w-8 rounded-full bg-[var(--timeline-accent,#2563eb)] text-white flex items-center justify-center text-sm font-bold shrink-0">
          {day.index + 1}
        </div>
        <h2 className="text-base font-semibold text-[var(--timeline-title-color,#111827)]">
          {day.label}
        </h2>
      </div>

      {/* 타임라인 항목들 */}
      <div className="ml-4 pl-6 border-l-2 border-[var(--timeline-line,#e5e7eb)] space-y-1">
        {day.items.length === 0 ? (
          <p className="text-sm text-[var(--timeline-time-color,#6b7280)] py-2">
            항목 없음
          </p>
        ) : (
          day.items.map((activity) => (
            <div key={activity.id} className="relative">
              {/* 타임라인 점 */}
              <div className="absolute -left-[1.6rem] top-3.5 w-2 h-2 rounded-full bg-[var(--timeline-accent,#2563eb)] ring-2 ring-white" />
              <ActivityCard
                activity={activity}
                isSelected={selectedItemId === activity.id}
                onClick={() => onItemClick?.(activity.id)}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function TimelineView({ itinerary, selectedItemId, onItemClick }: Props) {
  if (itinerary.days.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--timeline-time-color,#6b7280)] text-sm">
        일정이 없습니다. 마크다운에 ## Day 1 형식으로 추가하세요.
      </div>
    );
  }

  return (
    <div className="timeline-view w-full h-full overflow-y-auto p-4">
      {/* 여행 제목 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--timeline-title-color,#111827)]">
          {itinerary.meta.title}
        </h1>
        {itinerary.meta.start_date && (
          <p className="text-sm text-[var(--timeline-time-color,#6b7280)] mt-0.5">
            {itinerary.meta.start_date}
            {itinerary.meta.end_date !== itinerary.meta.start_date &&
              ` ~ ${itinerary.meta.end_date}`}
            {itinerary.meta.travelers > 1 && ` · ${itinerary.meta.travelers}명`}
          </p>
        )}
      </div>

      {itinerary.days.map((day) => (
        <DaySection
          key={day.index}
          day={day}
          selectedItemId={selectedItemId}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}
