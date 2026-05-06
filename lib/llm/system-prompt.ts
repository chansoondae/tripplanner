import { readFileSync } from "fs";
import { join } from "path";

type Context = {
  markdown: string;
  userMessage?: string;
  selectedDay?: string;
  selectedItem?: string;
  selectedItems?: string[];
};

const TRANSPORT_KEYWORDS = [
  "교통", "패스", "기차", "열차", "STP", "SDP", "트래블패스", "트래블 패스",
  "CHF", "요금", "티켓", "구간권", "융프라우", "산악", "케이블카", "반액",
  "transport", "pass", "ticket", "rail",
];

function needsTransportReference(ctx: Context): boolean {
  const text = [ctx.userMessage ?? "", ctx.markdown].join(" ").toLowerCase();
  return TRANSPORT_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

export function buildSystemPrompt(ctx: Context): string {
  const template = readFileSync(
    join(process.cwd(), "prompts/system.md"),
    "utf-8"
  );

  const markdownBlock = `현재 마크다운:\n\`\`\`markdown\n${ctx.markdown}\n\`\`\``;

  const items = ctx.selectedItems ?? (ctx.selectedItem ? [ctx.selectedItem] : []);
  const selectedBlock =
    items.length > 0
      ? [
          `사용자가 선택한 항목 (${items.length}개) — 이 항목들에 집중해서 답변하세요:`,
          ...items.map((item, i) => `${i + 1}. ${item}`),
          ctx.selectedDay ? `Day: ${ctx.selectedDay}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  let prompt = template
    .replace("{{CURRENT_MARKDOWN}}", markdownBlock)
    .replace("{{SELECTED_CONTEXT}}", selectedBlock);

  if (needsTransportReference(ctx)) {
    const transportRef = readFileSync(
      join(process.cwd(), "prompts/reference/2026_Switzerland_Transportation_Guide.md"),
      "utf-8"
    );
    prompt += `\n\n## 교통 요금 참조 데이터\n\n${transportRef}`;
  }

  return prompt;
}
