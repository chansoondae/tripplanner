"use client";

import { useRef, useState, useEffect } from "react";
import ChatPanel from "./ChatPanel";

type SheetState = "closed" | "half" | "full";

const SHEET_HEIGHT: Record<SheetState, string> = {
  closed: "52px",
  half: "52vh",
  full: "92vh",
};

export default function ChatBottomSheet() {
  const [state, setState] = useState<SheetState>("closed");
  const startYRef = useRef<number | null>(null);
  const startHeightRef = useRef<SheetState>("closed");

  function cycleState() {
    setState((s) => (s === "closed" ? "half" : s === "half" ? "full" : "closed"));
  }

  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = state;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (startYRef.current === null) return;
    const delta = startYRef.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 20) return; // 짧은 탭은 무시 (cycleState에서 처리)
    if (delta > 40) {
      // 위로 스와이프
      setState((s) => (s === "closed" ? "half" : "full"));
    } else if (delta < -40) {
      // 아래로 스와이프
      setState((s) => (s === "full" ? "half" : "closed"));
    }
    startYRef.current = null;
  }

  // 키보드 올라올 때 full로 전환
  useEffect(() => {
    function onFocus() {
      setState((s) => (s === "closed" ? "half" : s));
    }
    window.addEventListener("focusin", onFocus);
    return () => window.removeEventListener("focusin", onFocus);
  }, []);

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.10)] transition-[height] duration-300 ease-in-out"
      style={{ height: SHEET_HEIGHT[state] }}
    >
      {/* 핸들 */}
      <div
        className="shrink-0 flex flex-col items-center pt-2 pb-1 cursor-pointer select-none"
        onClick={cycleState}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300 mb-2" />
        <div className="flex items-center gap-2 pb-1">
          <span className="text-sm font-medium text-gray-600">AI 채팅</span>
          <span className="text-xs text-gray-400">
            {state === "closed" ? "▲" : state === "half" ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* 채팅 패널 — closed일 때 숨김 */}
      <div className={["flex-1 overflow-hidden", state === "closed" ? "invisible" : ""].join(" ")}>
        <ChatPanel />
      </div>
    </div>
  );
}
