import { readFileSync } from "fs";
import { join } from "path";

type Context = {
  markdown: string;
  selectedDay?: string;
  selectedItem?: string;
};

export function buildSystemPrompt(ctx: Context): string {
  const template = readFileSync(
    join(process.cwd(), "prompts/system.md"),
    "utf-8"
  );

  const markdownBlock = `현재 마크다운:\n\`\`\`markdown\n${ctx.markdown}\n\`\`\``;

  const selectedBlock =
    ctx.selectedDay || ctx.selectedItem
      ? [
          "현재 사용자가 보고 있는 컨텍스트:",
          ctx.selectedDay ? `- Day: ${ctx.selectedDay}` : "",
          ctx.selectedItem ? `- 선택된 항목: ${ctx.selectedItem}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  return template
    .replace("{{CURRENT_MARKDOWN}}", markdownBlock)
    .replace("{{SELECTED_CONTEXT}}", selectedBlock);
}
