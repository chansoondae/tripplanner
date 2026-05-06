"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTripStore } from "@/lib/store/trip-store";
import { applyToolEdit } from "@/lib/utils/diff";
import DiffPreview from "./DiffPreview";
import { z } from "zod";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const ToolInputSchema = z.object({
  type: z.enum(["replace_section", "replace_all", "insert_after", "delete"]),
  target: z.string(),
  content: z.string(),
  reason: z.string(),
});

type PendingEdit = {
  original: string;
  updated: string;
  reason: string;
};

type Props = {
  onClose?: () => void;
};

export default function ChatPanel({ onClose }: Props) {
  const { raw_markdown, applyAIEdit, undoAIEdit, previousMarkdown } = useTripStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback((md: string) => {
    setSuggestions([]);
    fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: md }),
    })
      .then((r) => r.json())
      .then((data: { suggestions?: string[] }) => {
        if (data.suggestions) setSuggestions(data.suggestions);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!raw_markdown) return;
    fetchSuggestions(raw_markdown);
  // 처음 로드될 때만
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!raw_markdown]);

  async function sendMessage(override?: string) {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          markdown: raw_markdown,
        }),
      });

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      // tool_calls는 청크마다 누적
      const toolCallAccum: Record<number, { name: string; args: string }> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(data) as Record<string, unknown>;
          } catch {
            continue;
          }

          const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
          const choice = choices?.[0];
          if (!choice) continue;

          const delta = choice.delta as Record<string, unknown> | undefined;

          // 텍스트 스트리밍
          if (typeof delta?.content === "string") {
            assistantText += delta.content;
            setMessages([
              ...nextMessages,
              { role: "assistant", content: assistantText },
            ]);
          }

          // tool_calls 누적
          const toolCalls = delta?.tool_calls as Array<Record<string, unknown>> | undefined;
          if (toolCalls) {
            for (const tc of toolCalls) {
              const idx = tc.index as number;
              if (!toolCallAccum[idx]) {
                const fn = tc.function as Record<string, unknown>;
                toolCallAccum[idx] = { name: (fn?.name as string) ?? "", args: "" };
              }
              const fn = tc.function as Record<string, unknown> | undefined;
              if (fn?.arguments) {
                toolCallAccum[idx].args += fn.arguments as string;
              }
            }
          }

          // finish_reason이 tool_calls면 누적된 tool 처리
          if (choice.finish_reason === "tool_calls") {
            const updateCalls = Object.values(toolCallAccum).filter(
              (t) => t.name === "update_markdown"
            );
            const suggestCall = Object.values(toolCallAccum).find(
              (t) => t.name === "suggest_only"
            );

            if (updateCalls.length > 0) {
              // 다중 update_markdown은 순차적으로 누적 적용
              let current = raw_markdown;
              const reasons: string[] = [];
              for (const { args } of updateCalls) {
                try {
                  const toolInput = ToolInputSchema.parse(JSON.parse(args));
                  current = applyToolEdit(current, toolInput);
                  reasons.push(toolInput.reason);
                } catch (e) {
                  console.error("[chat] tool parse error:", e);
                }
              }
              setPendingEdit({
                original: raw_markdown,
                updated: current,
                reason: reasons.join(" / "),
              });
            } else if (suggestCall) {
              try {
                const toolInput = JSON.parse(suggestCall.args) as { content: string };
                setMessages([
                  ...nextMessages,
                  { role: "assistant", content: toolInput.content },
                ]);
              } catch (e) {
                console.error("[chat] suggest parse error:", e);
              }
            }
          }
        }
      }
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
      fetchSuggestions(raw_markdown);
    }
  }

  function handleApply() {
    console.log("[apply] pendingEdit:", pendingEdit);
    if (!pendingEdit) return;
    console.log("[apply] calling applyAIEdit, length:", pendingEdit.updated.length);
    applyAIEdit(pendingEdit.updated);
    console.log("[apply] store raw_markdown after:", raw_markdown.length);
    setPendingEdit(null);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="shrink-0 h-12 border-b border-gray-200 flex items-center px-4 justify-between">
        <span className="text-sm font-medium">AI 채팅</span>
        <div className="flex items-center">
          {previousMarkdown && (
            <button
              onClick={undoAIEdit}
              title="AI 변경 되돌리기"
              className="text-amber-500 hover:text-amber-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-base"
            >
              ↩︎
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 메시지 목록 */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center pt-6">일정 수정이나 여행 관련 질문을 해보세요</p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={["flex", msg.role === "user" ? "justify-end" : "justify-start"].join(" ")}
          >
            <div
              className={[
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm",
              ].join(" ")}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {pendingEdit && (
          <DiffPreview
            original={pendingEdit.original}
            updated={pendingEdit.updated}
            reason={pendingEdit.reason}
            onApply={handleApply}
            onReject={() => setPendingEdit(null)}
          />
        )}
      </div>

      {/* 추천 버튼 */}
      <div className="shrink-0 px-3 pb-2 flex gap-2 overflow-x-auto">
        {suggestions.length > 0
          ? suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                disabled={loading}
                className="shrink-0 px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {s}
              </button>
            ))
          : [1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 h-7 w-28 rounded-full bg-gray-100 animate-pulse" />
            ))}
      </div>

      {/* 입력 */}
      <div className="shrink-0 p-3 border-t border-gray-200 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="일정 수정이나 여행 관련 질문을 해보세요..."
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 min-h-[44px]"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="px-4 bg-blue-600 text-white text-sm rounded-xl disabled:opacity-40 min-h-[44px] min-w-[44px] hover:bg-blue-700 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
