"use client";

import { computeDiff } from "@/lib/utils/diff";

type Props = {
  original: string;
  updated: string;
  reason: string;
  onApply: () => void;
  onReject: () => void;
};

export default function DiffPreview({ original, updated, reason, onApply, onReject }: Props) {
  const diff = computeDiff(original, updated);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-xs text-gray-500 font-medium">AI 변경 제안</p>
        <p className="text-sm mt-0.5">{reason}</p>
      </div>

      <div className="h-64 overflow-y-auto font-mono text-xs overscroll-contain">
        {diff.map((line, i) => (
          <div
            key={i}
            className={[
              "px-4 py-0.5 whitespace-pre-wrap",
              line.type === "added" ? "bg-green-50 text-green-800" : "",
              line.type === "removed" ? "bg-red-50 text-red-800 line-through opacity-60" : "",
              line.type === "unchanged" ? "text-gray-400" : "",
            ].join(" ")}
          >
            <span className="select-none mr-2 opacity-50">
              {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
            </span>
            {line.content || " "}
          </div>
        ))}
      </div>

      <div className="flex border-t border-gray-200">
        <button
          onClick={onReject}
          className="flex-1 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors min-h-[44px]"
        >
          거부
        </button>
        <div className="w-px bg-gray-200" />
        <button
          onClick={onApply}
          className="flex-1 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors min-h-[44px]"
        >
          적용
        </button>
      </div>
    </div>
  );
}
