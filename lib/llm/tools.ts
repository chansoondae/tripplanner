import type { ChatCompletionTool } from "openai/resources";

export const llmTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "update_markdown",
      description:
        "전체 또는 부분 마크다운을 수정합니다. 사용자 의도가 명확한 변경에만 사용하세요.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["replace_section", "replace_all", "insert_after", "delete"],
            description: "변경 유형",
          },
          target: {
            type: "string",
            description:
              "변경할 섹션 헤더 또는 활동 제목. replace_all일 때는 빈 문자열.",
          },
          content: {
            type: "string",
            description: "새 마크다운 내용. delete일 때는 빈 문자열.",
          },
          reason: {
            type: "string",
            description: "사용자에게 보여줄 변경 이유",
          },
        },
        required: ["type", "target", "content", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_only",
      description:
        "일정을 변경하지 않고 텍스트로만 답변합니다. 의도가 불분명하거나 정보가 필요할 때 사용.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "사용자에게 전달할 텍스트",
          },
        },
        required: ["content"],
      },
    },
  },
];
