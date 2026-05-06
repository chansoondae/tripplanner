"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrip as createTripInDB } from "@/lib/supabase/trips";

const COUNTRIES = ["스위스", "도쿄", "오사카", "다낭"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const DURATIONS = ["2일", "3일", "4일", "5일", "6일", "7일", "8일", "9일"];
const COMPANIONS = ["혼자", "커플여행", "아이랑", "부모님과"];

type Step = 1 | 2 | 3 | 4 | 5;
type Spot = { name: string; description: string };

const PRESET_SPOTS: Record<string, Spot[]> = {
  스위스: [
    { name: "그린델발트", description: "알프스 산악 마을" },
    { name: "인터라켄", description: "융프라우 관문 도시" },
    { name: "융프라우", description: "유럽의 지붕 전망대" },
    { name: "피르스트", description: "그린델발트 산악 전망" },
    { name: "멘리헨", description: "파노라마 하이킹 코스" },
    { name: "쉬니게 플라테", description: "알프스 고산 정원" },
    { name: "하더 쿨름", description: "인터라켄 전망대" },
    { name: "쉴트호른", description: "007 촬영지 전망대" },
    { name: "알멘트후벨", description: "뮈렌 근교 꽃밭 전망" },
    { name: "인터라켄 패러글라이딩", description: "알프스 하늘 체험" },
    { name: "이젤트발트", description: "브리엔츠 호수 마을" },
    { name: "라우터브루넨", description: "72개 폭포 계곡" },
    { name: "뮈렌", description: "차 없는 절벽 마을" },
    { name: "슈피츠", description: "툰 호수 고성 마을" },
    { name: "툰 호수", description: "에메랄드빛 호수" },
    { name: "루체른 시내", description: "카펠교·구시가지" },
    { name: "리기", description: "루체른 근교 명산" },
    { name: "슈탄저호른", description: "오픈탑 케이블카" },
    { name: "필라투스", description: "루체른 상징 산" },
    { name: "티틀리스", description: "빙하 360° 전망" },
    { name: "슈토스", description: "세계 최급경사 케이블카" },
    { name: "교통박물관", description: "루체른 국립 교통박물관" },
    { name: "체르마트", description: "마터호른 베이스 마을" },
    { name: "고르너그라트", description: "마터호른 정면 전망대" },
    { name: "수네가", description: "체르마트 선셋 전망대" },
    { name: "블라우헤르트", description: "슈텔리 호수 트레킹" },
    { name: "마테호른 글래시어 파라다이스", description: "유럽 최고 케이블카" },
    { name: "외시넨 호수", description: "칸더슈텍 에메랄드 호수" },
    { name: "라보", description: "UNESCO 포도밭 테라스" },
    { name: "에베날프", description: "아펜첼 절벽 전망대" },
    { name: "라인폭포", description: "유럽 최대 폭포" },
    { name: "취리히 시내", description: "쇼핑·미술관·구시가" },
    { name: "베른 시내", description: "스위스 수도·곰 공원" },
    { name: "바젤", description: "아트 바젤·라인강 도시" },
    { name: "로잔", description: "올림픽 박물관 도시" },
    { name: "몽트뢰", description: "레만 호수·재즈 페스티벌" },
    { name: "브베", description: "채플린 박물관·호수 마을" },
    { name: "제네바", description: "레만 호수·분수·UN" },
    { name: "생모리츠", description: "럭셔리 스키 리조트" },
    { name: "쿠어", description: "빙하 특급 열차 출발지" },
    { name: "루가노", description: "이탈리아풍 호수 도시" },
    { name: "밀라노", description: "두오모·패션·당일치기" },
  ],
};

type Props = { onClose: () => void };

export default function NewTripModal({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [country, setCountry] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [month, setMonth] = useState("");
  const [duration, setDuration] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [companion, setCompanion] = useState("");
  const [customCompanion, setCustomCompanion] = useState("");
  const [selectedSpots, setSelectedSpots] = useState<string[]>([]);
  const [customSpot, setCustomSpot] = useState("");
  const [loadingItinerary, setLoadingItinerary] = useState(false);

  const finalCountry = country || customCountry;
  const finalDuration = duration || customDuration;
  const finalCompanion = companion || customCompanion;
  const presetSpots = PRESET_SPOTS[finalCountry] ?? [];

  function next() { setStep((s) => Math.min(s + 1, 5) as Step); }
  function prev() { setStep((s) => Math.max(s - 1, 1) as Step); }

  function pickCountry(v: string) { setCountry(v); setCustomCountry(""); setTimeout(next, 150); }
  function pickMonth(v: string) { setMonth(v); setTimeout(next, 150); }
  function pickDuration(v: string) { setDuration(v); setCustomDuration(""); setTimeout(next, 150); }

  function skip() { next(); }

  function pickCompanion(v: string) {
    setCompanion(v); setCustomCompanion("");
    setTimeout(() => setStep(5), 150);
  }

  function toggleSpot(name: string) {
    setSelectedSpots((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }

  async function handleBlank() {
    const title = [finalCountry, finalDuration, "여행"].filter(Boolean).join(" ") || "새 여행";
    const md = `---\ntitle: ${title}\ndates:\ntravelers: ${finalCompanion || "2"}\n---\n\n## Day 1\n\n- **09:00** 출발\n`;
    const row = await createTripInDB(md, title);
    onClose();
    router.push(`/trips/${row.id}`);
  }

  async function handleGenerate() {
    setLoadingItinerary(true);
    try {
      const res = await fetch("/api/trip-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_itinerary",
          country: finalCountry,
          month,
          duration: finalDuration,
          companion: finalCompanion,
          selectedSpots,
        }),
      });
      const data = await res.json() as { markdown?: string };
      if (!data.markdown) return;
      const title = `${finalCountry} ${finalDuration} 여행`;
      const row = await createTripInDB(data.markdown, title);
      onClose();
      router.push(`/trips/${row.id}`);
    } finally {
      setLoadingItinerary(false);
    }
  }

  const stepLabels = ["어디로?", "몇 월?", "며칠?", "누구와?", "명소 선택"];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && step < 5 && (
              <button onClick={prev} className="text-gray-400 hover:text-gray-700 min-w-[32px] text-sm">←</button>
            )}
            <span className="font-semibold text-base">{stepLabels[step - 1]}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl">×</button>
        </div>

        {/* 진행 바 */}
        <div className="flex gap-1 px-5 pb-4 shrink-0">
          {([1, 2, 3, 4, 5] as Step[]).map((s) => (
            <div key={s} className={["flex-1 h-1 rounded-full transition-colors duration-300", s <= step ? "bg-blue-600" : "bg-gray-200"].join(" ")} />
          ))}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">

          {/* Step 1: 나라 */}
          {step === 1 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {COUNTRIES.map((c) => (
                  <button key={c} onClick={() => pickCountry(c)}
                    className={["py-3 rounded-xl border text-sm font-medium transition-colors min-h-[44px]", country === c ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-200 hover:bg-gray-50 text-gray-700"].join(" ")}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <input
                  placeholder="직접 입력"
                  value={customCountry}
                  onChange={(e) => { setCustomCountry(e.target.value); setCountry(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && customCountry.trim()) { next(); } }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 min-h-[44px]"
                />
                {customCountry.trim() && (
                  <button onClick={next} className="px-4 bg-blue-600 text-white text-sm rounded-xl min-h-[44px]">다음</button>
                )}
              </div>
              <SkipButton onClick={skip} />
            </div>
          )}

          {/* Step 2: 월 */}
          {step === 2 && (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m) => (
                  <button key={m} onClick={() => pickMonth(m)}
                    className={["py-2.5 rounded-xl border text-sm font-medium transition-colors min-h-[44px]", month === m ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-200 hover:bg-gray-50 text-gray-700"].join(" ")}>
                    {m}
                  </button>
                ))}
              </div>
              <SkipButton onClick={skip} />
            </div>
          )}

          {/* Step 3: 기간 */}
          {step === 3 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {DURATIONS.map((d) => (
                  <button key={d} onClick={() => pickDuration(d)}
                    className={["py-3 rounded-xl border text-sm font-medium transition-colors min-h-[44px]", duration === d ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-200 hover:bg-gray-50 text-gray-700"].join(" ")}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <input
                  placeholder="직접 입력 (예: 10일)"
                  value={customDuration}
                  onChange={(e) => { setCustomDuration(e.target.value); setDuration(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && customDuration.trim()) next(); }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 min-h-[44px]"
                />
                {customDuration.trim() && (
                  <button onClick={next} className="px-4 bg-blue-600 text-white text-sm rounded-xl min-h-[44px]">다음</button>
                )}
              </div>
              <SkipButton onClick={skip} />
            </div>
          )}

          {/* Step 4: 동행 */}
          {step === 4 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {COMPANIONS.map((c) => (
                  <button key={c} onClick={() => pickCompanion(c)}
                    className="py-3 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors min-h-[44px]">
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-1">
                <input
                  placeholder="직접 입력 (예: 친구들과)"
                  value={customCompanion}
                  onChange={(e) => setCustomCompanion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && customCompanion.trim()) pickCompanion(customCompanion.trim()); }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 min-h-[44px]"
                />
                {customCompanion.trim() && (
                  <button onClick={() => pickCompanion(customCompanion.trim())} className="px-4 bg-blue-600 text-white text-sm rounded-xl min-h-[44px]">다음</button>
                )}
              </div>
              <SkipButton onClick={skip} />
            </div>
          )}

          {/* Step 5: 명소 선택 */}
          {step === 5 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">가고 싶은 곳을 선택하세요 (복수 선택 가능)</p>

              {presetSpots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {presetSpots.map((spot) => {
                    const selected = selectedSpots.includes(spot.name);
                    return (
                      <button key={spot.name} onClick={() => toggleSpot(spot.name)}
                        className={["rounded-xl border p-2.5 text-left transition-colors min-h-[44px]", selected ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"].join(" ")}>
                        <p className={["text-xs font-medium leading-tight", selected ? "text-blue-600" : "text-gray-800"].join(" ")}>{spot.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{spot.description}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">아래에서 직접 입력해주세요</p>
              )}

              {/* 직접 입력 */}
              <div className="flex gap-2 pt-1">
                <input
                  placeholder="직접 입력 (예: 시옹 성)"
                  value={customSpot}
                  onChange={(e) => setCustomSpot(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customSpot.trim()) {
                      toggleSpot(customSpot.trim());
                      setCustomSpot("");
                    }
                  }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 min-h-[44px]"
                />
                <button
                  onClick={() => { if (customSpot.trim()) { toggleSpot(customSpot.trim()); setCustomSpot(""); } }}
                  disabled={!customSpot.trim()}
                  className="px-3 bg-gray-100 text-gray-600 text-sm rounded-xl min-h-[44px] disabled:opacity-40 hover:bg-gray-200 transition-colors"
                >
                  추가
                </button>
              </div>

              {/* 직접 입력으로 추가된 커스텀 항목 표시 */}
              {selectedSpots.filter((s) => !presetSpots.find((p) => p.name === s)).map((s) => (
                <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 mr-1">
                  {s}
                  <button onClick={() => toggleSpot(s)} className="hover:text-red-500">×</button>
                </span>
              ))}

            </div>
          )}
        </div>

        {/* Step 5 하단 고정 버튼 */}
        {step === 5 && (
          <div className="shrink-0 px-5 pb-5 pt-3 border-t border-gray-100 space-y-2">
            <button
              onClick={handleGenerate}
              disabled={selectedSpots.length === 0 || loadingItinerary}
              className="w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 min-h-[44px]"
            >
              {loadingItinerary ? "일정 생성 중..." : `선택한 ${selectedSpots.length}곳으로 일정 만들기`}
            </button>
            <SkipButton onClick={handleGenerate} label="명소 선택 없이 AI 생성" />
            <SkipButton onClick={handleBlank} label="빈 일정으로 시작" />
          </div>
        )}
      </div>
    </div>
  );
}

function SkipButton({ onClick, label = "건너뛰기" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-2 min-h-[44px] transition-colors"
    >
      {label}
    </button>
  );
}
