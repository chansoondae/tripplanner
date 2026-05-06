"use client";

import dynamic from "next/dynamic";
import { use, useEffect, useState, useCallback } from "react";
import { useTripStore } from "@/lib/store/trip-store";
import TimelineView from "@/components/views/TimelineView";
import ChatPanel from "@/components/chat/ChatPanel";
import ChatBottomSheet from "@/components/chat/ChatBottomSheet";
import TripSidebar from "@/components/TripSidebar";

const MarkdownEditor = dynamic(
  () => import("@/components/editor/MarkdownEditor"),
  { ssr: false }
);

type Tab = "view" | "edit";

export default function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { raw_markdown, parsed, selectedItemId, selectedItemIds, loadTrip, setMarkdown, selectItem, toggleSelectItem, selectDay } =
    useTripStore();
  const [tab, setTab] = useState<Tab>("view");
  const [showChat, setShowChat] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(raw_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [raw_markdown]);

  useEffect(() => {
    loadTrip(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-dvh flex flex-col">
      {/* 사이드바 */}
      <TripSidebar
        currentTripId={id}
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      {/* 헤더 */}
      <header className="shrink-0 h-12 border-b border-gray-200 flex items-center px-4 gap-3">
        <button
          onClick={() => setShowSidebar(true)}
          className="text-gray-500 hover:text-gray-800 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="메뉴"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect x="2" y="4" width="16" height="2" rx="1"/>
            <rect x="2" y="9" width="16" height="2" rx="1"/>
            <rect x="2" y="14" width="16" height="2" rx="1"/>
          </svg>
        </button>
        <span className="font-semibold text-sm truncate flex-1">
          {parsed?.meta.title || "새 여행"}
        </span>
        {/* 데스크탑 채팅 토글 */}
        <button
          onClick={() => setShowChat((v) => !v)}
          className="hidden md:flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors min-h-[44px] px-2"
        >
          💬 {showChat ? "채팅 닫기" : "AI 채팅"}
        </button>
      </header>

      {/* 모바일 탭 */}
      <div className="md:hidden shrink-0 flex border-b border-gray-200">
        {(["view", "edit"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
              tab === t
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500",
            ].join(" ")}
          >
            {t === "view" ? "일정" : "편집"}
          </button>
        ))}
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* 에디터 */}
        <div
          className={[
            "overflow-hidden relative",
            showChat ? "md:w-[35%]" : "md:w-1/2",
            "md:flex md:border-r md:border-gray-200",
            tab === "edit" ? "flex flex-1" : "hidden",
          ].join(" ")}
        >
          <MarkdownEditor
            value={raw_markdown}
            onChange={setMarkdown}
            className="w-full h-full"
          />
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors shadow-sm"
          >
            {copied ? "✓ 복사됨" : "복사"}
          </button>
        </div>

        {/* 시각화 */}
        <div
          className={[
            "overflow-hidden md:flex-1 md:flex h-full",
            tab === "view" ? "flex flex-1" : "hidden",
          ].join(" ")}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {parsed ? (
            <TimelineView
              itinerary={parsed}
              selectedItemId={selectedItemId}
              selectedItemIds={selectedItemIds}
              onItemClick={(id, multi) => {
                toggleSelectItem(id, multi);
                if (!multi) setTab("edit");
              }}
              onDayClick={(dayIndex) => selectDay(dayIndex)}
            />
          ) : (
            <div className="flex items-center justify-center flex-1 text-sm text-gray-400">
              마크다운을 입력하세요
            </div>
          )}
        </div>

        {/* 데스크탑 채팅 패널 */}
        {showChat && (
          <div className="hidden md:flex w-80 border-l border-gray-200 flex-col">
            <ChatPanel onClose={() => setShowChat(false)} />
          </div>
        )}

      </div>

      {/* 모바일 채팅 Bottom Sheet */}
      <ChatBottomSheet />
    </div>
  );
}
